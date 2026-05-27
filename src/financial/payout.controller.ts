import {
  Controller,
  Get,
  Post,
  Param,
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
import { PayoutService } from './payout.service';
import { CreatePayoutDto } from './dto/create-payout.dto';

@ApiTags('Payouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mahbers/:id/payouts')
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  @Get()
  @ApiOperation({ summary: 'List all payouts for a mahber' })
  findAll(@Param('id') mahberId: string) {
    return this.payoutService.findAll(mahberId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get payout summary statistics' })
  getSummary(@Param('id') mahberId: string) {
    return this.payoutService.getSummary(mahberId);
  }

  @Get(':payoutId')
  @ApiOperation({ summary: 'Get a single payout by ID' })
  findOne(@Param('id') mahberId: string, @Param('payoutId') payoutId: string) {
    return this.payoutService.findOne(mahberId, payoutId);
  }

  @UseGuards(RoleGuard)
  @RequirePermission(PERMISSIONS.MANAGE_FINANCES)
  @Post()
  @ApiOperation({ summary: 'Create a new payout (treasurer/admin only)' })
  create(
    @Param('id') mahberId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePayoutDto,
  ) {
    return this.payoutService.create(mahberId, dto, user.sub);
  }
}
