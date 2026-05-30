import { Body, Controller, Get, Param, Post, Res, UseGuards, Logger, Query } from '@nestjs/common';
import { Response } from 'express';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../membership/guards/role.guard';
import { EventAccessGuard } from './guards/event-access.guard';
import { AllowEventHost } from './decorators/allow-event-host.decorator';
import { RequirePermission } from '../membership/decorators/require-permission.decorator';
import { RequireAnyPermission } from '../membership/decorators/require-any-permission.decorator';
import { PERMISSIONS } from '../membership/rbac/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AttendanceService } from './attendance.service';
import { QrService } from './qr.service';
import { EventService } from './event.service';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_NAMES } from '../automation/interfaces/job-types';
import { IsString, IsNotEmpty } from 'class-validator';
import { ManualCheckInDto } from './dto/manual-checkin.dto';

class RecordAttendanceDto {
  @IsString()
  @IsNotEmpty()
  qr_token!: string;
}

@ApiTags('Events - Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mahbers/:id/events/:eventId')
export class AttendanceController {
  private readonly logger = new Logger(AttendanceController.name);

  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly qrService: QrService,
    private readonly eventService: EventService,
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.ATTENDANCE_PROCESSOR)
    private readonly attendanceQueue: Queue,
  ) {}

  @Get('qr')
  @UseGuards(EventAccessGuard)
  @RequirePermission(PERMISSIONS.CREATE_EVENTS)
  @AllowEventHost()
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
  @UseGuards(EventAccessGuard)
  @RequireAnyPermission(PERMISSIONS.VIEW_REPORTS, PERMISSIONS.CREATE_EVENTS)
  @AllowEventHost()
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
    const pageNum = Math.max(1, parseInt(page as any, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as any, 10) || 20));

    const all = await this.attendanceService.getAttendance(mahberId, eventId);
    const total = all.length;
    const start = (pageNum - 1) * limitNum;
    const data = all.slice(start, start + limitNum);

    const totalPages = Math.ceil(total / limitNum) || 1;
    return {
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
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
      this.logger.warn(
        `recordAttendance failed for user=${user?.sub} event=${eventId}: ${(err as any)?.message ?? err}`,
      );
      throw err;
    }
  }

  @Post('attendance/manual')
  @UseGuards(EventAccessGuard)
  @RequirePermission(PERMISSIONS.CREATE_EVENTS)
  @AllowEventHost()
  @ApiOperation({ summary: 'Manually check in a member (admin/event host fallback)' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 201, description: 'Member checked in successfully' })
  @ApiResponse({ status: 409, description: 'Attendance already recorded' })
  async manualCheckIn(
    @Param('id') mahberId: string,
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ManualCheckInDto,
  ) {
    return this.attendanceService.manualCheckIn(mahberId, eventId, dto.member_id, user.sub);
  }

  @Post('process-attendance')
  @UseGuards(RoleGuard)
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

  @Get('attendance/analytics')
  @UseGuards(EventAccessGuard)
  @RequireAnyPermission(PERMISSIONS.VIEW_REPORTS, PERMISSIONS.CREATE_EVENTS)
  @AllowEventHost()
  @ApiOperation({ summary: 'Get attendance analytics for an event' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Attendance analytics' })
  async getAnalytics(@Param('id') mahberId: string, @Param('eventId') eventId: string) {
    return this.attendanceService.getAnalytics(mahberId, eventId);
  }

  @Get('attendance/trends')
  @UseGuards(EventAccessGuard)
  @RequireAnyPermission(PERMISSIONS.VIEW_REPORTS, PERMISSIONS.CREATE_EVENTS)
  @AllowEventHost()
  @ApiOperation({ summary: 'Get attendance trends over months' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiQuery({ name: 'months', required: false, description: 'Number of months to look back (default 6)' })
  @ApiResponse({ status: 200, description: 'Monthly attendance trends' })
  async getTrends(
    @Param('id') mahberId: string,
    @Query('months') months?: string,
  ) {
    const numMonths = months ? parseInt(months, 10) : 6;
    return this.attendanceService.getMahberTrends(mahberId, numMonths);
  }

  @Get('attendance/report')
  @UseGuards(EventAccessGuard)
  @RequireAnyPermission(PERMISSIONS.VIEW_REPORTS, PERMISSIONS.CREATE_EVENTS)
  @AllowEventHost()
  @ApiOperation({ summary: 'Export attendance report as PDF' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'PDF report' })
  async exportReport(
    @Param('id') mahberId: string,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const mahber = await this.prisma.mahber.findUnique({ where: { id: mahberId } });
    const pdfBuffer = await this.attendanceService.exportAttendanceReportPdf(
      mahberId,
      mahber?.name ?? 'Unknown Mahber',
      { startDate: startDate ? new Date(startDate) : undefined, endDate: endDate ? new Date(endDate) : undefined },
    );

    const filename = `attendance-report-${mahberId}-${Date.now()}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }
}
