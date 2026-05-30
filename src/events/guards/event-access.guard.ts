import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSION_KEY } from '../../membership/decorators/require-permission.decorator';
import { PERMISSIONS_ANY_KEY } from '../../membership/decorators/require-any-permission.decorator';
import { ALLOW_EVENT_HOST_KEY } from '../decorators/allow-event-host.decorator';
import { Permission } from '../../membership/rbac/permissions';
import { membershipHasRequiredPermissions } from '../../membership/rbac/check-permissions';
import { Role } from '../../membership/rbac/roles';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class EventAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<Permission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredAny = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_ANY_KEY,
      [context.getHandler(), context.getClass()],
    );

    const allowEventHost = this.reflector.getAllAndOverride<boolean>(
      ALLOW_EVENT_HOST_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;
    const mahberId: string = request.params?.id;
    const eventId: string = request.params?.eventId;

    if (!user?.sub || !mahberId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (requiredPermission || requiredAny?.length) {
      const membership = await this.prisma.membership.findFirst({
        where: {
          member_id: user.sub,
          mahber_id: mahberId,
          status: 'Active',
        },
      });

      if (membership) {
        const role = membership.role as unknown as Role;
        const permissions: Permission[] = role?.permissions ?? [];

        if (
          membershipHasRequiredPermissions(
            permissions,
            requiredPermission,
            requiredAny,
          )
        ) {
          return true;
        }
      }
    }

    if (allowEventHost && eventId) {
      const event = await this.prisma.event.findFirst({
        where: { id: eventId, mahber_id: mahberId },
        select: { host_id: true },
      });

      if (event?.host_id === user.sub) {
        return true;
      }
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
