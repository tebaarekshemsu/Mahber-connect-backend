import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { PERMISSIONS_ANY_KEY } from '../decorators/require-any-permission.decorator';
import { Permission } from '../rbac/permissions';
import { membershipHasRequiredPermissions } from '../rbac/check-permissions';
import { Role } from '../rbac/roles';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class RoleGuard implements CanActivate {
  private readonly logger = new Logger(RoleGuard.name);

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

    if (!requiredPermission && !requiredAny?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;
    const mahberId: string = request.params?.id;

    if (!user?.sub || !mahberId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        member_id: user.sub,
        mahber_id: mahberId,
        status: 'Active',
      },
    });

    if (!membership) {
      this.logger.warn(
        `RoleGuard: No active membership found for user=${user.sub} mahber=${mahberId}`,
      );
      throw new ForbiddenException('Insufficient permissions');
    }

    const role = membership.role as unknown as Role;
    const permissions: Permission[] = role?.permissions ?? [];

    this.logger.debug(
      `RoleGuard: user=${user.sub} mahber=${mahberId} required=${requiredPermission ?? requiredAny?.join('|') ?? 'none'} role="${role?.name}" permissions=[${permissions.join(', ')}]`,
    );

    if (
      !membershipHasRequiredPermissions(
        permissions,
        requiredPermission,
        requiredAny,
      )
    ) {
      const label =
        requiredAny?.join(' or ') ?? requiredPermission ?? 'unknown';
      this.logger.warn(
        `RoleGuard: DENIED user=${user.sub} mahber=${mahberId} required=${label} actual=[${permissions.join(', ')}]`,
      );
      throw new ForbiddenException(`Permission '${label}' is required`);
    }

    this.logger.debug(
      `RoleGuard: GRANTED user=${user.sub} mahber=${mahberId} permission=${requiredPermission ?? requiredAny?.join('|')}`,
    );
    return true;
  }
}
