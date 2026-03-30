import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../membership/guards/role.guard';
import { RequirePermission } from '../membership/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PERMISSIONS } from '../membership/rbac/permissions';
import { FineService } from './fine.service';
import { IsString, IsNotEmpty } from 'class-validator';

class WaiveFineDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

@ApiTags('Fines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mahbers/:id/fines')
export class FineController {
  constructor(private readonly fineService: FineService) {}

  @Get()
  @ApiOperation({ summary: 'List fines for a mahber' })
  findAll(
    @Param('id') mahberId: string,
    @Query('memberId') memberId?: string,
    @Query('isWaived') isWaived?: string,
  ) {
    const isWaivedBool =
      isWaived === 'true' ? true : isWaived === 'false' ? false : undefined;

    return this.fineService.findAll(mahberId, memberId, isWaivedBool);
  }

  @UseGuards(RoleGuard)
  @RequirePermission(PERMISSIONS.MANAGE_FINANCES)
  @Post(':fineId/waive')
  @ApiOperation({ summary: 'Waive a fine (treasurer only)' })
  waiveFine(
    @Param('id') mahberId: string,
    @Param('fineId') fineId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: WaiveFineDto,
  ) {
    return this.fineService.waiveFine(fineId, mahberId, user.sub, dto.reason);
  }
}
