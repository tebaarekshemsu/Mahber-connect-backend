import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PayoutCategory, TransactionType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from './ledger.service';
import { AuditService } from '../audit/audit.service';
import { CreatePayoutDto } from './dto/create-payout.dto';

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
  ) {}

  async create(mahberId: string, dto: CreatePayoutDto, approvedBy: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { mahber_id: mahberId, member_id: dto.member_id, status: 'Active' },
    });

    if (!membership) {
      throw new BadRequestException('Recipient must be an active member of this mahber');
    }

    const sumResult = await this.prisma.ledgerEntry.aggregate({
      where: { mahber_id: mahberId },
      _sum: { amount: true },
    });

    const currentBalance = sumResult._sum.amount ?? new Prisma.Decimal(0);
    if (currentBalance.lessThan(dto.amount)) {
      throw new BadRequestException(
        `Insufficient balance. Current balance is ${currentBalance} ETB, payout requires ${dto.amount} ETB.`,
      );
    }

    const payout = await this.prisma.payout.create({
      data: {
        mahber_id: mahberId,
        member_id: dto.member_id,
        amount: dto.amount,
        category: dto.category,
        reason: dto.reason,
        approved_by: approvedBy,
      },
    });

    const transactionType = this.mapCategoryToTransactionType(dto.category);

    const ledgerEntry = await this.ledger.createLedgerEntry({
      mahber_id: mahberId,
      member_id: dto.member_id,
      transaction_type: transactionType,
      amount: new Prisma.Decimal(dto.amount),
      description: `Payout: ${dto.reason} (${dto.category})`,
      payout_id: payout.id,
    });

    await this.prisma.payout.update({
      where: { id: payout.id },
      data: { paid_at: new Date() },
    });

    this.audit.logAuditEvent({
      mahber_id: mahberId,
      entity_type: 'payout',
      entity_id: payout.id,
      action: 'payout_created',
      actor_id: approvedBy,
      new_value: {
        member_id: dto.member_id,
        amount: dto.amount,
        category: dto.category,
        reason: dto.reason,
        ledger_entry_id: ledgerEntry.id,
      },
    });

    this.logger.log(
      `Payout created: id=${payout.id} mahber=${mahberId} member=${dto.member_id} amount=${dto.amount} category=${dto.category} by=${approvedBy}`,
    );

    return payout;
  }

  async findAll(mahberId: string) {
    const data = await this.prisma.payout.findMany({
      where: { mahber_id: mahberId },
      orderBy: { created_at: 'desc' },
      include: { member: { select: { id: true, name: true, phone: true } } },
    });

    return {
      data,
      meta: { total: data.length, page: 1, limit: 20, totalPages: 1 },
    };
  }

  async findOne(mahberId: string, payoutId: string) {
    const payout = await this.prisma.payout.findFirst({
      where: { id: payoutId, mahber_id: mahberId },
      include: { member: { select: { id: true, name: true, phone: true } } },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    return payout;
  }

  async getSummary(mahberId: string) {
    const [totalPayouts, categoryBreakdown, recentPayouts] = await Promise.all([
      this.prisma.payout.aggregate({
        where: { mahber_id: mahberId },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payout.groupBy({
        by: ['category'],
        where: { mahber_id: mahberId },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payout.findMany({
        where: { mahber_id: mahberId },
        orderBy: { created_at: 'desc' },
        take: 5,
        include: { member: { select: { id: true, name: true } } },
      }),
    ]);

    return {
      total_amount: totalPayouts._sum.amount ?? 0,
      total_count: totalPayouts._count,
      category_breakdown: categoryBreakdown.map((c) => ({
        category: c.category,
        amount: c._sum.amount ?? 0,
        count: c._count,
      })),
      recent: recentPayouts,
    };
  }

  private mapCategoryToTransactionType(category: PayoutCategory): TransactionType {
    switch (category) {
      case PayoutCategory.Iddir_Benefit:
        return TransactionType.Iddir_Payout;
      default:
        return TransactionType.Payout;
    }
  }
}
