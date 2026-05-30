import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../membership/guards/role.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EventService } from './event.service';

@ApiTags('Invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('mahbers/:id')
export class InvitationController {
  constructor(private readonly eventService: EventService) {}

  @Get('my-invitations')
  @ApiOperation({ summary: 'Get my pending event invitations for this mahber' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiResponse({ status: 200, description: 'Pending invitations retrieved successfully' })
  getMyInvitations(
    @Param('id') mahberId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventService.getMyInvitations(mahberId, user.sub);
  }
}
