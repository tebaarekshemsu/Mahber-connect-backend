import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { NotificationService } from '../communication/notification.service';
import { AuditService } from '../audit/audit.service';
import { InvitationResponseAction } from './dto/respond-invitation.dto';
import { NotificationType, EventInvitationStatus } from '@prisma/client';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly audit: AuditService,
  ) {}

  async create(mahberId: string, actorId: string, dto: CreateEventDto) {
    const event = await this.prisma.event.create({
      data: {
        mahber_id: mahberId,
        title: dto.title,
        description: dto.description,
        event_type: dto.event_type,
        start_time: new Date(dto.start_time),
        end_time: new Date(dto.end_time),
        location: dto.location,
        is_mandatory: dto.is_mandatory ?? false,
      },
    });

    await this.notificationService.sendToMahberMembers(
      mahberId,
      `New Event Scheduled: ${event.title}`,
      `A new event has been scheduled at ${event.location} starting on ${event.start_time.toLocaleDateString()}`,
      { type: 'EVENT_CREATED', id: event.id },
      NotificationType.event,
      `/mahbers/${mahberId}/events`
    );

    return event;
  }

  async findAll(mahberId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where: { mahber_id: mahberId },
        orderBy: { start_time: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.event.count({ where: { mahber_id: mahberId } }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(mahberId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, mahber_id: mahberId },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    return event;
  }

  async update(
    mahberId: string,
    eventId: string,
    actorId: string,
    dto: UpdateEventDto,
  ) {
    const event = await this.findOne(mahberId, eventId);

    if (event.is_cancelled) {
      throw new BadRequestException('Cannot update a cancelled event');
    }

    // Enforce 24h constraint
    const cutoff = new Date(event.start_time.getTime() - 24 * 60 * 60 * 1000);
    if (new Date() > cutoff) {
      throw new BadRequestException(
        'Event can only be updated more than 24 hours before start time',
      );
    }

    return this.prisma.event.update({
      where: { id: eventId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.event_type !== undefined && { event_type: dto.event_type }),
        ...(dto.start_time !== undefined && {
          start_time: new Date(dto.start_time),
        }),
        ...(dto.end_time !== undefined && { end_time: new Date(dto.end_time) }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.is_mandatory !== undefined && {
          is_mandatory: dto.is_mandatory,
        }),
      },
    });
  }

  async cancel(mahberId: string, eventId: string, actorId: string) {
    const event = await this.findOne(mahberId, eventId);

    if (event.is_cancelled) {
      throw new BadRequestException('Event is already cancelled');
    }

    const cancelled = await this.prisma.event.update({
      where: { id: eventId },
      data: { is_cancelled: true },
    });

    await this.notificationService.sendToMahberMembers(
      mahberId,
      `Event Cancelled: ${cancelled.title}`,
      `The event scheduled for ${event.start_time.toLocaleDateString()} has been cancelled.`,
      { type: 'EVENT_CANCELLED', id: eventId },
      NotificationType.warning,
      `/mahbers/${mahberId}/events`
    );

    return cancelled;
  }

  async sendInvitations(
    mahberId: string,
    eventId: string,
    actorId: string,
    memberIds: string[],
  ) {
    const event = await this.findOne(mahberId, eventId);

    if (event.is_cancelled) {
      throw new BadRequestException('Cannot send invitations for a cancelled event');
    }

    const existingMemberships = await this.prisma.membership.findMany({
      where: {
        mahber_id: mahberId,
        member_id: { in: memberIds },
        status: 'Active',
      },
      select: { member_id: true, user: { select: { name: true } } },
    });

    if (existingMemberships.length === 0) {
      throw new BadRequestException('No valid active members found');
    }

    const validMemberIds = existingMemberships.map((m) => m.member_id);

    const existingInvitations = await this.prisma.eventInvitation.findMany({
      where: {
        event_id: eventId,
        member_id: { in: validMemberIds },
      },
      select: { member_id: true, status: true },
    });

    const alreadyInvited = new Set(existingInvitations.map((i) => i.member_id));
    const newMemberIds = validMemberIds.filter((id) => !alreadyInvited.has(id));

    if (newMemberIds.length === 0) {
      throw new ConflictException('All selected members have already been invited');
    }

    const created = await this.prisma.$transaction(
      newMemberIds.map((memberId) =>
        this.prisma.eventInvitation.create({
          data: {
            event_id: eventId,
            mahber_id: mahberId,
            member_id: memberId,
            channels_used: ['in_app', 'fcm', 'email', 'sms'],
          },
        }),
      ),
    );

    for (const member of existingMemberships) {
      if (!newMemberIds.includes(member.member_id)) continue;
      await this.notificationService.sendToUser(
        member.member_id,
        `Event Invitation: ${event.title}`,
        `You have been invited to ${event.title} at ${event.location} on ${event.start_time.toLocaleDateString()}.`,
        { type: 'EVENT_INVITATION', id: event.id },
        NotificationType.event,
        `/mahbers/${mahberId}/events/${eventId}`,
      );
    }

    await this.audit.logAuditEvent({
      mahber_id: mahberId,
      entity_type: 'event_invitation',
      entity_id: eventId,
      action: 'invitations_sent',
      actor_id: actorId,
      new_value: { member_ids: newMemberIds, total: newMemberIds.length },
      metadata: { event_title: event.title },
    });

    this.logger.log(
      `Invitations sent for event ${eventId}: ${newMemberIds.length} members in mahber ${mahberId}`,
    );

    return {
      invited: newMemberIds.length,
      already_invited: validMemberIds.length - newMemberIds.length,
      invalid_members: memberIds.length - validMemberIds.length,
      invitations: created,
    };
  }

  async respondToInvitation(
    mahberId: string,
    eventId: string,
    invitationId: string,
    memberId: string,
    action: InvitationResponseAction,
  ) {
    const invitation = await this.prisma.eventInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.event_id !== eventId || invitation.mahber_id !== mahberId) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.member_id !== memberId) {
      throw new ForbiddenException('This invitation belongs to another member');
    }

    if (invitation.status !== EventInvitationStatus.Pending) {
      throw new BadRequestException('Invitation has already been responded to');
    }

    const newStatus =
      action === InvitationResponseAction.ACCEPT
        ? EventInvitationStatus.Accepted
        : EventInvitationStatus.Declined;

    const updated = await this.prisma.eventInvitation.update({
      where: { id: invitationId },
      data: { status: newStatus, responded_at: new Date() },
    });

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { title: true },
    });

    await this.notificationService.sendToUser(
      memberId,
      `Invitation ${action === InvitationResponseAction.ACCEPT ? 'Accepted' : 'Declined'}`,
      `You have ${action === InvitationResponseAction.ACCEPT ? 'accepted' : 'declined'} the invitation to ${event?.title ?? 'the event'}.`,
      { type: 'INVITATION_RESPONSE', id: eventId },
      NotificationType.info,
      `/mahbers/${mahberId}/events/${eventId}`,
    );

    await this.audit.logAuditEvent({
      mahber_id: mahberId,
      entity_type: 'event_invitation',
      entity_id: invitationId,
      action: `invitation_${newStatus.toLowerCase()}`,
      actor_id: memberId,
      old_value: { status: EventInvitationStatus.Pending },
      new_value: { status: newStatus },
    });

    return updated;
  }

  async getInvitationsForEvent(mahberId: string, eventId: string) {
    await this.findOne(mahberId, eventId);

    return this.prisma.eventInvitation.findMany({
      where: { event_id: eventId, mahber_id: mahberId },
      include: {
        member: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { sent_at: 'desc' },
    });
  }

  async registerForEvent(mahberId: string, eventId: string, memberId: string) {
    const event = await this.findOne(mahberId, eventId);

    if (event.is_cancelled) {
      throw new BadRequestException('Cannot register for a cancelled event');
    }

    if (new Date() >= event.start_time) {
      throw new BadRequestException('Registration closed — event has already started');
    }

    const membership = await this.prisma.membership.findFirst({
      where: { mahber_id: mahberId, member_id: memberId, status: 'Active' },
    });
    if (!membership) {
      throw new ForbiddenException('You must be an active member to register');
    }

    const existing = await this.prisma.eventInvitation.findUnique({
      where: { event_id_member_id: { event_id: eventId, member_id: memberId } },
    });
    if (existing) {
      if (existing.status === EventInvitationStatus.Accepted) {
        throw new ConflictException('You are already registered for this event');
      }
      if (existing.status === EventInvitationStatus.Declined) {
        throw new BadRequestException('You have previously declined this invitation');
      }
    }

    const registration = existing
      ? await this.prisma.eventInvitation.update({
          where: { id: existing.id },
          data: {
            status: EventInvitationStatus.Accepted,
            source: 'self_register',
            responded_at: new Date(),
          },
        })
      : await this.prisma.eventInvitation.create({
          data: {
            event_id: eventId,
            mahber_id: mahberId,
            member_id: memberId,
            status: EventInvitationStatus.Accepted,
            source: 'self_register',
            channels_used: ['in_app'],
            responded_at: new Date(),
          },
        });

    await this.notificationService.sendToUser(
      memberId,
      `Registered: ${event.title}`,
      `You have registered for ${event.title} on ${event.start_time.toLocaleDateString()}.`,
      { type: 'EVENT_REGISTRATION', id: eventId },
      NotificationType.event,
      `/mahbers/${mahberId}/events/${eventId}`,
    );

    await this.audit.logAuditEvent({
      mahber_id: mahberId,
      entity_type: 'event_registration',
      entity_id: registration.id,
      action: 'member_registered',
      actor_id: memberId,
      new_value: { event_id: eventId, source: 'self_register' },
      metadata: { event_title: event.title },
    });

    return registration;
  }

  async cancelRegistration(mahberId: string, eventId: string, memberId: string) {
    const registration = await this.prisma.eventInvitation.findUnique({
      where: { event_id_member_id: { event_id: eventId, member_id: memberId } },
    });

    if (!registration || registration.status !== EventInvitationStatus.Accepted) {
      throw new NotFoundException('No active registration found for this event');
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { title: true, start_time: true },
    });

    await this.prisma.eventInvitation.delete({ where: { id: registration.id } });

    await this.notificationService.sendToUser(
      memberId,
      `Registration Cancelled: ${event?.title ?? 'Event'}`,
      `Your registration for ${event?.title ?? 'the event'} has been cancelled.`,
      { type: 'EVENT_REGISTRATION', id: eventId },
      NotificationType.event,
      `/mahbers/${mahberId}/events/${eventId}`,
    );

    await this.audit.logAuditEvent({
      mahber_id: mahberId,
      entity_type: 'event_registration',
      entity_id: registration.id,
      action: 'member_cancelled_registration',
      actor_id: memberId,
      old_value: { event_id: eventId },
      metadata: { event_title: event?.title },
    });

    return { message: 'Registration cancelled successfully' };
  }

  async getRegistrations(mahberId: string, eventId: string) {
    await this.findOne(mahberId, eventId);

    const invitations = await this.prisma.eventInvitation.findMany({
      where: { event_id: eventId, mahber_id: mahberId },
      include: {
        member: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { responded_at: 'desc' },
    });

    const totalMembers = await this.prisma.membership.count({
      where: { mahber_id: mahberId, status: 'Active' },
    });

    const accepted = invitations.filter((i) => i.status === EventInvitationStatus.Accepted);
    const declined = invitations.filter((i) => i.status === EventInvitationStatus.Declined);
    const pending = invitations.filter((i) => i.status === EventInvitationStatus.Pending);

    return {
      total_active_members: totalMembers,
      summary: {
        registered: accepted.length,
        declined: declined.length,
        pending: pending.length,
        no_response: totalMembers - invitations.length,
      },
      registrations: accepted,
      invitations: { declined, pending },
    };
  }

  async getMyInvitations(mahberId: string, memberId: string) {
    return this.prisma.eventInvitation.findMany({
      where: {
        mahber_id: mahberId,
        member_id: memberId,
        status: EventInvitationStatus.Pending,
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            event_type: true,
            start_time: true,
            end_time: true,
            location: true,
            is_mandatory: true,
          },
        },
      },
      orderBy: { sent_at: 'desc' },
    });
  }
}
