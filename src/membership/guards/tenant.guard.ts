import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

/**
 * TenantGuard enforces multi-tenancy by validating that the authenticated user
 * is a member of the mahber identified by the :id route parameter.
 *
 * Apply after JwtAuthGuard on any tenant-scoped route.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    // Prefer mahber_id from JWT claims, fall back to route param :id
    const mahberId: string = user?.mahber_id ?? request.params?.id;

    if (!user?.sub || !mahberId) {
      throw new ForbiddenException('Tenant context is missing');
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        member_id: user.sub,
        mahber_id: mahberId,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You are not a member of this organization',
      );
    }

    // Attach resolved mahber_id to request for downstream use
    request.mahber_id = mahberId;

    return true;
  }
}
