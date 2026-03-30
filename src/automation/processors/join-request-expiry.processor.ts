import { Logger } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { JoinRequestStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES, JoinRequestExpiryJobData } from '../interfaces/job-types';
import { BaseProcessor } from './base.processor';

const EXPIRY_DAYS = 7;

@Processor(QUEUE_NAMES.JOIN_REQUEST_EXPIRY)
export class JoinRequestExpiryProcessor extends BaseProcessor<JoinRequestExpiryJobData> {
  protected readonly logger = new Logger(JoinRequestExpiryProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  @Process()
  async process(job: Job<JoinRequestExpiryJobData>): Promise<void> {
    this.logJobStart(job);

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - EXPIRY_DAYS);

    const result = await this.prisma.joinRequest.updateMany({
      where: {
        status: JoinRequestStatus.Pending,
        created_at: { lt: expiryDate },
      },
      data: { status: JoinRequestStatus.Invalidated },
    });

    this.logger.log(`Invalidated ${result.count} expired join requests older than ${EXPIRY_DAYS} days`);

    this.logJobComplete(job);
  }
}
