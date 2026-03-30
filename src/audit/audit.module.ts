import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { RoleGuard } from '../membership/guards/role.guard';
import { TenantGuard } from '../membership/guards/tenant.guard';

@Module({
  controllers: [AuditController],
  providers: [AuditService, RoleGuard, TenantGuard],
  exports: [AuditService],
})
export class AuditModule {}
