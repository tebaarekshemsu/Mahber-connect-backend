import { Body, Controller, Get, Param, Post, UseGuards, Logger, Query } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../membership/guards/role.guard';
import { RequirePermission } from '../membership/decorators/require-permission.decorator';
import { PERMISSIONS } from '../membership/rbac/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AttendanceService } from './attendance.service';
import { QrService } from './qr.service';
import { EventService } from './event.service';
import { QUEUE_NAMES } from '../automation/interfaces/job-types';
import { IsString, IsNotEmpty } from 'class-validator';

class RecordAttendanceDto {
  @IsString()
  @IsNotEmpty()
  qr_token!: string;
}

@ApiTags('Events - Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('mahbers/:id/events/:eventId')
export class AttendanceController {
  private readonly logger = new Logger(AttendanceController.name);

  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly qrService: QrService,
    private readonly eventService: EventService,
    @InjectQueue(QUEUE_NAMES.ATTENDANCE_PROCESSOR)
    private readonly attendanceQueue: Queue,
  ) {}

  @Get('qr')
  @RequirePermission(PERMISSIONS.CREATE_EVENTS)
  @ApiOperation({ summary: 'Generate QR code for event attendance' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'QR code generated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getQrCode(@Param('id') mahberId: string, @Param('eventId') eventId: string) {
    const event = await this.eventService.findOne(mahberId, eventId);
    const qrDataUrl = await this.qrService.generateQRCode(event);
    return { qr_code: qrDataUrl };
  }

  @Get('attendance')
  @ApiOperation({ summary: 'List attendance records for the event' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Attendance list returned' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async listAttendance(
    @Param('id') mahberId: string,
    @Param('eventId') eventId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    // Ensure numeric pagination
    const pageNum = Math.max(1, parseInt(page as any, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as any, 10) || 20));

    // Use the existing service to fetch records and paginate in-memory.
    // This keeps the service API unchanged while providing the endpoint the frontend expects.
    const all = await this.attendanceService.getAttendance(mahberId, eventId);
    const total = all.length;
    const start = (pageNum - 1) * limitNum;
    const data = all.slice(start, start + limitNum);

    return {
      total,
      page: pageNum,
      limit: limitNum,
      data,
    };
  }

  @Post('attendance')
  @ApiOperation({ summary: 'Record attendance using QR code' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 201, description: 'Attendance recorded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid QR token or already recorded' })
  async recordAttendance(
    @Param('id') mahberId: string,
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RecordAttendanceDto,
  ) {
    // Log authenticated user for debugging auth vs QR validation failures
    this.logger.log(
      `Authenticated user for attendance: sub=${user?.sub} phone=${user?.phone} role=${user?.role}`,
    );
    this.logger.debug(
      `Recording attendance request: mahber=${mahberId} event=${eventId} token_len=${dto.qr_token?.length ?? 0}`,
    );

    try {
      return await this.attendanceService.recordAttendance(
        mahberId,
        eventId,
        user.sub,
        dto.qr_token,
      );
    } catch (err) {
      // Surface the failure in logs for easier debugging
      this.logger.warn(
        `recordAttendance failed for user=${user?.sub} event=${eventId}: ${(err as any)?.message ?? err}`,
      );
      throw err;
    }
  }

  @Post('process-attendance')
  @RequirePermission(PERMISSIONS.CREATE_EVENTS)
  @ApiOperation({
    summary: 'Trigger attendance processing for a past event (applies absence fines)',
  })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 201, description: 'Attendance processing job queued' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async processAttendance(@Param('id') mahberId: string, @Param('eventId') eventId: string) {
    await this.attendanceQueue.add({ mahberId, eventId });
    return { message: 'Attendance processing job queued' };
  }
}
