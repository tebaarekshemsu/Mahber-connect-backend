import { Logger } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { LotteryService } from '../../financial/lottery.service';
import { NotificationService } from '../../communication/notification.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES, LotteryExecutionJobData } from '../interfaces/job-types';
import { BaseProcessor } from './base.processor';

@Processor(QUEUE_NAMES.LOTTERY_EXECUTION)
export class LotteryExecutionProcessor extends BaseProcessor<LotteryExecutionJobData> {
  protected readonly logger = new Logger(LotteryExecutionProcessor.name);

  constructor(
    private readonly lotteryService: LotteryService,
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  @Process()
  async process(job: Job<LotteryExecutionJobData>): Promise<void> {
    this.logJobStart(job);

    const { mahberId, operationalCostRate, fineThreshold } = job.data;

    // Use any active member as the executedBy reference for automated draws
    const anyMember = await this.prisma.membership.findFirst({
      where: { mahber_id: mahberId, status: 'Active' },
      select: { member_id: true },
    });
    const executedBy = anyMember?.member_id;

    const result = await this.lotteryService.executeLottery(
      mahberId,
      operationalCostRate,
      fineThreshold,
      executedBy ?? 'system',
    );

    await this.notificationService.sendToMahberMembers(
      mahberId,
      'Lottery Draw Completed',
      `The Equb lottery has been drawn. The winner has been selected and will receive the payout of ${result.payoutAmount.toFixed(2)} ETB.`,
      {
        mahberId,
        lotteryId: result.lotteryId,
        winnerId: result.winnerId,
        type: 'LOTTERY_RESULT',
      },
    );

    this.logger.log(
      `Lottery executed for mahber=${mahberId}: winner=${result.winnerId} payout=${result.payoutAmount.toFixed(2)}`,
    );

    this.logJobComplete(job);
  }
}
