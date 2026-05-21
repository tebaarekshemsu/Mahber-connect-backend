import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { JoinRequestService } from './join-request.service';
import { CreateJoinRequestDto } from './dto/create-join-request.dto';
import { ProcessJoinRequestDto } from './dto/process-join-request.dto';

@ApiTags('Membership')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mahbers/:id/join-requests')
export class JoinRequestController {
  constructor(private readonly joinRequestService: JoinRequestService) {}

  @Post()
  create(
    @Param('id') mahberId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateJoinRequestDto,
  ) {
    return this.joinRequestService.create(mahberId, user.sub, dto);
  }

  @Get()
  findAll(@Param('id') mahberId: string, @CurrentUser() user: JwtPayload) {
    return this.joinRequestService.findAll(mahberId, user.sub);
  }

  @Post('invite')
  invite(
    @Param('id') mahberId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: { phone: string },
  ) {
    return this.joinRequestService.invite(mahberId, user.sub, dto.phone);
  }

  @Put(':requestId')
  processRequest(
    @Param('id') mahberId: string,
    @Param('requestId') requestId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ProcessJoinRequestDto,
  ) {
    return this.joinRequestService.processRequest(mahberId, requestId, user.sub, dto);
  }
}
