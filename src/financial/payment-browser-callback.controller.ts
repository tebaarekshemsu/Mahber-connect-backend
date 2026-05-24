import { Controller, Get, Query, Logger, Redirect, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';

@ApiTags('Payments')
@Controller('payment')
export class PaymentBrowserCallbackController {
  private readonly logger = new Logger(PaymentBrowserCallbackController.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly config: ConfigService,
  ) {}

  @Get('callback')
  @ApiOperation({ summary: 'Chapa callback handler - receives browser redirect after payment' })
  async handleCallback(
    @Query('tx_ref') txRef?: string,
    @Query('trx_ref') trxRef?: string,
    @Query('ref_id') refId?: string,
    @Query('status') status?: string,
    @Res() res?: Response,
  ) {
    const ref = txRef ?? trxRef;
console.log('*************************************Received payment callback with query params:*****************', { txRef, trxRef, refId, status });
    this.logger.log(
      `[CHAPA CALLBACK] Received: ref=${ref ?? 'missing'} refId=${refId ?? 'missing'} status=${status ?? 'missing'}`,
    );

    // Handle callback from Chapa: verify payment and reconcile if needed
    if (ref && status) {
      try {
        const payment = await this.paymentService.findByTxRef(ref);
        this.logger.log(
          `[CHAPA CALLBACK] Payment found: tx_ref=${ref} dbStatus=${payment.status} paymentType=${payment.payment_type}`,
        );

        if (payment.status === 'Pending') {
          this.logger.warn(
            `[CHAPA CALLBACK] DB payment still Pending - triggering reconciliation for tx_ref=${ref}`,
          );
          try {
            await this.paymentService.reconcilePaymentByTxRef(ref);
            this.logger.log(
              `[CHAPA CALLBACK] Reconciliation completed for tx_ref=${ref}`,
            );
          } catch (reconcileError) {
            const message = reconcileError instanceof Error ? reconcileError.message : String(reconcileError);
            this.logger.error(
              `[CHAPA CALLBACK] Reconciliation failed for tx_ref=${ref}: ${message}`,
            );
          }
        } else {
          this.logger.log(
            `[CHAPA CALLBACK] Payment already in terminal state: tx_ref=${ref} status=${payment.status}`,
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `[CHAPA CALLBACK] Could not look up payment for tx_ref=${ref}: ${message}`,
        );
      }
    } else {
      this.logger.warn(
        `[CHAPA CALLBACK] Callback missing required params: ref=${ref} status=${status}`,
      );
    }

    // Redirect to frontend callback page for user-facing display
    const frontendUrl = this.config.get<string>('app.url') ?? 'http://localhost:3001';
    const callbackPageUrl = `${frontendUrl}/en/payment/callback?tx_ref=${ref ?? ''}&status=${status ?? 'unknown'}`;

    this.logger.log(
      `[CHAPA CALLBACK] Redirecting to frontend: ${callbackPageUrl}`,
    );

    return res!.redirect(callbackPageUrl);
  }
}