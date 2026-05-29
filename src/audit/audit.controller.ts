import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../membership/guards/role.guard';
import { RequirePermission } from '../membership/decorators/require-permission.decorator';
import { TenantGuard } from '../membership/guards/tenant.guard';
import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RoleGuard)
@Controller('mahbers/:id/audit-trail')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermission('view_reports')
  @ApiOperation({ summary: 'Get audit trail for a mahber' })
  findAll(@Param('id') mahberId: string, @Query() query: QueryAuditDto) {
    return this.auditService.findAll(
      mahberId,
      query.page,
      query.limit,
      query.entity_type,
      query.actor_id,
      query.search,
      (query.sort || 'date') as 'date' | 'entity_type' | 'action',
      (query.order || 'desc') as 'asc' | 'desc',
      query.start_date ? new Date(query.start_date) : undefined,
      query.end_date ? new Date(query.end_date) : undefined,
    );
  }
}
