import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { DEFAULT_ROLES } from './rbac/roles';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async assignRole(
    mahberId: string,
    memberId: string,
    actorId: string,
    dto: AssignRoleDto,
  ) {
    // Validate actor is admin (has manage_roles permission)
    const actorMembership = await this.prisma.membership.findFirst({
      where: { mahber_id: mahberId, member_id: actorId },
    });

    if (!actorMembership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const actorRole = actorMembership.role as {
      name: string;
      permissions: string[];
    };
    if (!actorRole?.permissions?.includes('manage_roles')) {
      throw new ForbiddenException('Admin role required');
    }

    // Find target membership
    const targetMembership = await this.prisma.membership.findFirst({
      where: { id: memberId, mahber_id: mahberId },
    });

    if (!targetMembership) {
      throw new NotFoundException('Member not found');
    }

    // Validate target member has Active status
    if (targetMembership.status !== MembershipStatus.Active) {
      throw new BadRequestException(
        'Role can only be assigned to members with Active status',
      );
    }

    // If removing Admin role, ensure at least one other admin remains
    const currentRole = targetMembership.role as {
      name: string;
      permissions: string[];
    };
    const isCurrentlyAdmin = currentRole?.name === 'Admin';
    const isAssigningNonAdmin = dto.role_name !== 'Admin';

    if (isCurrentlyAdmin && isAssigningNonAdmin) {
      const adminCount = await this.prisma.membership.count({
        where: {
          mahber_id: mahberId,
          status: MembershipStatus.Active,
          role: { path: ['name'], equals: 'Admin' },
        },
      });

      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot remove the last admin from the organization',
        );
      }
    }

    // Build the role object
    let permissions: string[];

    if (dto.custom_permissions && dto.custom_permissions.length > 0) {
      permissions = dto.custom_permissions;
    } else if (DEFAULT_ROLES[dto.role_name]) {
      permissions = DEFAULT_ROLES[dto.role_name].permissions as string[];
    } else {
      permissions = [];
    }

    const newRole = {
      name: dto.role_name,
      permissions,
    };

    return this.prisma.membership.update({
      where: { id: memberId },
      data: { role: newRole },
      include: {
        user: { select: { id: true, name: true, phone: true } },
      },
    });
  }
}
