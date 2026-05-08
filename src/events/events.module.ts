import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { MulterModule } from '@nestjs/platform-express';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { QrService } from './qr.service';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { PhotoService } from './photo.service';
import { PhotoController } from './photo.controller';
import { RoleGuard } from '../membership/guards/role.guard';
import { FinancialModule } from '../financial/financial.module';
import { QUEUE_NAMES } from '../automation/interfaces/job-types';

@Module({
  imports: [
    JwtModule.register({}),
    MulterModule.register(),
    FinancialModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.ATTENDANCE_PROCESSOR }),
  ],
  controllers: [EventController, AttendanceController, PhotoController],
  providers: [EventService, QrService, AttendanceService, PhotoService, RoleGuard],
  exports: [EventService, QrService, AttendanceService, PhotoService],
})
export class EventsModule {}
