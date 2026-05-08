import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../membership/guards/role.guard';
import { RequirePermission } from '../membership/decorators/require-permission.decorator';
import { PERMISSIONS } from '../membership/rbac/permissions';
import { LotteryService } from './lottery.service';
import { PrismaService } from '../prisma/prisma.service';

class ExecuteLotteryDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  operationalCostRate?: number = 0;

  @IsNumber()
  @Min(0)
  @IsOptional()
  fineThreshold?: number = 0;
}

@ApiTags('Financial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('mahbers/:id/lottery')
export class LotteryController {
  constructor(
    private readonly lotteryService: LotteryService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('history')
  @ApiOperation({ summary: 'Get lottery draw history for a mahber (Equb)' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  async getHistory(@Param('id') mahberId: string) {
    return this.prisma.lottery.findMany({
      where: { mahber_id: mahberId },
      orderBy: { created_at: 'desc' },
    });
  }

  @Post('execute')
  @RequirePermission(PERMISSIONS.MANAGE_FINANCES)
  @ApiOperation({ summary: 'Manually execute a lottery draw (Treasurer/Admin only)' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  async execute(@Param('id') mahberId: string, @Body() dto: ExecuteLotteryDto) {
    return this.lotteryService.executeLottery(
      mahberId,
      dto.operationalCostRate ?? 0,
      dto.fineThreshold ?? 0,
    );
  }
}
