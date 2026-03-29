import { Body, Controller, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleService } from './role.service';
import { AssignRoleDto } from './dto/assign-role.dto';

@UseGuards(JwtAuthGuard)
@Controller('mahbers/:id/members')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Put(':memberId/role')
  assignRole(
    @Param('id') mahberId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AssignRoleDto,
  ) {
    return this.roleService.assignRole(mahberId, memberId, user.sub, dto);
  }
}
