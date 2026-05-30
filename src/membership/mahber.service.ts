import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMahberDto } from './dto/create-mahber.dto';
import { UpdateMahberDto } from './dto/update-mahber.dto';
import { CacheService } from '../common/services/cache.service';

const ADMIN_ROLE = {
  name: 'Admin',
  permissions: [
    'manage_members',
    'manage_finances',
    'create_events',
    'send_announcements',
    'view_reports',
    'manage_roles',
  ],
};

const ORG_SETTINGS_TTL = 3600; // 1 hour

@Injectable()
export class MahberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async create(userId: string, dto: CreateMahberDto) {
    const existing = await this.prisma.mahber.findUnique({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException('Organization name already exists');
    }

    const configuration = {
      ...dto.configuration,
      ...(dto.role_limits !== undefined && { role_limits: dto.role_limits }),
    };

    return this.prisma.$transaction(async (tx) => {
      const mahber = await tx.mahber.create({
        data: {
          name: dto.name,
          type: dto.type,
          configuration: configuration as Prisma.InputJsonValue,
          is_public: dto.is_public ?? true,
          invitation_code: dto.invitation_code,
        },
      });

      await tx.membership.create({
        data: {
          mahber_id: mahber.id,
          member_id: userId,
          status: MembershipStatus.Active,
          role: ADMIN_ROLE,
          activation_date: new Date(),
          approval_date: new Date(),
        },
      });

      return mahber;
    });
  }

  async findAll(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { member_id: userId },
      include: { mahber: true },
    });

    return memberships.map((m) => m.mahber);
  }

  async searchPublic(query?: string) {
    return this.prisma.mahber.findMany({
      where: {
        is_public: true,
        ...(query ? { name: { contains: query, mode: 'insensitive' } } : {}),
      },
      select: { id: true, name: true, type: true, is_public: true, created_at: true },
      orderBy: { name: 'asc' },
      take: 50,
    });
  }

  async getStatistics(mahberId: string, userId: string) {
    // Verify membership
    const membership = await this.prisma.membership.findFirst({
      where: { mahber_id: mahberId, member_id: userId },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const [totalMembers, activeMembers, upcomingEvents, totalPayments] = await Promise.all([
      this.prisma.membership.count({ where: { mahber_id: mahberId } }),
      this.prisma.membership.count({ where: { mahber_id: mahberId, status: 'Active' } }),
      this.prisma.event.count({
        where: { mahber_id: mahberId, is_cancelled: false, start_time: { gte: new Date() } },
      }),
      this.prisma.payment.count({ where: { mahber_id: mahberId, status: 'Completed' } }),
    ]);

    return { totalMembers, activeMembers, upcomingEvents, totalPayments };
  }

  async findOne(mahberId: string, userId: string) {
    const mahber = await this.prisma.mahber.findUnique({ where: { id: mahberId } });
    if (!mahber) {
      throw new NotFoundException('Organization not found');
    }

    // Access control:
    // - Public organizations are visible to everyone
    // - Private organizations require membership OR a pending join request
    if (!mahber.is_public) {
      const membership = await this.prisma.membership.findFirst({
        where: { mahber_id: mahberId, member_id: userId },
      });

      if (!membership) {
        const joinRequest = await this.prisma.joinRequest.findFirst({
          where: {
            mahber_id: mahberId,
            user_id: userId,
            status: 'Pending',
          },
        });

        if (!joinRequest) {
          throw new ForbiddenException('You do not have access to this organization');
        }
      }
    }

    const cacheKey = `mahber:settings:${mahberId}`;
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        return mahber;
      },
      ORG_SETTINGS_TTL,
    );
  }

  async update(mahberId: string, userId: string, dto: UpdateMahberDto) {
    await this.assertAdmin(mahberId, userId);

    if (dto.name) {
      const existing = await this.prisma.mahber.findFirst({
        where: { name: dto.name, id: { not: mahberId } },
      });
      if (existing) {
        throw new ConflictException('Organization name already exists');
      }
    }

    const updated = await this.prisma.mahber.update({
      where: { id: mahberId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.configuration !== undefined && {
          configuration: dto.configuration as Prisma.InputJsonValue,
        }),
        ...(dto.is_public !== undefined && { is_public: dto.is_public }),
        ...(dto.invitation_code !== undefined && { invitation_code: dto.invitation_code }),
      },
    });

    // Invalidate cached organization settings
    await this.cache.del(`mahber:settings:${mahberId}`);

    return updated;
  }

  async remove(mahberId: string, userId: string) {
    await this.assertAdmin(mahberId, userId);

    const otherMembers = await this.prisma.membership.count({
      where: { mahber_id: mahberId, member_id: { not: userId } },
    });

    if (otherMembers > 0) {
      throw new ConflictException('Cannot delete organization with other members');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.vote.deleteMany({ where: { poll: { mahber_id: mahberId } } });
      await tx.announcementRead.deleteMany({ where: { announcement: { mahber_id: mahberId } } });
      await tx.eventInvitation.deleteMany({ where: { mahber_id: mahberId } });
      await tx.attendance.deleteMany({ where: { mahber_id: mahberId } });
      await tx.eventPhoto.deleteMany({ where: { mahber_id: mahberId } });
      await tx.ledgerEntry.deleteMany({ where: { mahber_id: mahberId } });
      await tx.fine.deleteMany({ where: { mahber_id: mahberId } });
      await tx.payment.deleteMany({ where: { mahber_id: mahberId } });
      await tx.event.deleteMany({ where: { mahber_id: mahberId } });
      await tx.announcement.deleteMany({ where: { mahber_id: mahberId } });
      await tx.poll.deleteMany({ where: { mahber_id: mahberId } });
      await tx.chatMessage.deleteMany({ where: { mahber_id: mahberId } });
      await tx.payout.deleteMany({ where: { mahber_id: mahberId } });
      await tx.expense.deleteMany({ where: { mahber_id: mahberId } });
      await tx.lottery.deleteMany({ where: { mahber_id: mahberId } });
      await tx.pendingPayment.deleteMany({ where: { mahber_id: mahberId } });
      await tx.membership.deleteMany({ where: { mahber_id: mahberId } });
      await tx.joinRequest.deleteMany({ where: { mahber_id: mahberId } });
      await tx.auditTrail.deleteMany({ where: { mahber_id: mahberId } });

      await tx.mahber.delete({ where: { id: mahberId } });
    });

    await this.cache.del(`mahber:settings:${mahberId}`);

    return { message: 'Organization deleted successfully' };
  }

  private async assertAdmin(mahberId: string, userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { mahber_id: mahberId, member_id: userId },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const role = membership.role as { name: string; permissions: string[] };
    if (!role?.permissions?.includes('manage_members')) {
      throw new ForbiddenException('Admin role required');
    }
  }
}
