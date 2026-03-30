import { Logger } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { AttendanceService } from '../../events/attendance.service';
import { FineService } from '../../financial/fine.service';
import { QUEUE_NAMES, AttendanceProcessorJobData } from '../interfaces/job-types';
import { BaseProcessor } from './base.processor';

@Processor(QUEUE_NAMES.ATTENDANCE_PROCESSOR)
export class AttendanceProcessor extends BaseProcessor<AttendanceProcessorJobData> {
  protected readonly logger = new Logger(AttendanceProcessor.name);

  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly fineService: FineService,
  ) {
    super();
  }

  @Process()
  async process(job: Job<AttendanceProcessorJobData>): Promise<void> {
    this.logJobStart(job);

    const { mahberId, eventId } = job.data;

    const result = await this.attendanceService.processEventAttendance(
      mahberId,
      eventId,
      this.fineService,
    );

    this.logger.log(
      `Attendance processed for event=${eventId} mahber=${mahberId}: ` +
        `attended=${result.attended} absent=${result.absent} finesApplied=${result.finesApplied}`,
    );

    this.logJobComplete(job);
  }
}
