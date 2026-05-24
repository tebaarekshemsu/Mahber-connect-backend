import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from './payment.service';
import { LedgerService } from './ledger.service';
import { PaymentStatus, MembershipStatus, PaymentType, TransactionType } from '@prisma/client';
import { addFrequency } from '../common/utils/date.utils';

@ApiTags('Payments')
@Controller('payments')
export class PaymentCallbackController {
  private readonly logger = new Logger(PaymentCallbackController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly ledger: LedgerService,
    private readonly config: ConfigService,
  ) {}

  @Post('chapa/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chapa callback for join and recurring payments' })
  async handleChapaCallback(
    @Headers('x-chapa-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const secret = this.config.get<string>('chapa.secretKey') ?? '';
    const rawBody: Buffer | string = req.rawBody ?? Buffer.from(JSON.stringify(req.body));

    if (!signature) {
      this.logger.warn('[SECURITY] Webhook/Callback received without x-chapa-signature header');
      throw new BadRequestException('Missing signature');
    }

    const isValid = this.paymentService.verifyWebhookSignature(rawBody, signature, secret);
    if (!isValid) {
      throw new BadRequestException('Invalid signature');
    }

    const payload: Record<string, any> =
      typeof req.body === 'object' ? req.body : JSON.parse(rawBody.toString());

    const { tx_ref, status } = payload;
    if (!tx_ref) {
      throw new BadRequestException('Missing tx_ref');
    }

    // Look up the PendingPayment by tx_ref
    const pendingPayment = await this.prisma.pendingPayment.findUnique({
      where: { id: tx_ref },
    });

    if (!pendingPayment) {
      this.logger.warn(`Chapa callback for unknown PendingPayment ID: ${tx_ref}`);
      throw new NotFoundException('Pending payment not found');
    }

    // If already completed or failed, return early (idempotence)
    if (pendingPayment.status !== 'pending') {
      return { success: true, message: `Payment already in status: ${pendingPayment.status}` };
    }

    const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : '';

    if (normalizedStatus === 'success') {
      await this.prisma.$transaction(async (tx) => {
        const membership = await tx.membership.findFirstOrThrow({
          where: {
            mahber_id: pendingPayment.mahber_id,
            member_id: pendingPayment.member_id,
          },
        });

        const paymentType =
          membership.status === MembershipStatus.Payment_Required
            ? PaymentType.JoinFee
            : PaymentType.Contribution;

        // Update PendingPayment status
        await tx.pendingPayment.update({
          where: { id: pendingPayment.id },
          data: { status: 'completed' },
        });

        // Create Payment record
        const payment = await tx.payment.create({
          data: {
            mahber_id: pendingPayment.mahber_id,
            member_id: pendingPayment.member_id,
            amount: pendingPayment.amount,
            payment_type: paymentType,
            status: PaymentStatus.Completed,
            tx_ref: pendingPayment.id,
            completed_at: new Date(),
          },
        });

        // Create LedgerEntry
        await this.ledger.createLedgerEntry(
          {
            mahber_id: pendingPayment.mahber_id,
            member_id: pendingPayment.member_id,
            transaction_type: TransactionType.Contribution,
            amount: pendingPayment.amount,
            description: `${paymentType} payment via Chapa callback (tx_ref: ${pendingPayment.id})`,
            payment_id: payment.id,
          },
          tx,
        );

        // Fetch Mahber configuration to advance next_payment_due
        const mahber = await tx.mahber.findUniqueOrThrow({
          where: { id: pendingPayment.mahber_id },
          select: { configuration: true },
        });

        const config = mahber.configuration as {
          payment_frequency?: string;
        } | null;

        const currentDueDate = membership.next_payment_due ?? new Date();
        const nextPaymentDue = addFrequency(currentDueDate, config?.payment_frequency);

        // Update Membership
        await tx.membership.update({
          where: { id: membership.id },
          data: {
            status: MembershipStatus.Active,
            joined_at: membership.joined_at ?? new Date(),
            activation_date: membership.activation_date ?? new Date(),
            next_payment_due: nextPaymentDue,
          },
        });
      });

      this.logger.log(`Chapa callback processed successfully for pending payment: ${pendingPayment.id}`);
      return { success: true };
    } else {
      const nextStatus = normalizedStatus === 'expired' ? 'expired' : 'failed';
      await this.prisma.pendingPayment.update({
        where: { id: pendingPayment.id },
        data: { status: nextStatus },
      });
      return { success: false, message: nextStatus === 'expired' ? 'Payment expired' : 'Payment failed' };
    }
  }
}
