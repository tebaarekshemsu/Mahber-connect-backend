import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../membership/guards/role.guard';
import { RequirePermission } from '../membership/decorators/require-permission.decorator';
import { PERMISSIONS } from '../membership/rbac/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AnnouncementService } from './announcement.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@ApiTags('Communication')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('mahbers/:id/announcements')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) { }

  @Post()
  @RequirePermission(PERMISSIONS.SEND_ANNOUNCEMENTS)
  create(
    @Param('id') mahberId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.announcementService.create(mahberId, user.sub, dto);
  }

  @Get()
  findAll(
    @Param('id') mahberId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.announcementService.findAll(
      mahberId,
      Math.max(1, parseInt(page, 10) || 1),
      Math.min(100, parseInt(limit, 10) || 20),
    );
  }

  @Post(':announcementId/read')
  markAsRead(
    @Param('id') _mahberId: string,
    @Param('announcementId') announcementId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.announcementService.markAsRead(announcementId, user.sub);
  }
}
