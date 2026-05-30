import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { SuperAdminService } from './super-admin.service';
import {
  UpdateMahberStatusDto,
  UpdateUserStatusDto,
  PromoteUserDto,
  SuperAdminQueryDto,
} from './dto/super-admin.dto';

@ApiTags('Super Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get global dashboard statistics' })
  getStats() {
    return this.superAdminService.getDashboardStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'List and search system users' })
  findAllUsers(@Query() query: SuperAdminQueryDto) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    return this.superAdminService.findAllUsers(page, limit, query.search);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get detailed profile of a system user' })
  findOneUser(@Param('id') id: string) {
    return this.superAdminService.findOneUser(id);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Suspend or unsuspend a user account' })
  updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.superAdminService.updateUserStatus(id, dto.is_suspended);
  }

  @Patch('users/:id/super-admin')
  @ApiOperation({ summary: 'Promote or demote a user to/from Super Admin status' })
  promoteUser(
    @Param('id') id: string,
    @Body() dto: PromoteUserDto,
  ) {
    return this.superAdminService.promoteUser(id, dto.is_super_admin);
  }

  @Get('mahbers')
  @ApiOperation({ summary: 'List and search all Mahbers' })
  findAllMahbers(@Query() query: SuperAdminQueryDto) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    return this.superAdminService.findAllMahbers(page, limit, query.search);
  }

  @Get('mahbers/:id')
  @ApiOperation({ summary: 'Get detailed information about a Mahber' })
  findOneMahber(@Param('id') id: string) {
    return this.superAdminService.findOneMahber(id);
  }

  @Patch('mahbers/:id/status')
  @ApiOperation({ summary: 'Suspend or unsuspend a Mahber' })
  updateMahberStatus(
    @Param('id') id: string,
    @Body() dto: UpdateMahberStatusDto,
  ) {
    return this.superAdminService.updateMahberStatus(id, dto.is_suspended);
  }

  @Get('payments')
  @ApiOperation({ summary: 'View all transactions across the entire platform' })
  findAllPayments(@Query() query: SuperAdminQueryDto) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    return this.superAdminService.findAllPayments(page, limit, query.search);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Monitor system-wide action audit trail logs' })
  findAllAuditLogs(@Query() query: SuperAdminQueryDto) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    return this.superAdminService.findAllAuditLogs(page, limit);
  }
}
