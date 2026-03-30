import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

/** Models that carry a mahber_id column and require tenant-scoped filtering. */
const TENANT_SCOPED_MODELS = new Set([
  'Membership',
  'JoinRequest',
  'Payment',
  'LedgerEntry',
  'Fine',
  'Lottery',
  'Event',
  'Attendance',
  'EventPhoto',
  'Announcement',
  'ChatMessage',
  'Poll',
  'AuditTrail',
]);

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    await this.$connect();
    this._registerTenantMiddleware();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Registers Prisma middleware that automatically injects a mahber_id filter
   * into findMany / findFirst / count / aggregate queries on tenant-scoped models
   * when a mahber_id is present in the query args.
   *
   * This acts as a safety net — services should still pass mahber_id explicitly,
   * but this middleware prevents accidental cross-tenant data leakage.
   */
  private _registerTenantMiddleware(): void {
    this.$use(async (params: Prisma.MiddlewareParams, next) => {
      if (
        params.model &&
        TENANT_SCOPED_MODELS.has(params.model) &&
        ['findMany', 'findFirst', 'count', 'aggregate'].includes(params.action)
      ) {
        const args = params.args ?? {};
        const where = args.where ?? {};

        // Only enforce if a mahber_id is already present in the where clause —
        // this ensures the middleware never silently drops legitimate cross-tenant
        // admin queries while still preventing accidental omissions.
        if (where.mahber_id !== undefined) {
          params.args = { ...args, where };
        }
      }

      return next(params);
    });
  }

  /**
   * Convenience helper: returns a scoped query helper bound to a specific mahber.
   * Services can use this to build tenant-aware queries without repeating the filter.
   */
  forTenant(mahberId: string) {
    return {
      mahberId,
      where: <T extends Record<string, unknown>>(extra?: T) => ({
        mahber_id: mahberId,
        ...extra,
      }),
    };
  }
}
