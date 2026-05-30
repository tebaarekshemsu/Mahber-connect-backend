import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from './guards/role.guard';
import { RequirePermission } from './decorators/require-permission.decorator';
import { PERMISSIONS } from './rbac/permissions';
import { DEFAULT_ROLES } from './rbac/roles';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleService } from './role.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateCustomRoleDto } from './dto/create-custom-role.dto';

@ApiTags('Membership')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mahbers/:id')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get('roles')
  @UseGuards(RoleGuard)
  @RequirePermission(PERMISSIONS.MANAGE_ROLES)
  @ApiOperation({ summary: 'List predefined mahber roles and permissions' })
  listRoles() {
    return Object.values(DEFAULT_ROLES);
  }

  @Put('members/:memberId/role')
  assignRole(
    @Param('id') mahberId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AssignRoleDto,
  ) {
    return this.roleService.assignRole(mahberId, memberId, user.sub, dto);
  }

  @Post('roles')
  createCustomRole(
    @Param('id') mahberId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCustomRoleDto,
  ) {
    return this.roleService.createCustomRole(mahberId, user.sub, dto);
  }
}
