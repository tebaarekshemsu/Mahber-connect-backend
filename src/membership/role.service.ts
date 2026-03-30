import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateCustomRoleDto } from './dto/create-custom-role.dto';
import { DEFAULT_ROLES } from './rbac/roles';
import { PERMISSIONS } from './rbac/permissions';
import { AuditService } from '../audit/audit.service';

const VALID_PERMISSIONS = Object.values(PERMISSIONS);

@Injectable()
export class RoleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

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

    const updated = await this.prisma.membership.update({
      where: { id: memberId },
      data: { role: newRole },
      include: {
        user: { select: { id: true, name: true, phone: true } },
      },
    });

    await this.audit.logAuditEvent({
      mahber_id: mahberId,
      entity_type: 'membership',
      entity_id: memberId,
      action: 'role_assigned',
      actor_id: actorId,
      old_value: { role: currentRole },
      new_value: { role: newRole },
    });

    return updated;
  }

  async createCustomRole(mahberId: string, actorId: string, dto: CreateCustomRoleDto) {
    // Validate actor is admin (has manage_roles permission)
    const actorMembership = await this.prisma.membership.findFirst({
      where: { mahber_id: mahberId, member_id: actorId },
    });

    if (!actorMembership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const actorRole = actorMembership.role as { name: string; permissions: string[] };
    if (!actorRole?.permissions?.includes('manage_roles')) {
      throw new ForbiddenException('Admin role required');
    }

    // Validate all permissions are valid
    const invalidPermissions = dto.permissions.filter(
      (p) => !VALID_PERMISSIONS.includes(p as any),
    );
    if (invalidPermissions.length > 0) {
      throw new BadRequestException(
        `Invalid permissions: ${invalidPermissions.join(', ')}. Valid permissions are: ${VALID_PERMISSIONS.join(', ')}`,
      );
    }

    // Get current mahber
    const mahber = await this.prisma.mahber.findUnique({ where: { id: mahberId } });
    if (!mahber) {
      throw new NotFoundException('Organization not found');
    }

    // Add custom role to configuration.custom_roles
    const config = (mahber.configuration as Record<string, any>) ?? {};
    const customRoles: { name: string; permissions: string[] }[] = config.custom_roles ?? [];

    const newCustomRole = { name: dto.name, permissions: dto.permissions };
    const updatedConfig = {
      ...config,
      custom_roles: [...customRoles, newCustomRole],
    };

    return this.prisma.mahber.update({
      where: { id: mahberId },
      data: { configuration: updatedConfig },
    });
  }
}
