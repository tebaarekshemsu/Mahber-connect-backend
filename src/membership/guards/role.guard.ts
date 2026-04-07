import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { Permission } from '../rbac/permissions';
import { Role } from '../rbac/roles';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<Permission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permission required — allow through
    if (!requiredPermission) {
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
      throw new ForbiddenException('Insufficient permissions');
    }

    const role = membership.role as unknown as Role;
    const permissions: Permission[] = role?.permissions ?? [];

    if (!permissions.includes(requiredPermission)) {
      throw new ForbiddenException(
        `Permission '${requiredPermission}' is required`,
      );
    }

    return true;
  }
}
