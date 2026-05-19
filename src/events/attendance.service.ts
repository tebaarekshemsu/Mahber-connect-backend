import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MembershipStatus, ViolationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QrService } from './qr.service';
import { FineService } from '../financial/fine.service';

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

    this.logger.debug(
      `QR validated: event_id=${payload.event_id} mahber_id=${payload.mahber_id} exp=${payload.exp ?? 'n/a'}`,
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
        member_id: memberId,
        mahber_id: mahberId,
        status: MembershipStatus.Active,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You must be an active member of this mahber to check in');
    }

    // Prevent duplicate attendance
    const existing = await this.prisma.attendance.findUnique({
      where: { event_id_member_id: { event_id: eventId, member_id: memberId } },
    });

    if (existing) {
      throw new ConflictException('Attendance already recorded for this event');
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        event_id: eventId,
        member_id: memberId,
        mahber_id: mahberId,
      },
    });

    this.logger.log(`Attendance recorded: event=${eventId} member=${memberId} mahber=${mahberId}`);

    return attendance;
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

    return this.prisma.attendance.findMany({
      where: { event_id: eventId, mahber_id: mahberId },
      orderBy: { checked_in_at: 'asc' },
    });
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
