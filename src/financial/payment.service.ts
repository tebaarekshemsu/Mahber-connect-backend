import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Prisma, PaymentStatus, MembershipStatus, TransactionType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ChapaService } from './chapa.service';
import { LedgerService } from './ledger.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chapa: ChapaService,
    private readonly ledger: LedgerService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  // ─── Task 8.2 ────────────────────────────────────────────────────────────────

  async initiatePayment(
    mahberId: string,
    memberId: string,
    dto: InitiatePaymentDto,
  ) {
    // Verify membership exists
    const membership = await this.prisma.membership.findFirst({
      where: { mahber_id: mahberId, member_id: memberId },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    const tx_ref = `mah_${mahberId.slice(0,8)}_${memberId.slice(0,8)}_${timestamp}_${random}`;

    const defaultCallbackUrl =
      this.config.get<string>('app.callbackUrl') ?? 'https://mahberconnect.com/payment/callback';
    const defaultReturnUrl =
      this.config.get<string>('app.returnUrl') ?? 'https://mahberconnect.com/payment/return';

    // Fetch user details if not provided in DTO
    let email = dto.email;
    let firstName = dto.first_name;
    let lastName = dto.last_name;

    if (!email || !firstName || !lastName) {
      const user = await this.prisma.membership.findFirst({
        where: { mahber_id: mahberId, member_id: memberId },
        include: { user: { select: { email: true, name: true } } },
      });

      if (user?.user) {
        email = email || user?.user?.email || 'tebarek29@gmain.com';
        if (!firstName || !lastName) {
          const nameParts = (user.user.name || 'Unknown User').split(' ');
          firstName = firstName || nameParts[0] || 'Unknown';
          lastName = lastName || nameParts.slice(1).join(' ') || 'User';
        }
      } else {
        email = email || `${memberId.slice(0,8)}@mah.co`;
        firstName = firstName || 'Unknown';
        lastName = lastName || 'User';
      }
    }

    const sanitizedEmail = email && email.length > 50 ? email.trim().slice(0, 50) : email.trim();

    const chapaResult = await this.chapa.initializePayment({
      tx_ref,
      amount: dto.amount,
      currency: 'ETB',
      email: sanitizedEmail,
      first_name: firstName,
      last_name: lastName,
      callback_url: dto.callback_url ?? defaultCallbackUrl,
      return_url: dto.return_url ?? defaultReturnUrl,
      customization: {
        title: 'Mahber Pay',
        description: `${dto.payment_type} payment`,
      },
      metadata: {
        mahber_id: mahberId,
        member_id: memberId,
        payment_type: dto.payment_type,
        amount: dto.amount,
      },
    });

    const payment = await this.prisma.payment.create({
      data: {
        mahber_id: mahberId,
        member_id: memberId,
        amount: new Prisma.Decimal(dto.amount),
        payment_type: dto.payment_type,
        status: PaymentStatus.Pending,
        tx_ref,
        checkout_url: chapaResult.checkout_url,
      },
    });

    this.logger.log(
      `Payment initiated: id=${payment.id} tx_ref=${tx_ref} mahber=${mahberId} member=${memberId}`,
    );

    await this.audit.logAuditEvent({
      mahber_id: mahberId,
      entity_type: 'payment',
      entity_id: payment.id,
      action: 'payment_initiated',
      actor_id: memberId,
      new_value: { tx_ref, amount: dto.amount, payment_type: dto.payment_type },
      metadata: { checkout_url: chapaResult.checkout_url },
    });

    return { checkout_url: chapaResult.checkout_url, payment_id: payment.id, tx_ref };
  }

  // ─── Task 8.3 ────────────────────────────────────────────────────────────────

  verifyWebhookSignature(
    rawBody: Buffer | string,
    signature: string,
    secret: string,
  ): boolean {
    const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
    const computed = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(signature, 'hex'),
    );

    if (!isValid) {
      this.logger.warn(
        `[SECURITY] Invalid webhook signature. Expected=${computed} Received=${signature}`,
      );
    }

    return isValid;
  }

  // ─── Task 8.4 ────────────────────────────────────────────────────────────────

  async processWebhook(payload: Record<string, any>): Promise<void> {
    const { tx_ref, status } = payload;

    if (!tx_ref) {
      this.logger.warn('Webhook received without tx_ref');
      return;
    }

    const payment = await this.prisma.payment.findUnique({ where: { tx_ref } });
    if (!payment) {
      this.logger.warn(`Webhook for unknown tx_ref=${tx_ref}`);
      return;
    }

    // Idempotency: skip already-terminal payments
    if (
      payment.status === PaymentStatus.Completed ||
      payment.status === PaymentStatus.Failed
    ) {
      this.logger.log(`Webhook duplicate for tx_ref=${tx_ref}, status=${payment.status} – skipped`);
      return;
    }

    const isSuccess =
      typeof status === 'string' && status.toLowerCase() === 'success';

    if (isSuccess) {
      await this.prisma.$transaction(async (tx) => {
        // Update payment to Completed
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.Completed,
            chapa_reference: payload.reference ?? null,
            completed_at: new Date(),
          },
        });

        // Create ledger entry
        await this.ledger.createLedgerEntry(
          {
            mahber_id: payment.mahber_id,
            member_id: payment.member_id,
            transaction_type: TransactionType.Contribution,
            amount: payment.amount,
            description: `${payment.payment_type} payment via Chapa (tx_ref: ${tx_ref})`,
            payment_id: payment.id,
          },
          tx,
        );

        // Transition membership from Payment_Required → Active (Req 3.7)
        await tx.membership.updateMany({
          where: {
            mahber_id: payment.mahber_id,
            member_id: payment.member_id,
            status: MembershipStatus.Payment_Required,
          },
          data: {
            status: MembershipStatus.Active,
            activation_date: new Date(),
          },
        });
      });

      this.logger.log(`Webhook processed: tx_ref=${tx_ref} → Completed`);

      await this.audit.logAuditEvent({
        mahber_id: payment.mahber_id,
        entity_type: 'payment',
        entity_id: payment.id,
        action: 'payment_completed',
        old_value: { status: PaymentStatus.Pending },
        new_value: { status: PaymentStatus.Completed, chapa_reference: payload.reference ?? null },
        metadata: { tx_ref, webhook_payload: payload },
      });
    } else {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.Failed },
      });
      this.logger.log(`Webhook processed: tx_ref=${tx_ref} → Failed`);

      await this.audit.logAuditEvent({
        mahber_id: payment.mahber_id,
        entity_type: 'payment',
        entity_id: payment.id,
        action: 'payment_failed',
        old_value: { status: PaymentStatus.Pending },
        new_value: { status: PaymentStatus.Failed },
        metadata: { tx_ref, webhook_payload: payload },
      });
    }
  }

  // ─── Task 8.5 ────────────────────────────────────────────────────────────────

  async findAll(
    mahberId: string,
    memberId: string,
    page: number = 1,
    limit: number = 20,
    status?: PaymentStatus,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: Prisma.PaymentWhereInput = {
      mahber_id: mahberId,
      member_id: memberId,
    };

    if (status) where.status = status;

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) (where.created_at as Prisma.DateTimeFilter).gte = startDate;
      if (endDate) (where.created_at as Prisma.DateTimeFilter).lte = endDate;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(mahberId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, mahber_id: mahberId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  // ─── Task 8.6 ────────────────────────────────────────────────────────────────

  async retryPayment(mahberId: string, paymentId: string, memberId: string) {
    const original = await this.prisma.payment.findFirst({
      where: { id: paymentId, mahber_id: mahberId, member_id: memberId },
    });

    if (!original) {
      throw new NotFoundException('Payment not found');
    }

    if (original.status === PaymentStatus.Completed) {
      throw new BadRequestException('Payment is already completed');
    }

    if (original.status === PaymentStatus.Pending) {
      throw new ConflictException('Payment is still pending');
    }

    // Exponential backoff: count existing retries for this original payment
    const retryCount = await this.prisma.payment.count({
      where: {
        mahber_id: mahberId,
        member_id: memberId,
        tx_ref: { startsWith: `retry_${original.tx_ref}` },
      },
    });

    const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 30_000);
    this.logger.log(
      `Retry #${retryCount + 1} for payment ${paymentId}, backoff=${backoffMs}ms`,
    );

    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    const tx_ref = `retry_${original.tx_ref}_${timestamp}_${random}`;

    // Retrieve user info for Chapa (use stored metadata from original tx_ref)
    const user = await this.prisma.membership.findFirst({
      where: { mahber_id: mahberId, member_id: memberId },
      include: { user: { select: { email: true, name: true } } },
    });

    const nameParts = (user?.user?.name ?? 'Unknown User').split(' ');
    const firstName = nameParts[0] ?? 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || 'User';
    const email = user?.user?.email ?? `${memberId}@mahberconnect.com`;

    const defaultCallbackUrl = 'https://mahberconnect.com/payment/callback';
    const defaultReturnUrl = 'https://mahberconnect.com/payment/return';

    const chapaResult = await this.chapa.initializePayment({
      tx_ref,
      amount: original.amount.toNumber(),
      currency: 'ETB',
      email,
      first_name: firstName,
      last_name: lastName,
      callback_url: defaultCallbackUrl,
      return_url: defaultReturnUrl,
      customization: {
        title: 'MahberConnect Payment Retry',
        description: `${original.payment_type} payment retry`,
      },
      metadata: {
        mahber_id: mahberId,
        member_id: memberId,
        payment_type: original.payment_type,
        amount: original.amount.toNumber(),
      },
    });

    const retryPayment = await this.prisma.payment.create({
      data: {
        mahber_id: mahberId,
        member_id: memberId,
        amount: original.amount,
        payment_type: original.payment_type,
        status: PaymentStatus.Pending,
        tx_ref,
        checkout_url: chapaResult.checkout_url,
      },
    });

    this.logger.log(
      `Retry payment created: id=${retryPayment.id} tx_ref=${tx_ref}`,
    );

    return {
      checkout_url: chapaResult.checkout_url,
      payment_id: retryPayment.id,
      tx_ref,
    };
  }
}
