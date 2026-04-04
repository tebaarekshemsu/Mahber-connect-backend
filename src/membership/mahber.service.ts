import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
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

    return this.prisma.$transaction(async (tx) => {
      const mahber = await tx.mahber.create({
        data: {
          name: dto.name,
          type: dto.type,
          configuration: dto.configuration,
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

  async findOne(mahberId: string, userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { mahber_id: mahberId, member_id: userId },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const cacheKey = `mahber:settings:${mahberId}`;
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const mahber = await this.prisma.mahber.findUnique({ where: { id: mahberId } });
        if (!mahber) {
          throw new NotFoundException('Organization not found');
        }
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
        ...(dto.configuration !== undefined && { configuration: dto.configuration }),
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

    const activeMembers = await this.prisma.membership.count({
      where: { mahber_id: mahberId, status: MembershipStatus.Active },
    });

    if (activeMembers > 1) {
      throw new ConflictException('Cannot delete organization with active members');
    }

    await this.prisma.mahber.delete({ where: { id: mahberId } });

    // Invalidate cached organization settings
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
