import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { NotificationService } from '../communication/notification.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
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
}
