import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../membership/guards/role.guard';
import { RequirePermission } from '../membership/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PERMISSIONS } from '../membership/rbac/permissions';
import { LedgerService } from './ledger.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType } from '@prisma/client';

@ApiTags('Financial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mahbers/:id')
export class LedgerController {
  constructor(
    private readonly ledgerService: LedgerService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('ledger')
  getLedger(
    @Param('id') mahberId: string,
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('memberId') memberId?: string,
  ) {
    const targetMemberId = memberId ?? user.sub;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.ledgerService.getLedgerEntries(
      mahberId,
      targetMemberId,
      pageNum,
      limitNum,
      start,
      end,
    );
  }

  @Get('balance')
  async getBalance(
    @Param('id') mahberId: string,
    @CurrentUser() user: JwtPayload,
    @Query('memberId') memberId?: string,
  ) {
    const targetMemberId = memberId ?? user.sub;
    const balance = await this.ledgerService.getMemberBalance(mahberId, targetMemberId);
    return { balance: balance.toString() };
  }

  @UseGuards(RoleGuard)
  @RequirePermission(PERMISSIONS.MANAGE_FINANCES)
  @Get('reports/financial')
  async getFinancialReport(
    @Param('id') mahberId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const hasDateFilter = Object.keys(dateFilter).length > 0;

    const results = await this.prisma.ledgerEntry.groupBy({
      by: ['transaction_type'],
      where: {
        mahber_id: mahberId,
        ...(hasDateFilter ? { created_at: dateFilter } : {}),
      },
      _sum: { amount: true },
    });

    const sumByType = (type: TransactionType): string => {
      const entry = results.find((r: { transaction_type: TransactionType; _sum: { amount: unknown } }) => r.transaction_type === type);
      return (entry?._sum.amount ?? 0).toString();
    };

    const totalContributions = sumByType(TransactionType.Contribution);
    const totalFines = sumByType(TransactionType.Fine);
    const equbPayouts = parseFloat(sumByType(TransactionType.Equb_Payout));
    const iddirPayouts = parseFloat(sumByType(TransactionType.Iddir_Payout));
    const refunds = parseFloat(sumByType(TransactionType.Refund));
    const totalPayouts = (equbPayouts + iddirPayouts + refunds).toString();

    const netBalance = (
      parseFloat(totalContributions) +
      parseFloat(totalFines) -
      parseFloat(totalPayouts)
    ).toString();

    return {
      totalContributions,
      totalFines,
      totalPayouts,
      netBalance,
    };
  }
}
