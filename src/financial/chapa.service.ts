import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface InitializePaymentParams {
  tx_ref: string;
  amount: number;
  currency: string;
  email: string;
  first_name: string;
  last_name: string;
  callback_url: string;
  return_url: string;
  customization?: {
    title?: string;
    description?: string;
  };
  metadata: {
    mahber_id: string;
    member_id: string;
    payment_type: string;
    amount: number;
  };
}

export interface InitializePaymentResult {
  checkout_url: string;
  tx_ref: string;
}

export interface VerifyPaymentResult {
  status: string;
  tx_ref: string;
  amount: number;
  currency: string;
  payment_method?: string;
  created_at?: string;
}

@Injectable()
export class ChapaService {
  private readonly logger = new Logger(ChapaService.name);
  private readonly client: AxiosInstance;

  // Circuit breaker state
  private consecutiveFailures = 0;
  private readonly failureThreshold = 5;
  private readonly openDurationMs = 60_000; // 60 seconds
  private circuitOpenedAt: number | null = null;

  constructor(private readonly configService: ConfigService) {
    const baseUrl =
      this.configService.get<string>('chapa.baseUrl') ||
      'https://api.chapa.co/v1';
    const secretKey = this.configService.get<string>('chapa.secretKey');

    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10_000,
    });
  }

  private isCircuitOpen(): boolean {
    if (this.circuitOpenedAt === null) return false;
    const elapsed = Date.now() - this.circuitOpenedAt;
    if (elapsed >= this.openDurationMs) {
      // Half-open: allow one attempt through
      this.circuitOpenedAt = null;
      return false;
    }
    return true;
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.circuitOpenedAt = null;
  }

  private recordFailure(): void {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.circuitOpenedAt = Date.now();
      this.logger.warn(
        `Circuit breaker opened after ${this.consecutiveFailures} consecutive failures`,
      );
    }
  }

  async initializePayment(
    params: InitializePaymentParams,
  ): Promise<InitializePaymentResult> {
    if (this.isCircuitOpen()) {
      this.logger.warn('Circuit breaker is open – Chapa API call rejected');
      throw new ServiceUnavailableException(
        'Payment service is temporarily unavailable. Please try again later.',
      );
    }

    try {
      const payload = {
        tx_ref: params.tx_ref,
        amount: params.amount.toString(),
        currency: params.currency,
        email: params.email,
        first_name: params.first_name,
        last_name: params.last_name,
        callback_url: params.callback_url,
        return_url: params.return_url,
        customization: params.customization,
        meta: {
          mahber_id: params.metadata.mahber_id,
          member_id: params.metadata.member_id,
          payment_type: params.metadata.payment_type,
          amount: params.metadata.amount,
        },
      };

      const response = await this.client.post<{
        status: string;
        message: string;
        data: { checkout_url: string };
      }>('/transaction/initialize', payload);

      this.recordSuccess();
      this.logger.log(`Payment initialized: tx_ref=${params.tx_ref}`);

      return {
        checkout_url: response.data.data.checkout_url,
        tx_ref: params.tx_ref,
      };
    } catch (error) {
      this.recordFailure();
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to initialize payment tx_ref=${params.tx_ref}: ${msg}`,
      );
      throw new ServiceUnavailableException(
        'Payment service is currently unavailable. Please try again later.',
      );
    }
  }

  async verifyPayment(tx_ref: string): Promise<VerifyPaymentResult> {
    if (this.isCircuitOpen()) {
      this.logger.warn('Circuit breaker is open – Chapa verify call rejected');
      throw new ServiceUnavailableException(
        'Payment service is temporarily unavailable. Please try again later.',
      );
    }

    try {
      const response = await this.client.get<{
        status: string;
        message: string;
        data: {
          status: string;
          tx_ref: string;
          amount: number;
          currency: string;
          payment_method?: string;
          created_at?: string;
        };
      }>(`/transaction/verify/${tx_ref}`);

      this.recordSuccess();
      this.logger.log(`Payment verified: tx_ref=${tx_ref}`);

      const data = response.data.data;
      return {
        status: data.status,
        tx_ref: data.tx_ref,
        amount: data.amount,
        currency: data.currency,
        payment_method: data.payment_method,
        created_at: data.created_at,
      };
    } catch (error) {
      this.recordFailure();
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to verify payment tx_ref=${tx_ref}: ${msg}`,
      );
      throw new ServiceUnavailableException(
        'Payment service is currently unavailable. Please try again later.',
      );
    }
  }
}
