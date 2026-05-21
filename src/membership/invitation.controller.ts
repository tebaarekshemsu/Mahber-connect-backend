import { Body, Controller, Get, Put, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { JoinRequestService } from './join-request.service';

@ApiTags('Invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invitations')
export class InvitationController {
  constructor(private readonly joinRequestService: JoinRequestService) {}

  @Get()
  @ApiOperation({ summary: 'Get all pending invitations for current user' })
  @ApiResponse({ status: 200, description: 'List of invitations' })
  getInvitations(@CurrentUser() user: JwtPayload) {
    return this.joinRequestService.getInvitationsForUser(user.sub);
  }

  @Put(':requestId/respond')
  @ApiOperation({ summary: 'Accept or reject an invitation' })
  @ApiResponse({ status: 200, description: 'Invitation response processed successfully' })
  respond(
    @Param('requestId') requestId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: { action: 'accept' | 'reject' },
  ) {
    return this.joinRequestService.respondToInvitation(requestId, user.sub, dto.action);
  }
}
