import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { FinancialModule } from '../financial/financial.module';
import { CommunicationModule } from '../communication/communication.module';
import { EventsModule } from '../events/events.module';
import { QUEUE_NAMES } from './interfaces/job-types';
import { FineCalculationProcessor } from './processors/fine-calculation.processor';
import { JoinRequestExpiryProcessor } from './processors/join-request-expiry.processor';
import { LotteryExecutionProcessor } from './processors/lottery-execution.processor';
import { PaymentReminderProcessor } from './processors/payment-reminder.processor';
import { AttendanceProcessor } from './processors/attendance.processor';
import { JobScheduler } from './schedulers/job.scheduler';

const defaultJobOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: true,
  removeOnFail: false,
};

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          password: configService.get<string | undefined>('redis.password'),
        },
        defaultJobOptions,
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.FINE_CALCULATION },
      { name: QUEUE_NAMES.JOIN_REQUEST_EXPIRY },
      { name: QUEUE_NAMES.LOTTERY_EXECUTION },
      { name: QUEUE_NAMES.PAYMENT_REMINDER },
      { name: QUEUE_NAMES.ATTENDANCE_PROCESSOR },
    ),
    FinancialModule,
    CommunicationModule,
    EventsModule,
  ],
  providers: [
    FineCalculationProcessor,
    JoinRequestExpiryProcessor,
    LotteryExecutionProcessor,
    PaymentReminderProcessor,
    AttendanceProcessor,
    JobScheduler,
  ],
  exports: [BullModule],
})
export class AutomationModule {}
