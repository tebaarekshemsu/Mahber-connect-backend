import { Module } from '@nestjs/common';
import { MahberController } from './mahber.controller';
import { MahberService } from './mahber.service';
import { StateMachineService } from './state-machine.service';
import { JoinRequestController } from './join-request.controller';
import { JoinRequestService } from './join-request.service';
import { InvitationController } from './invitation.controller';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { RoleGuard } from './guards/role.guard';
import { TenantGuard } from './guards/tenant.guard';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [
    MahberController,
    JoinRequestController,
    InvitationController,
    MemberController,
    RoleController,
  ],
  providers: [MahberService, StateMachineService, JoinRequestService, MemberService, RoleService, RoleGuard, TenantGuard],
  exports: [MahberService, StateMachineService, JoinRequestService, MemberService, RoleService, RoleGuard, TenantGuard],
})
export class MembershipModule {}
