import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { NotificationService } from './notification.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class AnnouncementService {
  private readonly logger = new Logger(AnnouncementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(
    mahberId: string,
    actorId: string,
    dto: CreateAnnouncementDto,
  ) {
    const isScheduled = !!dto.scheduled_at;
    const announcement = await this.prisma.announcement.create({
      data: {
        mahber_id: mahberId,
        title: dto.title,
        content: dto.content,
        priority: dto.priority,
        target_audience: dto.target_audience ?? null,
        scheduled_at: isScheduled ? new Date(dto.scheduled_at!) : null,
        is_published: !isScheduled,
        created_by: actorId,
      },
    });

    if (!isScheduled) {
      await this.notificationService.sendToMahberMembers(
        mahberId,
        `New Announcement: ${announcement.title}`,
        announcement.content,
        { type: 'ANNOUNCEMENT', id: announcement.id },
        NotificationType.info,
        `/mahbers/${mahberId}`
      );
    }

    return announcement;
  }

  async findAll(mahberId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.announcement.findMany({
        where: { mahber_id: mahberId, is_published: true },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.announcement.count({
        where: { mahber_id: mahberId, is_published: true },
      }),
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

  async markAsRead(announcementId: string, memberId: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement) {
      throw new NotFoundException(`Announcement ${announcementId} not found`);
    }

    try {
      return await this.prisma.announcementRead.create({
        data: {
          announcement_id: announcementId,
          member_id: memberId,
        },
      });
    } catch (err: any) {
      // Unique constraint violation — already marked as read
      if (err?.code === 'P2002') {
        throw new ConflictException('Announcement already marked as read');
      }
      throw err;
    }
  }
}
