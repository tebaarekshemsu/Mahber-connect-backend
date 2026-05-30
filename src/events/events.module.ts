import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { MulterModule } from '@nestjs/platform-express';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { QrService } from './qr.service';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceReportsController } from './attendance-reports.controller';
import { PhotoService } from './photo.service';
import { PhotoController } from './photo.controller';
import { InvitationController } from './invitation.controller';
import { RoleGuard } from '../membership/guards/role.guard';
import { EventAccessGuard } from './guards/event-access.guard';
import { FinancialModule } from '../financial/financial.module';
import { CommunicationModule } from '../communication/communication.module';
import { AuditModule } from '../audit/audit.module';
import { QUEUE_NAMES } from '../automation/interfaces/job-types';

@Module({
  imports: [
    JwtModule.register({}),
    MulterModule.register(),
    FinancialModule,
    CommunicationModule,
    AuditModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.ATTENDANCE_PROCESSOR }),
  ],
  controllers: [
    EventController,
    AttendanceController,
    AttendanceReportsController,
    PhotoController,
    InvitationController,
  ],
  providers: [EventService, QrService, AttendanceService, PhotoService, RoleGuard, EventAccessGuard],
  exports: [EventService, QrService, AttendanceService, PhotoService],
})
export class EventsModule {}
