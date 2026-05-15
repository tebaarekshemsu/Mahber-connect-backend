import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MembershipStatus, TransactionType, ViolationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QrService } from './qr.service';
import { FineService } from '../financial/fine.service';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly qrService: QrService,
  ) {}

  /**
   * Validate QR code and record attendance for a member.
   * Prevents duplicate attendance records.
   *
   * Validates: Requirements 11.3, 11.4, 11.5
   */
  async recordAttendance(mahberId: string, eventId: string, memberId: string, qrToken: string) {
    this.logger.log(
      `recordAttendance called: event=${eventId} mahber=${mahberId} member=${memberId}`,
    );
    this.logger.debug(`QR token length=${qrToken?.length ?? 0}`);

    // Validate QR code (verifies signature, expiration, mahber match)
    let payload;
    try {
      payload = this.qrService.validateQRCode(qrToken, mahberId);
    } catch (err) {
      this.logger.warn(
        `QR validation failed for member=${memberId} event=${eventId} mahber=${mahberId}: ${(err as any)?.message ?? err}`,
      );
      throw err;
    }

    // Use member_id from the QR payload (personal QR) or fall back to the requesting user
    const targetMemberId = payload.member_id ?? memberId;

    this.logger.debug(
      `QR validated: event_id=${payload.event_id} mahber_id=${payload.mahber_id} member_id=${targetMemberId} exp=${payload.exp ?? 'n/a'}`,
    );

    if (payload.event_id !== eventId) {
      throw new ForbiddenException('QR code does not match this event');
    }

    // Verify event exists and belongs to mahber
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, mahber_id: mahberId },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    // Verify member is Active and belongs to this mahber
    const membership = await this.prisma.membership.findFirst({
      where: {
        member_id: targetMemberId,
        mahber_id: mahberId,
        status: MembershipStatus.Active,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You must be an active member of this mahber to check in');
    }

    // Prevent duplicate attendance
    const existing = await this.prisma.attendance.findUnique({
      where: { event_id_member_id: { event_id: eventId, member_id: targetMemberId } },
    });

    if (existing) {
      throw new ConflictException('Attendance already recorded for this event');
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        event_id: eventId,
        member_id: targetMemberId,
        mahber_id: mahberId,
      },
    });

    this.logger.log(`Attendance recorded: event=${eventId} member=${targetMemberId} mahber=${mahberId}`);

    return attendance;
  }

  async manualCheckIn(mahberId: string, eventId: string, memberId: string, actorId: string) {
    this.logger.log(
      `manualCheckIn: event=${eventId} mahber=${mahberId} targetMember=${memberId} actor=${actorId}`,
    );

    const event = await this.prisma.event.findFirst({
      where: { id: eventId, mahber_id: mahberId },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    if (event.is_cancelled) {
      throw new BadRequestException('Cannot check in to a cancelled event');
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        member_id: memberId,
        mahber_id: mahberId,
        status: MembershipStatus.Active,
      },
      include: { user: { select: { id: true, name: true, phone: true } } },
    });

    if (!membership) {
      throw new ForbiddenException('Member is not active in this mahber');
    }

    const existing = await this.prisma.attendance.findUnique({
      where: { event_id_member_id: { event_id: eventId, member_id: memberId } },
    });

    if (existing) {
      throw new ConflictException('Attendance already recorded for this member');
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        event_id: eventId,
        member_id: memberId,
        mahber_id: mahberId,
      },
    });

    this.logger.log(
      `Manual check-in recorded: event=${eventId} member=${memberId} mahber=${mahberId} actor=${actorId}`,
    );

    return { ...attendance, user: membership.user };
  }

  /**
   * Get all attendance records for an event.
   */
  async getAttendance(mahberId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, mahber_id: mahberId },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    const records = await this.prisma.attendance.findMany({
      where: { event_id: eventId, mahber_id: mahberId },
      orderBy: { checked_in_at: 'asc' },
    });

    if (records.length === 0) return records;

    const memberIds = records.map((r) => r.member_id);
    const memberships = await this.prisma.membership.findMany({
      where: { member_id: { in: memberIds }, mahber_id: mahberId },
      include: { user: { select: { id: true, name: true, phone: true } } },
    });

    const userByMemberId = new Map(
      memberships.map((m) => [m.member_id, m.user]),
    );

    return records.map((r) => ({
      ...r,
      user: userByMemberId.get(r.member_id),
    }));
  }

  /**
   * Process event attendance: mark absent members and apply fines for mandatory events.
   * Ensures each absent member receives exactly one fine.
   *
   * Validates: Requirements 11.7, 8.2
   */
  async processEventAttendance(mahberId: string, eventId: string, fineService: FineService) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, mahber_id: mahberId },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    // Get all active members of the mahber
    const activeMembers = await this.prisma.membership.findMany({
      where: { mahber_id: mahberId, status: MembershipStatus.Active },
    });

    // Get members who attended
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: { event_id: eventId, mahber_id: mahberId },
    });

    const attendedMemberIds = new Set(
      attendanceRecords.map((a: { member_id: string }) => a.member_id),
    );

    // Determine absent members
    const absentMembers = activeMembers.filter(
      (m: { member_id: string }) => !attendedMemberIds.has(m.member_id),
    );

    this.logger.log(
      `Processing attendance for event=${eventId}: ${activeMembers.length} active members, ` +
        `${attendanceRecords.length} attended, ${absentMembers.length} absent`,
    );

    if (!event.is_mandatory || absentMembers.length === 0) {
      return {
        eventId,
        totalMembers: activeMembers.length,
        attended: attendanceRecords.length,
        absent: absentMembers.length,
        finesApplied: 0,
      };
    }

    // Retrieve mahber configuration for fine calculation
    const mahber = await this.prisma.mahber.findUnique({
      where: { id: mahberId },
    });

    const config = mahber?.configuration as {
      penalty_rate?: number;
      penalty_mode?: 'percentage' | 'fixed';
      contribution_amount?: number;
    } | null;

    const penaltyRate = config?.penalty_rate ?? 0;
    const penaltyMode = config?.penalty_mode ?? 'fixed';
    const contributionAmount = config?.contribution_amount ?? 0;

    let finesApplied = 0;

    for (const member of absentMembers) {
      // Only apply fine if no MISSED_ATTENDANCE fine exists for this member+event
      // We store event_id context by checking ledger entries linked to fines
      const alreadyFined = await this.hasAttendanceFineForEvent(
        mahberId,
        member.member_id,
        eventId,
      );

      if (!alreadyFined) {
        await fineService.applyFine(
          mahberId,
          member.member_id,
          ViolationType.MISSED_ATTENDANCE,
          penaltyRate,
          contributionAmount,
          penaltyMode,
          `Absent from mandatory event: ${event.title} (${eventId})`,
        );
        finesApplied++;
      }
    }

    this.logger.log(`Fines applied for event=${eventId}: ${finesApplied} fines`);

    return {
      eventId,
      totalMembers: activeMembers.length,
      attended: attendanceRecords.length,
      absent: absentMembers.length,
      finesApplied,
    };
  }

  /**
   * Check if a member already has an attendance fine for a specific event
   * by inspecting ledger entry descriptions.
   */
  async getAnalytics(mahberId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, mahber_id: mahberId },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    const [activeMembers, attendanceRecords] = await Promise.all([
      this.prisma.membership.count({
        where: { mahber_id: mahberId, status: MembershipStatus.Active },
      }),
      this.prisma.attendance.findMany({
        where: { event_id: eventId, mahber_id: mahberId },
      }),
    ]);

    const attended = attendanceRecords.length;
    const absent = activeMembers - attended;
    const percentage = activeMembers > 0 ? Math.round((attended / activeMembers) * 100) : 0;

    return {
      event_id: eventId,
      total_members: activeMembers,
      attended,
      absent,
      attendance_percentage: percentage,
      is_mandatory: event.is_mandatory,
      is_cancelled: event.is_cancelled,
    };
  }

  async getMahberTrends(mahberId: string, months: number = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const [events, activeMemberCount] = await Promise.all([
      this.prisma.event.findMany({
        where: { mahber_id: mahberId, start_time: { gte: startDate }, is_cancelled: false },
        select: { id: true, start_time: true },
        orderBy: { start_time: 'asc' },
      }),
      this.prisma.membership.count({
        where: { mahber_id: mahberId, status: MembershipStatus.Active },
      }),
    ]);

    const eventIds = events.map((e) => e.id);

    const attendanceRecords = await this.prisma.attendance.findMany({
      where: { mahber_id: mahberId, event_id: { in: eventIds } },
    });

    const attendanceByEvent = new Map<string, Set<string>>();
    for (const rec of attendanceRecords) {
      if (!attendanceByEvent.has(rec.event_id)) {
        attendanceByEvent.set(rec.event_id, new Set());
      }
      attendanceByEvent.get(rec.event_id)!.add(rec.member_id);
    }

    const monthlyMap = new Map<string, { eventCount: number; totalAttended: number }>();

    for (const event of events) {
      const monthKey = event.start_time.toISOString().slice(0, 7);
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { eventCount: 0, totalAttended: 0 });
      }
      const monthData = monthlyMap.get(monthKey)!;
      monthData.eventCount++;
      monthData.totalAttended += attendanceByEvent.get(event.id)?.size ?? 0;
    }

    const trends = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        event_count: data.eventCount,
        total_members: activeMemberCount,
        total_attended: data.totalAttended,
        average_attendance_rate: data.eventCount > 0
          ? Math.round((data.totalAttended / (activeMemberCount * data.eventCount)) * 100)
          : 0,
      }));

    return { trends, total_active_members: activeMemberCount };
  }

  async exportAttendanceReportPdf(
    mahberId: string,
    mahberName: string,
    filters: { startDate?: Date; endDate?: Date },
  ): Promise<Buffer> {
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (filters.startDate) dateFilter.gte = filters.startDate;
    if (filters.endDate) dateFilter.lte = filters.endDate;
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    const [activeMembers, allEvents, attendanceRecords, totalFines] = await Promise.all([
      this.prisma.membership.count({
        where: { mahber_id: mahberId, status: MembershipStatus.Active },
      }),
      this.prisma.event.findMany({
        where: {
          mahber_id: mahberId,
          ...(hasDateFilter ? { start_time: dateFilter } : {}),
        },
        orderBy: { start_time: 'desc' },
        take: 100,
      }),
      this.prisma.attendance.findMany({
        where: { mahber_id: mahberId },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: { mahber_id: mahberId, transaction_type: TransactionType.Fine },
        _sum: { amount: true },
      }),
    ]);

    const attendanceByEvent = new Map<string, Set<string>>();
    for (const rec of attendanceRecords) {
      if (!attendanceByEvent.has(rec.event_id)) {
        attendanceByEvent.set(rec.event_id, new Set());
      }
      attendanceByEvent.get(rec.event_id)!.add(rec.member_id);
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const dateRangeLabel = filters.startDate && filters.endDate
      ? `${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}`
      : 'All time';

    let y = 50;
    const leftMargin = 50;

    const writeText = (text: string, opts: { size?: number; bold?: boolean; color?: string } = {}) => {
      doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size ?? 12);
      if (opts.color) doc.fillColor(opts.color);
      doc.text(text, leftMargin, y, { width: 495 });
      y += (opts.size ?? 12) * 1.5;
      doc.fillColor('#000000');
    };

    writeText('Attendance Report', { size: 22, bold: true });
    writeText(mahberName, { size: 14, color: '#666666' });
    writeText(`Period: ${dateRangeLabel}`, { size: 11, color: '#999999' });
    y += 10;
    doc.moveTo(leftMargin, y).lineTo(545, y).strokeColor('#cccccc').stroke();
    y += 20;

    writeText('Summary', { size: 16, bold: true });
    writeText(`Total Active Members:  ${activeMembers}`);
    writeText(`Total Events:          ${allEvents.length}`);
    writeText(`Total Fines Collected: ${Number(totalFines._sum.amount ?? 0).toFixed(2)} ETB`);
    y += 10;

    const totalAttendedAcrossEvents = attendanceByEvent.size;
    writeText(`Events with Attendance: ${totalAttendedAcrossEvents}`, { color: '#15803d' });
    y += 10;

    doc.moveTo(leftMargin, y).lineTo(545, y).strokeColor('#cccccc').stroke();
    y += 20;

    writeText('Event Attendance Breakdown', { size: 16, bold: true });

    const colWidths = [90, 50, 50, 50, 100];
    const headers = ['Date', 'Members', 'Attended', 'Rate', 'Event'];

    doc.font('Helvetica-Bold').fontSize(8);
    let x = leftMargin;
    headers.forEach((h, i) => {
      doc.text(h, x, y, { width: colWidths[i], align: 'left' });
      x += colWidths[i];
    });
    y += 14;
    doc.moveTo(leftMargin, y - 4).lineTo(leftMargin + colWidths.reduce((a, b) => a + b, 0), y - 4).strokeColor('#cccccc').stroke();

    doc.font('Helvetica').fontSize(7);
    for (const event of allEvents) {
      if (y > 750) { doc.addPage(); y = 50; }

      const attended = attendanceByEvent.get(event.id)?.size ?? 0;
      const rate = activeMembers > 0 ? Math.round((attended / activeMembers) * 100) : 0;

      x = leftMargin;
      doc.text(event.start_time.toISOString().split('T')[0], x, y, { width: colWidths[0], align: 'left' }); x += colWidths[0];
      doc.text(String(activeMembers), x, y, { width: colWidths[1], align: 'left' }); x += colWidths[1];
      doc.text(String(attended), x, y, { width: colWidths[2], align: 'left' }); x += colWidths[2];
      doc.text(`${rate}%`, x, y, { width: colWidths[3], align: 'left' }); x += colWidths[3];
      doc.text(event.title.substring(0, 25), x, y, { width: colWidths[4], align: 'left' }); x += colWidths[4];
      y += 12;
    }

    doc.end();
    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  private async hasAttendanceFineForEvent(
    mahberId: string,
    memberId: string,
    eventId: string,
  ): Promise<boolean> {
    const entry = await this.prisma.ledgerEntry.findFirst({
      where: {
        mahber_id: mahberId,
        member_id: memberId,
        description: { contains: eventId },
      },
    });
    return entry !== null;
  }
}
