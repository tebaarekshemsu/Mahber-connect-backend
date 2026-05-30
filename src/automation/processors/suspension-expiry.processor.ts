import { Logger } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { MemberService } from '../../membership/member.service';
import { NotificationService } from '../../communication/notification.service';
import { QUEUE_NAMES, SuspensionExpiryJobData } from '../interfaces/job-types';
import { BaseProcessor } from './base.processor';

@Processor(QUEUE_NAMES.SUSPENSION_EXPIRY)
export class SuspensionExpiryProcessor extends BaseProcessor<SuspensionExpiryJobData> {
  protected readonly logger = new Logger(SuspensionExpiryProcessor.name);

  constructor(
    private readonly memberService: MemberService,
    private readonly notificationService: NotificationService,
  ) {
    super();
  }

  @Process()
  async process(job: Job<SuspensionExpiryJobData>): Promise<void> {
    this.logJobStart(job);

    const results = await this.memberService.checkAndReinstateExpiredSuspensions();

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    this.logger.log(`Auto-reinstated ${succeeded} members${failed > 0 ? `, ${failed} failed` : ''}`);

    for (const r of results) {
      if (r.success) {
        await this.notificationService.sendToUser(
          r.memberId,
          'Membership Reinstated',
          'Your temporary suspension has expired and your membership has been automatically reinstated.',
          { type: 'MEMBERSHIP_REINSTATED' },
        );
      }
    }

    this.logJobComplete(job);
  }
}
