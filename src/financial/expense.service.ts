import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ExpenseCategory, TransactionType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from './ledger.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ExpenseService {
  private readonly logger = new Logger(ExpenseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
  ) {}

  async create(
    mahberId: string,
    data: { amount: number; reason: string; category: ExpenseCategory },
    createdBy: string,
  ) {
    const sumResult = await this.prisma.ledgerEntry.aggregate({
      where: { mahber_id: mahberId },
      _sum: { amount: true },
    });

    const currentBalance = sumResult._sum.amount ?? new Prisma.Decimal(0);
    if (currentBalance.lessThan(data.amount)) {
      throw new BadRequestException(
        `Insufficient balance. Current balance is ${currentBalance} ETB, expense requires ${data.amount} ETB.`,
      );
    }

    const expense = await this.prisma.expense.create({
      data: {
        mahber_id: mahberId,
        amount: data.amount,
        reason: data.reason,
        category: data.category,
        created_by: createdBy,
      },
    });

    const ledgerEntry = await this.ledger.createLedgerEntry({
      mahber_id: mahberId,
      member_id: createdBy,
      transaction_type: TransactionType.Expense,
      amount: new Prisma.Decimal(data.amount).negated(),
      description: `Expense: ${data.reason} (${data.category})`,
      expense_id: expense.id,
    });

    this.audit.logAuditEvent({
      mahber_id: mahberId,
      entity_type: 'expense',
      entity_id: expense.id,
      action: 'expense_created',
      actor_id: createdBy,
      new_value: {
        amount: data.amount,
        reason: data.reason,
        category: data.category,
        ledger_entry_id: ledgerEntry.id,
      },
    });

    this.logger.log(
      `Expense created: id=${expense.id} mahber=${mahberId} amount=${data.amount} category=${data.category} by=${createdBy}`,
    );

    return expense;
  }

  async findAll(mahberId: string) {
    const data = await this.prisma.expense.findMany({
      where: { mahber_id: mahberId },
      orderBy: { created_at: 'desc' },
    });

    return {
      data,
      meta: {
        total: data.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    };
  }
}
