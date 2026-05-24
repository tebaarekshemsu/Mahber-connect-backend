import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface LogAuditEventDto {
  mahber_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates an immutable audit record. Never throws — failures are logged only
   * so that audit logging never disrupts the primary operation.
   */
  async logAuditEvent(data: LogAuditEventDto): Promise<void> {
    try {
      await this.prisma.auditTrail.create({
        data: {
          mahber_id: data.mahber_id,
          entity_type: data.entity_type,
          entity_id: data.entity_id,
          action: data.action,
          actor_id: data.actor_id ?? null,
          old_value: (data.old_value as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          new_value: (data.new_value as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          metadata: (data.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        },
      });
    } catch (err) {
      this.logger.error('Failed to write audit event', err);
    }
  }

  async findAll(
    mahberId: string,
    page: number = 1,
    limit: number = 20,
    entityType?: string,
    actorId?: string,
    search?: string,
    sort: 'date' | 'entity_type' | 'action' = 'date',
    order: 'asc' | 'desc' = 'desc',
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: Prisma.AuditTrailWhereInput = { mahber_id: mahberId };

    if (entityType) where.entity_type = entityType;
    if (actorId) where.actor_id = actorId;

    if (search) {
      where.OR = [
        { entity_type: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { entity_id: { contains: search, mode: 'insensitive' } },
        { actor: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) (where.created_at as Prisma.DateTimeFilter).gte = startDate;
      if (endDate) (where.created_at as Prisma.DateTimeFilter).lte = endDate;
    }

    const skip = (page - 1) * limit;

    const orderBy: Prisma.AuditTrailOrderByWithRelationInput =
      sort === 'entity_type'
        ? { entity_type: order }
        : sort === 'action'
          ? { action: order }
          : { created_at: order };

    const [data, total] = await Promise.all([
      this.prisma.auditTrail.findMany({
        where,
        include: {
          actor: {
            select: { id: true, name: true }
          }
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.auditTrail.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
