import { Logger } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { MahberType, MembershipStatus, ViolationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FineService } from '../../financial/fine.service';
import { NotificationService } from '../../communication/notification.service';
import { QUEUE_NAMES, FineCalculationJobData } from '../interfaces/job-types';
import { BaseProcessor } from './base.processor';

@Processor(QUEUE_NAMES.FINE_CALCULATION)
export class FineCalculationProcessor extends BaseProcessor<FineCalculationJobData> {
  protected readonly logger = new Logger(FineCalculationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fineService: FineService,
    private readonly notificationService: NotificationService,
  ) {
    super();
  }

  @Process()
  async process(job: Job<FineCalculationJobData>): Promise<void> {
    this.logJobStart(job);

    const mahbers = await this.prisma.mahber.findMany({
      select: { id: true, configuration: true },
    });

    for (const mahber of mahbers) {
      await this.processMahber(mahber.id, mahber.configuration);
    }

    this.logJobComplete(job);
  }

  private async processMahber(mahberId: string, configuration: unknown): Promise<void> {
    const config = configuration as {
      payment_frequency?: string;
      contribution_amount?: number;
      penalty_rate?: number;
      penalty_mode?: 'percentage' | 'fixed';
      penalty_interval?: string;
      max_fine_total?: number;
    } | null;

    const penaltyRate = config?.penalty_rate ?? 0;
    const penaltyMode = config?.penalty_mode ?? 'fixed';
    const contributionAmount = config?.contribution_amount ?? 0;
    const paymentFrequency = config?.payment_frequency ?? 'Monthly';

    const overdueDate = this.getOverdueDate(paymentFrequency);

    // Find active members who have not made a contribution payment since the overdue date
    const activeMembers = await this.prisma.membership.findMany({
      where: { mahber_id: mahberId, status: MembershipStatus.Active },
      select: { id: true, member_id: true },
    });

    const parseIntervalToMs = (interval?: string): number => {
      if (!interval) return 30 * 24 * 60 * 60 * 1000; // default 30 days
      const match = interval.match(/^(\d+)([dhm])$/);
      if (!match) return 30 * 24 * 60 * 60 * 1000;
      const value = parseInt(match[1], 10);
      const unit = match[2];
      switch (unit) {
        case 'd': return value * 24 * 60 * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'm': return value * 60 * 1000;
        default: return value * 24 * 60 * 60 * 1000;
      }
    };

    for (const membership of activeMembers) {
      const recentContribution = await this.prisma.ledgerEntry.findFirst({
        where: {
          mahber_id: mahberId,
          member_id: membership.member_id,
          transaction_type: 'Contribution',
          created_at: { gte: overdueDate },
        },
      });

      if (!recentContribution) {
        // Check if a fine was already applied for this period
        const existingFine = await this.prisma.fine.findFirst({
          where: {
            mahber_id: mahberId,
            member_id: membership.member_id,
            violation_type: ViolationType.MISSED_PAYMENT,
            created_at: { gte: overdueDate },
          },
          orderBy: { created_at: 'desc' },
        });

        const intervalMs = parseIntervalToMs(config?.penalty_interval);
        const shouldApplyFine = !existingFine || 
          (new Date().getTime() - new Date(existingFine.created_at).getTime() >= intervalMs);

        if (shouldApplyFine) {
          await this.fineService.applyFine(
            mahberId,
            membership.member_id,
            ViolationType.MISSED_PAYMENT,
            penaltyRate,
            contributionAmount,
            penaltyMode,
            `Missed contribution payment (frequency: ${paymentFrequency})`,
          );

          await this.notificationService.sendToUser(
            membership.member_id,
            'Fine Applied',
            `A fine has been applied to your account for a missed contribution payment.`,
            { mahberId, type: 'FINE_APPLIED' },
          );
        }
      }

      // Ban Logic
      const maxFineTotal = config?.max_fine_total ?? 0;
      if (maxFineTotal > 0) {
        const exceeds = await this.fineService.hasUnpaidFinesExceedingThreshold(
          mahberId,
          membership.member_id,
          maxFineTotal,
        );
        if (exceeds) {
          await this.prisma.membership.update({
            where: { id: membership.id },
            data: { status: MembershipStatus.Banned },
          });

          await this.notificationService.sendToUser(
            membership.member_id,
            'Membership Banned',
            `Your membership has been banned due to exceeding the maximum allowed unpaid fines.`,
            { mahberId, type: 'MEMBERSHIP_BANNED' },
          );
        }
      }
    }
  }

  private getOverdueDate(paymentFrequency: string): Date {
    const now = new Date();
    switch (paymentFrequency) {
      case 'Weekly':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'Quarterly':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'Monthly':
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
}
