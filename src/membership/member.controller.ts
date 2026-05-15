import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { MemberService } from './member.service';

@ApiTags('Membership')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mahbers/:id/members')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get()
  findAll(
    @Param('id') mahberId: string,
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.memberService.findAll(mahberId, user.sub, page, limit);
  }

  @Get(':memberId')
  findOne(
    @Param('id') mahberId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.memberService.findOne(mahberId, memberId, user.sub);
  }

  @Post(':memberId/suspend')
  suspend(
    @Param('id') mahberId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.memberService.suspend(mahberId, memberId, user.sub);
  }

  @Post(':memberId/reinstate')
  reinstate(
    @Param('id') mahberId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.memberService.reinstate(mahberId, memberId, user.sub);
  }
}
