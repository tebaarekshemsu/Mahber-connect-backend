import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Prisma, PaymentStatus, MembershipStatus, TransactionType, PaymentType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ChapaService } from './chapa.service';
import { LedgerService } from './ledger.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { AuditService } from '../audit/audit.service';
import { addFrequency } from '../common/utils/date.utils';

export type OutstandingFine = {
  id: string;
  amount: number;
  reason: string;
  issued_at: string;
};

export type OutstandingObligations = {
  contribution_due: number | null;
  contribution_due_date: string | null;
  pending_fines: OutstandingFine[];
  total_outstanding: number;
  has_pending_payment: boolean;
  pending_payment_id?: string;
  pending_payment_amount?: number;
  pending_payment_type?: PaymentType;
};

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

  private parseMahberConfiguration(mahber: { configuration: Prisma.JsonValue | null }) {
    return (mahber.configuration as {
      contribution_amount?: number;
      payment_frequency?: string;
      payment_day?: number;
      join_fee_required?: boolean;
      join_fee_amount?: number;
    } | null) ?? {};
  }

  private async getMembershipContext(mahberId: string, memberId: string) {
    const [membership, mahber, user] = await Promise.all([
      this.prisma.membership.findFirst({
        where: { mahber_id: mahberId, member_id: memberId },
      }),
      this.prisma.mahber.findUnique({
        where: { id: mahberId },
        select: { id: true, configuration: true, name: true },
      }),
      this.prisma.user.findUnique({
        where: { id: memberId },
        select: { id: true, email: true, name: true },
      }),
    ]);

    if (!mahber) {
      throw new NotFoundException('Mahber not found');
    }

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    return { membership, mahber, user };
  }

  private async getPendingPayments(mahberId: string, memberId: string) {
    return this.prisma.payment.findMany({
      where: {
        mahber_id: mahberId,
        member_id: memberId,
        status: PaymentStatus.Pending,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  private extractFineIds(value: Prisma.JsonValue | null | undefined): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
  }

  private hasFinanceAccess(membership: { role: Prisma.JsonValue }): boolean {
    const role = membership.role as {
      name?: string;
      permissions?: string[];
    } | null;

    return role?.name === 'Admin' || role?.permissions?.includes('manage_finances') === true;
  }

  private buildOutstandingObligations(params: {
    membership: {
      status: MembershipStatus;
      next_payment_due: Date | null;
    };
    mahberConfig: {
      contribution_amount?: number;
      payment_frequency?: string;
      join_fee_required?: boolean;
      join_fee_amount?: number;
    };
    pendingPayments: Array<{
      id: string;
      amount: Prisma.Decimal;
      payment_type: PaymentType;
      fine_ids: Prisma.JsonValue | null;
      period_end: Date | null;
    }>;
    fines: Array<{
      id: string;
      amount: Prisma.Decimal;
      violation_type: string;
      created_at: Date;
    }>;
  }): OutstandingObligations {
    const { membership, mahberConfig, pendingPayments, fines } = params;
    const contributionAmount = Number(mahberConfig.contribution_amount ?? 0);
    const joinFeeRequired = mahberConfig.join_fee_required ?? false;
    const joinFeeAmount = Number(mahberConfig.join_fee_amount ?? 0);
    const now = new Date();

    const contributionDueDate = membership.next_payment_due ? new Date(membership.next_payment_due) : null;
    const contributionDue =
      membership.status === MembershipStatus.Active &&
      contributionAmount > 0 &&
      contributionDueDate !== null &&
      contributionDueDate.getTime() <= now.getTime();

    const contribution_due = contributionDue ? contributionAmount : null;
    const contribution_due_date = contributionDue ? contributionDueDate?.toISOString() ?? null : null;

    const pending_fines = fines.map((fine) => ({
      id: fine.id,
      amount: fine.amount.toNumber(),
      reason:
        fine.violation_type === 'MISSED_ATTENDANCE'
          ? 'Missed attendance'
          : 'Missed payment',
      issued_at: fine.created_at.toISOString(),
    }));

    const totalOutstandingBase =
      (contribution_due ?? 0) +
      (membership.status === MembershipStatus.Payment_Required && joinFeeRequired ? joinFeeAmount : 0) +
      pending_fines.reduce((sum, item) => sum + item.amount, 0);

    const latestPending = pendingPayments[0];

    return {
      contribution_due,
      contribution_due_date,
      pending_fines,
      total_outstanding: totalOutstandingBase,
      has_pending_payment: Boolean(latestPending),
      pending_payment_id: latestPending?.id,
      pending_payment_amount: latestPending?.amount.toNumber(),
      pending_payment_type: latestPending?.payment_type,
    };
  }

  // ─── Task 8.2 ────────────────────────────────────────────────────────────────

  async getOutstandingObligations(
    mahberId: string,
    memberId: string,
  ): Promise<OutstandingObligations> {
    const { membership, mahber } = await this.getMembershipContext(mahberId, memberId);
    const mahberConfig = this.parseMahberConfiguration(mahber);

    const [fines, pendingPayments] = await Promise.all([
      this.prisma.fine.findMany({
        where: {
          mahber_id: mahberId,
          member_id: memberId,
          is_waived: false,
          paid_at: null,
        },
        orderBy: { created_at: 'asc' },
      }),
      this.getPendingPayments(mahberId, memberId),
    ]);

    return this.buildOutstandingObligations({
      membership,
      mahberConfig,
      pendingPayments,
      fines,
    });
  }

  async initiatePayment(
    mahberId: string,
    memberId: string,
    dto: InitiatePaymentDto,
  ) {
    const { membership, mahber, user } = await this.getMembershipContext(mahberId, memberId);
    const mahberConfig = this.parseMahberConfiguration(mahber);
    const now = new Date();

    if (membership.status !== MembershipStatus.Active && membership.status !== MembershipStatus.Payment_Required) {
      throw new BadRequestException('Only active members can initiate payments');
    }

    const contributionAmount = Number(mahberConfig.contribution_amount ?? 0);
    const joinFeeRequired = mahberConfig.join_fee_required ?? false;
    const joinFeeAmount = Number(mahberConfig.join_fee_amount ?? 0);

    const outstandingFines = await this.prisma.fine.findMany({
      where: {
        mahber_id: mahberId,
        member_id: memberId,
        is_waived: false,
        paid_at: null,
      },
      orderBy: { created_at: 'asc' },
    });

    const fineIds = (dto.fine_ids && dto.fine_ids.length > 0 ? dto.fine_ids : outstandingFines.map((fine) => fine.id))
      .filter((fineId, index, self) => self.indexOf(fineId) === index);

    const selectedFines = fineIds.length > 0
      ? outstandingFines.filter((fine) => fineIds.includes(fine.id))
      : [];

    if (fineIds.length > 0 && selectedFines.length !== fineIds.length) {
      throw new BadRequestException('One or more fines are invalid or already resolved');
    }

    const contributionDueDate = membership.next_payment_due ? new Date(membership.next_payment_due) : null;
    const contributionDue =
      membership.status === MembershipStatus.Active &&
      contributionAmount > 0 &&
      contributionDueDate !== null &&
      contributionDueDate.getTime() <= now.getTime();

    const joinFeeDue = membership.status === MembershipStatus.Payment_Required && joinFeeRequired && joinFeeAmount > 0;

    const contributionCycleEnd = contributionDueDate
      ? addFrequency(contributionDueDate, mahberConfig.payment_frequency)
      : null;
    const joinFeeCycleEnd = joinFeeDue
      ? addFrequency(now, mahberConfig.payment_frequency)
      : null;

    const pendingPayments = await this.getPendingPayments(mahberId, memberId);

    for (const pending of pendingPayments) {
      const pendingFineIds = this.extractFineIds(pending.fine_ids);

      const sameCycleContribution =
        contributionDue &&
        pending.payment_type === PaymentType.Contribution &&
        (contributionCycleEnd === null ||
          pending.period_end === null ||
          pending.period_end.getTime() === contributionCycleEnd.getTime());

      const sameJoinFee = joinFeeDue && pending.payment_type === PaymentType.JoinFee;

      const sameFines =
        selectedFines.length > 0 &&
        pendingFineIds.some((pendingFineId) =>
          selectedFines.some((fine) => fine.id === pendingFineId),
        );

      if (sameCycleContribution || sameJoinFee || sameFines) {
        await this.prisma.payment.update({
          where: { id: pending.id },
          data: { status: PaymentStatus.Expired },
        });
      }
    }

    const fineTotal = selectedFines.reduce((sum, fine) => sum + fine.amount.toNumber(), 0);
    const amount =
      (contributionDue ? contributionAmount : 0) +
      (joinFeeDue ? joinFeeAmount : 0) +
      fineTotal;

    if (amount <= 0) {
      throw new BadRequestException('You have no outstanding payments at this time.');
    }

    const payment_type: PaymentType = contributionDue
      ? PaymentType.Contribution
      : joinFeeDue
        ? PaymentType.JoinFee
        : PaymentType.Contribution;

    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    const tx_ref = `mah_${mahberId.slice(0, 8)}_${memberId.slice(0, 8)}_${timestamp}_${random}`;

    const defaultCallbackUrl =
      this.config.get<string>('app.callbackUrl') ?? 'https://mahberconnect.com/payment/callback';
    const defaultReturnUrl =
      this.config.get<string>('app.returnUrl') ?? 'https://mahberconnect.com/payment/return';

    const nameParts = (user?.name || 'Unknown User').split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || 'User';
    const email = 'tebarek29@gmail.com';
    const sanitizedEmail = email.trim().slice(0, 50);

    const pendingPayment = await this.prisma.payment.create({
      data: {
        mahber_id: mahberId,
        member_id: memberId,
        amount: new Prisma.Decimal(amount),
        payment_type,
        status: PaymentStatus.Pending,
        tx_ref,
        fine_ids: selectedFines.length > 0 ? selectedFines.map((fine) => fine.id) : undefined,
        period_start: contributionDueDate ?? (joinFeeDue ? now : null),
        period_end: contributionCycleEnd ?? joinFeeCycleEnd ?? null,
        expires_at: new Date(now.getTime() + 30 * 60 * 1000),
      },
    });

    const chapaResult = await this.chapa.initializePayment({
      tx_ref,
      amount,
      currency: 'ETB',
      email: sanitizedEmail,
      first_name: firstName,
      last_name: lastName,
      callback_url: defaultCallbackUrl,
      customization: {
        title: 'Mahber Pay',
        description:
          selectedFines.length > 0
            ? `Payment covering ${payment_type.toLowerCase()} and ${selectedFines.length} fines`
            : `${payment_type} payment`,
      },
      metadata: {
        mahber_id: mahberId,
        member_id: memberId,
        payment_type,
        amount,
        fine_ids: selectedFines.map((fine) => fine.id),
        period_start: pendingPayment.period_start?.toISOString() ?? null,
        period_end: pendingPayment.period_end?.toISOString() ?? null,
      },
    });

    await this.prisma.payment.update({
      where: { id: pendingPayment.id },
      data: { checkout_url: chapaResult.checkout_url },
    });

    this.logger.log(
      `Payment initiated: id=${pendingPayment.id} tx_ref=${tx_ref} mahber=${mahberId} member=${memberId} amount=${amount}`,
    );

    await this.audit.logAuditEvent({
      mahber_id: mahberId,
      entity_type: 'payment',
      entity_id: pendingPayment.id,
      action: 'payment_initiated',
      actor_id: memberId,
      new_value: {
        tx_ref,
        amount,
        payment_type,
        fine_ids: selectedFines.map((fine) => fine.id),
        period_start: pendingPayment.period_start,
        period_end: pendingPayment.period_end,
      },
      metadata: { checkout_url: chapaResult.checkout_url },
    });

    return { checkout_url: chapaResult.checkout_url, tx_ref };
  }

  async reconcilePaymentByTxRef(txRef: string): Promise<void> {
    this.logger.log(`Reconcile payment requested for tx_ref=${txRef}`);

    try {
      const verification = await this.chapa.verifyPayment(txRef);
      this.logger.log(
        `Chapa verification result: tx_ref=${txRef} status=${verification.status} amount=${verification.amount} currency=${verification.currency} verificationFullData=${JSON.stringify(verification)}`,
      );

      this.logger.log(`Reconciliation: about to process webhook for tx_ref=${txRef}`);
      await this.processWebhook({
        tx_ref: txRef,
        status: verification.status,
        reference: verification.tx_ref,
        amount: verification.amount,
        currency: verification.currency,
        payment_method: verification.payment_method,
        created_at: verification.created_at,
      });
      this.logger.log(`Reconciliation complete: tx_ref=${txRef} processed with status=${verification.status}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : '';
      this.logger.error(
        `Reconciliation failed for tx_ref=${txRef}: ${message} stack=${stack}`,
      );
      throw error;
    }
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

    this.logger.log(
      `processWebhook called: tx_ref=${tx_ref ?? 'missing'} status=${status ?? 'missing'} paymentKeys=${Object.keys(payload).join(',')}`,
    );

    if (!tx_ref) {
      this.logger.warn('Webhook received without tx_ref');
      return;
    }

    const payment = await this.prisma.payment.findUnique({ where: { tx_ref } });
    if (!payment) {
      this.logger.warn(`Webhook for unknown tx_ref=${tx_ref}`);
      return;
    }

    this.logger.log(
      `Found payment for tx_ref=${tx_ref}: id=${payment.id} currentStatus=${payment.status} paymentType=${payment.payment_type}`,
    );

    // Idempotency: skip already-terminal payments
    if (
      payment.status === PaymentStatus.Completed ||
      payment.status === PaymentStatus.Failed
    ) {
      this.logger.log(`Webhook duplicate for tx_ref=${tx_ref}, status=${payment.status} – skipped`);
      return;
    }

    const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : '';

    if (normalizedStatus === 'success') {
      this.logger.log(`Webhook success path entered for tx_ref=${tx_ref}`);
      await this.prisma.$transaction(async (tx) => {
        const paymentFineIds = this.extractFineIds(payment.fine_ids);

        // Update payment to Completed
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.Completed,
            chapa_reference: payload.reference ?? null,
            completed_at: new Date(),
          },
        });

        this.logger.log(
          `Payment updated to Completed for tx_ref=${tx_ref}, chapa_reference=${payload.reference ?? 'missing'}`,
        );

        if (paymentFineIds.length > 0) {
          await tx.fine.updateMany({
            where: {
              id: { in: paymentFineIds },
              mahber_id: payment.mahber_id,
              member_id: payment.member_id,
              paid_at: null,
            },
            data: {
              paid_at: new Date(),
              payment_id: payment.id,
            },
          });
        }

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

        const membership = await tx.membership.findFirstOrThrow({
          where: {
            mahber_id: payment.mahber_id,
            member_id: payment.member_id,
          },
        });

        if (payment.period_end) {
          await tx.membership.update({
            where: { id: membership.id },
            data: {
              status: MembershipStatus.Active,
              activation_date: membership.activation_date ?? new Date(),
              joined_at: membership.joined_at ?? new Date(),
              next_payment_due: payment.period_end,
            },
          });
        } else if (membership.status === MembershipStatus.Payment_Required && payment.payment_type === PaymentType.JoinFee) {
          await tx.membership.update({
            where: { id: membership.id },
            data: {
              status: MembershipStatus.Active,
              activation_date: membership.activation_date ?? new Date(),
              joined_at: membership.joined_at ?? new Date(),
              next_payment_due: membership.next_payment_due ?? addFrequency(new Date(), 'Monthly'),
            },
          });
        }

        this.logger.log(`Membership activation update attempted for tx_ref=${tx_ref}`);
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
    } else if (normalizedStatus === 'failed' || normalizedStatus === 'expired') {
      this.logger.log(`Webhook failure path entered for tx_ref=${tx_ref}`);
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: normalizedStatus === 'expired' ? PaymentStatus.Expired : PaymentStatus.Failed,
        },
      });
      this.logger.log(`Payment updated to ${normalizedStatus === 'expired' ? 'Expired' : 'Failed'} for tx_ref=${tx_ref}`);
      this.logger.log(`Webhook processed: tx_ref=${tx_ref} → ${normalizedStatus === 'expired' ? 'Expired' : 'Failed'}`);

      await this.audit.logAuditEvent({
        mahber_id: payment.mahber_id,
        entity_type: 'payment',
        entity_id: payment.id,
        action: normalizedStatus === 'expired' ? 'payment_expired' : 'payment_failed',
        old_value: { status: PaymentStatus.Pending },
        new_value: {
          status: normalizedStatus === 'expired' ? PaymentStatus.Expired : PaymentStatus.Failed,
        },
        metadata: { tx_ref, webhook_payload: payload },
      });
    } else {
      this.logger.warn(`Webhook status not handled for tx_ref=${tx_ref}: ${status ?? 'missing'}`);
    }
  }

  // ─── Task 8.5 ────────────────────────────────────────────────────────────────

  async findAll(
    mahberId: string,
    memberId: string,
    page: number = 1,
    limit: number = 20,
    status?: PaymentStatus,
    type?: PaymentType,
    search?: string,
    sort: string = 'date',
    order: 'asc' | 'desc' = 'desc',
    startDate?: Date,
    endDate?: Date,
  ) {
    const membership = await this.prisma.membership.findFirst({
      where: { mahber_id: mahberId, member_id: memberId },
      select: { role: true },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    const where: Prisma.PaymentWhereInput = {
      mahber_id: mahberId,
    };

    if (!this.hasFinanceAccess(membership)) {
      where.member_id = memberId;
    }

    if (status) where.status = status;

    if (type && Object.values(PaymentType).includes(type)) {
      where.payment_type = type;
    }

    if (search) {
      where.OR = [
        { tx_ref: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) (where.created_at as Prisma.DateTimeFilter).gte = startDate;
      if (endDate) (where.created_at as Prisma.DateTimeFilter).lte = endDate;
    }

    const skip = (page - 1) * limit;

    const orderBy: Prisma.PaymentOrderByWithRelationInput =
      sort === 'amount'
        ? { amount: order }
        : sort === 'status'
          ? { status: order }
          : { created_at: order };

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy,
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

  async findOne(mahberId: string, paymentId: string, viewerId?: string) {
    if (!viewerId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const membership = await this.prisma.membership.findFirst({
      where: { mahber_id: mahberId, member_id: viewerId },
      select: { role: true },
    });

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, mahber_id: mahberId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (!membership || (!this.hasFinanceAccess(membership) && payment.member_id !== viewerId)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return payment;
  }

  async findByTxRef(txRef: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { tx_ref: txRef },
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
    const email = 'tebarek29@gmail.com';

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
