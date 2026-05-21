import { Logger } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { MembershipStatus, PaymentStatus, PaymentType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../communication/notification.service';
import { QUEUE_NAMES, PaymentReminderJobData } from '../interfaces/job-types';
import { BaseProcessor } from './base.processor';

const REMINDER_DAYS = [3, 1];

@Processor(QUEUE_NAMES.PAYMENT_REMINDER)
export class PaymentReminderProcessor extends BaseProcessor<PaymentReminderJobData> {
  protected readonly logger = new Logger(PaymentReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {
    super();
  }

  @Process()
  async process(job: Job<PaymentReminderJobData>): Promise<void> {
    this.logJobStart(job);

    const mahbers = await this.prisma.mahber.findMany({
      select: { id: true, configuration: true },
    });

    for (const mahber of mahbers) {
      await this.processMahberReminders(mahber.id, mahber.configuration);
    }

    this.logJobComplete(job);
  }

  private async processMahberReminders(mahberId: string, configuration: unknown): Promise<void> {
    const config = configuration as {
      payment_frequency?: string;
      contribution_amount?: number;
      next_payment_date?: string;
    } | null;

    const contributionAmount = config?.contribution_amount ?? 0;
    const nextPaymentDateStr = config?.next_payment_date;

    if (!nextPaymentDateStr) {
      return;
    }

    const nextPaymentDate = new Date(nextPaymentDateStr);
    const now = new Date();

    const daysUntilDue = Math.ceil(
      (nextPaymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (!REMINDER_DAYS.includes(daysUntilDue)) {
      return;
    }

    const activeMembers = await this.prisma.membership.findMany({
      where: { mahber_id: mahberId, status: MembershipStatus.Active },
      select: { member_id: true },
    });

    for (const membership of activeMembers) {
      // Skip if payment already completed for this period
      const completedPayment = await this.prisma.payment.findFirst({
        where: {
          mahber_id: mahberId,
          member_id: membership.member_id,
          payment_type: PaymentType.Contribution,
          status: PaymentStatus.Completed,
          created_at: { gte: this.getPeriodStart(nextPaymentDate, config?.payment_frequency) },
        },
      });

      if (completedPayment) {
        continue;
      }

      const isThreeDayReminder = daysUntilDue === 3;
      const title = isThreeDayReminder
        ? 'Payment Due in 3 Days'
        : 'Payment Due Tomorrow';
      const body = `Your contribution of ${contributionAmount} ETB is due on ${nextPaymentDate.toLocaleDateString()}. Please make your payment to avoid fines.`;

      await this.notificationService.sendToUser(
        membership.member_id,
        title,
        body,
        {
          mahberId,
          amount: String(contributionAmount),
          dueDate: nextPaymentDate.toISOString(),
          type: 'PAYMENT_REMINDER',
          payUrl: `/mahbers/${mahberId}/pay`,
        },
      );
    }

    this.logger.log(
      `Payment reminders sent for mahber=${mahberId} (${daysUntilDue} days before due date)`,
    );
  }

  private getPeriodStart(dueDate: Date, paymentFrequency?: string): Date {
    const start = new Date(dueDate);
    switch (paymentFrequency) {
      case 'Weekly':
        start.setDate(start.getDate() - 7);
        break;
      case 'Quarterly':
        start.setDate(start.getDate() - 90);
        break;
      case 'Monthly':
      default:
        start.setMonth(start.getMonth() - 1);
        break;
    }
    return start;
  }
}
