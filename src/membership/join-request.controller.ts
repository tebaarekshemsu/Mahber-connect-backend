import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { JoinRequestService } from './join-request.service';
import { CreateJoinRequestDto } from './dto/create-join-request.dto';
import { ProcessJoinRequestDto } from './dto/process-join-request.dto';

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
