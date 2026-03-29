import { Module } from '@nestjs/common';
import { MahberController } from './mahber.controller';
import { MahberService } from './mahber.service';
import { StateMachineService } from './state-machine.service';
import { JoinRequestController } from './join-request.controller';
import { JoinRequestService } from './join-request.service';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { RoleGuard } from './guards/role.guard';

@Module({
  controllers: [MahberController, JoinRequestController, MemberController, RoleController],
  providers: [MahberService, StateMachineService, JoinRequestService, MemberService, RoleService, RoleGuard],
  exports: [MahberService, StateMachineService, JoinRequestService, MemberService, RoleService, RoleGuard],
})
export class MembershipModule {}
