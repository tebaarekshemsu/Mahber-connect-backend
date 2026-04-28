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
import { PollService } from './poll.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { CastVoteDto } from './dto/cast-vote.dto';

@ApiTags('Communication')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('mahbers/:id/polls')
export class PollController {
  constructor(private readonly pollService: PollService) { }

  /** POST /mahbers/:id/polls — admin only (send_announcements permission) */
  @Post()
  @RequirePermission(PERMISSIONS.SEND_ANNOUNCEMENTS)
  create(
    @Param('id') mahberId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePollDto,
  ) {
    return this.pollService.create(mahberId, user.sub, dto);
  }

  /** GET /mahbers/:id/polls */
  @Get()
  findAll(
    @Param('id') mahberId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.pollService.findAll(
      mahberId,
      Math.max(1, parseInt(page, 10) || 1),
      Math.min(100, parseInt(limit, 10) || 20),
    );
  }

  /** POST /mahbers/:id/polls/:pollId/vote */
  @Post(':pollId/vote')
  castVote(
    @Param('id') mahberId: string,
    @Param('pollId') pollId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CastVoteDto,
  ) {
    return this.pollService.castVote(mahberId, pollId, user.sub, dto);
  }

  /** GET /mahbers/:id/polls/:pollId/results */
  @Get(':pollId/results')
  getResults(
    @Param('id') mahberId: string,
    @Param('pollId') pollId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.pollService.getResults(mahberId, pollId, user.sub);
  }
}
