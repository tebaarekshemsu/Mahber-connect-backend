import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUE_NAMES, JoinRequestExpiryJobData, PaymentReminderJobData } from '../interfaces/job-types';

@Injectable()
export class JobScheduler {
  private readonly logger = new Logger(JobScheduler.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.FINE_CALCULATION)
    private readonly fineCalculationQueue: Queue,

    @InjectQueue(QUEUE_NAMES.JOIN_REQUEST_EXPIRY)
    private readonly joinRequestExpiryQueue: Queue<JoinRequestExpiryJobData>,

    @InjectQueue(QUEUE_NAMES.PAYMENT_REMINDER)
    private readonly paymentReminderQueue: Queue<PaymentReminderJobData>,
  ) {}

  /** Run fine calculation check every day at midnight (Req 16.1) */
  @Cron('0 0 * * *')
  async scheduleFineCalculation(): Promise<void> {
    this.logger.log('Scheduling fine calculation job');
    await this.fineCalculationQueue.add({});
  }

  /** Run join request expiry check every day at midnight (Req 16.2) */
  @Cron('0 0 * * *')
  async scheduleJoinRequestExpiry(): Promise<void> {
    this.logger.log('Scheduling join request expiry job');
    await this.joinRequestExpiryQueue.add({});
  }

  /** Run payment reminder check every day at 8am (Req 16.5) */
  @Cron('0 8 * * *')
  async schedulePaymentReminders(): Promise<void> {
    this.logger.log('Scheduling payment reminder job');
    await this.paymentReminderQueue.add({});
  }
}
