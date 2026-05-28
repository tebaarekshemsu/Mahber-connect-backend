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
  customization?: {
    title?: string;
    description?: string;
  };
  metadata: {
    mahber_id: string;
    member_id: string;
    payment_type: string;
    amount: number;
    fine_ids?: string[];
    period_start?: string | null;
    period_end?: string | null;
  };
}

/** Raw bank object returned by Chapa API (GET /v1/banks) */
export interface ChapaRawBank {
  id: number;
  swift: string;
  name: string;
  acct_length?: number;
  is_mobilemoney?: boolean | null;
}

/** Normalized bank object we return to the client */
export interface ChapaBank {
  id: number;
  code: string;
  name: string;
  swift: string;
  acc_no_length?: number;
  is_mobile_money?: boolean;
}

export interface InitiateTransferParams {
  account_name: string;
  account_number: string;
  amount: number;
  reference: string;
  bank_code: number;
}

export interface InitiateTransferResult {
  status: string;
  transfer_ref: string;
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
      timeout: 30_000, // increased timeout to handle slower network
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
      this.logger.debug('Initializing payment with params', params);
      const payload = {
        tx_ref: params.tx_ref,
        amount: params.amount,
        currency: params.currency,
        email: params.email,
        first_name: params.first_name,
        last_name: params.last_name,
        callback_url: params.callback_url,
        customization: params.customization,
        metadata: {
          mahber_id: params.metadata.mahber_id,
          member_id: params.metadata.member_id,
          payment_type: params.metadata.payment_type,
          amount: params.metadata.amount,
          fine_ids: params.metadata.fine_ids,
          period_start: params.metadata.period_start,
          period_end: params.metadata.period_end,
        },
      };

      const response = await this.client.post<{
        status: string;
        message: string;
        data: { checkout_url: string };
      }>('/transaction/initialize', payload);
      this.logger.debug('Chapa initialize response', response.data);

      this.recordSuccess();
      this.logger.log(`Payment initialized: tx_ref=${params.tx_ref}`);

      return {
        checkout_url: response.data.data.checkout_url,
        tx_ref: params.tx_ref,
      };
    } catch (error) {
        this.recordFailure();
        // Log detailed error info from Chapa if available
        let detailedMsg: string;
        const errAny = error as any;
        if (errAny?.response?.data) {
          detailedMsg = JSON.stringify(errAny.response.data);
        } else if (error instanceof Error) {
          detailedMsg = error.message;
        } else {
          detailedMsg = String(error);
        }
        this.logger.error(`Failed to initialize payment tx_ref=${params.tx_ref}: ${detailedMsg}`);
        throw new ServiceUnavailableException(
          'Payment service is currently unavailable. Please try again later.',
        );
    }
  }

  async initiateTransfer(
    params: InitiateTransferParams,
  ): Promise<InitiateTransferResult> {
    if (this.isCircuitOpen()) {
      this.logger.warn('Circuit breaker is open – Chapa transfer call rejected');
      throw new ServiceUnavailableException(
        'Transfer service is temporarily unavailable. Please try again later.',
      );
    }

    try {
      const payload: Record<string, unknown> = {
        account_name: params.account_name,
        account_number: params.account_number,
        amount: params.amount,
        currency: 'ETB',
        reference: params.reference,
        bank_code: params.bank_code,
      };

      this.logger.debug(
        `initiateTransfer payload: ${JSON.stringify({ ...payload, account_number: '***' })}`,
      );

      const response = await this.client.post<{
        status: string;
        message: string;
        data: { reference: string };
      }>('/transfers', payload);

      this.recordSuccess();
      this.logger.log(`Transfer initiated: ref=${params.reference}`);

      return {
        status: response.data.status,
        transfer_ref: response.data.data.reference,
      };
    } catch (error) {
      this.recordFailure();
      const errAny = error as any;
      let detailedMsg: string;
      if (errAny?.response?.data) {
        detailedMsg = JSON.stringify(errAny.response.data);
      } else if (error instanceof Error) {
        detailedMsg = error.message;
      } else {
        detailedMsg = String(error);
      }
      this.logger.error(`Transfer failed ref=${params.reference}: ${detailedMsg}`);
      throw new ServiceUnavailableException(
        'Transfer service is currently unavailable. Please try again later.',
      );
    }
  }

  async getBanks(): Promise<ChapaRawBank[]> {
    if (this.isCircuitOpen()) {
      this.logger.warn('Circuit breaker is open – Chapa banks call rejected');
      throw new ServiceUnavailableException(
        'Bank list is temporarily unavailable. Please try again later.',
      );
    }

    try {
      const response = await this.client.get<{
        status: string;
        message: string;
        data: ChapaRawBank[];
      }>('/banks');

      this.recordSuccess();
      return response.data.data ?? [];
    } catch (error) {
      this.recordFailure();
      const errAny = error as any;
      let detailedMsg: string;
      if (errAny?.response?.data) {
        detailedMsg = JSON.stringify(errAny.response.data);
      } else if (error instanceof Error) {
        detailedMsg = error.message;
      } else {
        detailedMsg = String(error);
      }
      this.logger.error(`Failed to fetch banks: ${detailedMsg}`);
      throw new ServiceUnavailableException(
        'Bank list is currently unavailable. Please try again later.',
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
