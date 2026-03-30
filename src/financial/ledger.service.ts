import { Injectable } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateLedgerEntryData {
  mahber_id: string;
  member_id: string;
  transaction_type: TransactionType;
  amount: Prisma.Decimal;
  description: string;
  payment_id?: string;
  fine_id?: string;
  lottery_id?: string;
}

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async createLedgerEntry(
    data: CreateLedgerEntryData,
    prismaClient?: Prisma.TransactionClient,
  ) {
    const client = prismaClient ?? this.prisma;

    // Get the last entry's running balance for this member in this mahber
    const lastEntry = await client.ledgerEntry.findFirst({
      where: { mahber_id: data.mahber_id, member_id: data.member_id },
      orderBy: { created_at: 'desc' },
      select: { running_balance: true },
    });

    const previousBalance = lastEntry?.running_balance ?? new Prisma.Decimal(0);
    const running_balance = previousBalance.add(data.amount);

    return client.ledgerEntry.create({
      data: {
        mahber_id: data.mahber_id,
        member_id: data.member_id,
        transaction_type: data.transaction_type,
        amount: data.amount,
        running_balance,
        description: data.description,
        payment_id: data.payment_id ?? null,
        fine_id: data.fine_id ?? null,
        lottery_id: data.lottery_id ?? null,
      },
    });
  }

  async getMemberBalance(mahberId: string, memberId: string): Promise<Prisma.Decimal> {
    const result = await this.prisma.ledgerEntry.aggregate({
      where: { mahber_id: mahberId, member_id: memberId },
      _sum: { amount: true },
    });

    return result._sum.amount ?? new Prisma.Decimal(0);
  }

  async getLedgerEntries(
    mahberId: string,
    memberId: string,
    page: number = 1,
    limit: number = 20,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: Prisma.LedgerEntryWhereInput = {
      mahber_id: mahberId,
      member_id: memberId,
    };

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = startDate;
      if (endDate) where.created_at.lte = endDate;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.ledgerEntry.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
