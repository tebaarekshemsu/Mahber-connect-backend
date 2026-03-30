import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../membership/guards/role.guard';
import { RequirePermission } from '../membership/decorators/require-permission.decorator';
import { PERMISSIONS } from '../membership/rbac/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AttendanceService } from './attendance.service';
import { QrService } from './qr.service';
import { EventService } from './event.service';
import { IsString, IsNotEmpty } from 'class-validator';

class RecordAttendanceDto {
  @IsString()
  @IsNotEmpty()
  qr_token!: string;
}

@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('mahbers/:id/events/:eventId')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly qrService: QrService,
    private readonly eventService: EventService,
  ) {}

  /**
   * GET /mahbers/:id/events/:eventId/qr
   * Generate a QR code for the event. Requires create_events permission (secretary).
   *
   * Validates: Requirement 11.1
   */
  @Get('qr')
  @RequirePermission(PERMISSIONS.CREATE_EVENTS)
  async getQrCode(
    @Param('id') mahberId: string,
    @Param('eventId') eventId: string,
  ) {
    const event = await this.eventService.findOne(mahberId, eventId);
    const qrDataUrl = await this.qrService.generateQRCode(event);
    return { qr_code: qrDataUrl };
  }

  /**
   * POST /mahbers/:id/events/:eventId/attendance
   * Record attendance for the authenticated member using a QR token.
   *
   * Validates: Requirements 11.3, 11.4, 11.5
   */
  @Post('attendance')
  async recordAttendance(
    @Param('id') mahberId: string,
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RecordAttendanceDto,
  ) {
    return this.attendanceService.recordAttendance(
      mahberId,
      eventId,
      user.sub,
      dto.qr_token,
    );
  }
}
