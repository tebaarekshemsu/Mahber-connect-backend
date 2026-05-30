import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../membership/guards/role.guard';
import { TenantGuard } from '../membership/guards/tenant.guard';
import { RequireAnyPermission } from '../membership/decorators/require-any-permission.decorator';
import { PERMISSIONS } from '../membership/rbac/permissions';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Reports - Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RoleGuard)
@Controller('mahbers/:id/reports/attendance')
export class AttendanceReportsController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('trends')
  @RequireAnyPermission(PERMISSIONS.VIEW_REPORTS, PERMISSIONS.CREATE_EVENTS)
  @ApiOperation({ summary: 'Mahber-wide attendance trends (read-only)' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiQuery({ name: 'months', required: false, description: 'Months to look back (default 6)' })
  @ApiResponse({ status: 200, description: 'Monthly attendance trends' })
  getTrends(@Param('id') mahberId: string, @Query('months') months?: string) {
    const numMonths = months ? parseInt(months, 10) : 6;
    return this.attendanceService.getMahberTrends(mahberId, numMonths);
  }

  @Get('export')
  @RequireAnyPermission(PERMISSIONS.VIEW_REPORTS, PERMISSIONS.CREATE_EVENTS)
  @ApiOperation({ summary: 'Export mahber attendance report as PDF (read-only)' })
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
      {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
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
