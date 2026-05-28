import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ExpenseCategory, ExpenseStatus, TransactionType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from './ledger.service';
import { AuditService } from '../audit/audit.service';
import { ChapaService } from './chapa.service';

@Injectable()
export class ExpenseService {
  private readonly logger = new Logger(ExpenseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    private readonly chapa: ChapaService,
  ) {}

  async create(
    mahberId: string,
    data: {
      amount: number;
      reason: string;
      category: ExpenseCategory;
      recipient_name: string;
      recipient_account_type: string;
      recipient_account: string;
      recipient_bank_code?: string;
    },
    createdBy: string,
  ) {
    const expense = await this.prisma.expense.create({
      data: {
        mahber_id: mahberId,
        amount: data.amount,
        reason: data.reason,
        category: data.category,
        status: ExpenseStatus.Pending,
        created_by: createdBy,
        recipient_name: data.recipient_name,
        recipient_account_type: data.recipient_account_type,
        recipient_account: data.recipient_account,
        recipient_bank_code: data.recipient_bank_code ?? null,
      },
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
        status: ExpenseStatus.Pending,
        recipient_name: data.recipient_name,
      },
    });

    this.logger.log(
      `Expense created (pending): id=${expense.id} mahber=${mahberId} amount=${data.amount} category=${data.category} by=${createdBy}`,
    );

    return expense;
  }

  async approve(expenseId: string, mahberId: string, approvedBy: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense || expense.mahber_id !== mahberId) {
      throw new BadRequestException('Expense not found');
    }

    if (expense.status !== ExpenseStatus.Pending) {
      throw new BadRequestException(
        `Expense is not pending. Current status: ${expense.status}`,
      );
    }

    const sumResult = await this.prisma.ledgerEntry.aggregate({
      where: { mahber_id: mahberId },
      _sum: { amount: true },
    });

    const currentBalance = sumResult._sum.amount ?? new Prisma.Decimal(0);
    if (currentBalance.lessThan(expense.amount)) {
      throw new BadRequestException(
        `Insufficient balance. Current balance is ${currentBalance} ETB, expense requires ${expense.amount} ETB.`,
      );
    }

    const transferRef = `EXP-${expenseId.slice(0, 8)}-${Date.now()}`;

    const rawBankCode = expense.recipient_bank_code;

    if (!rawBankCode) {
      throw new BadRequestException(
        `Missing recipient bank code for this expense. Please delete and recreate it with a valid bank.`,
      );
    }

    const bankCode = Number(rawBankCode);
    if (isNaN(bankCode)) {
      throw new BadRequestException(
        `Invalid recipient bank code: "${rawBankCode}". Please recreate the expense with a valid bank.`,
      );
    }

    this.logger.debug(
      `Calling Chapa transfer: recipient="${expense.recipient_name}" account="${expense.recipient_account}" bank_code=${bankCode} amount=${expense.amount}`,
    );

    const chapaResult = await this.chapa.initiateTransfer({
      account_name: expense.recipient_name,
      account_number: expense.recipient_account,
      amount: Number(expense.amount),
      reference: transferRef,
      bank_code: bankCode,
    });

    const updated = await this.prisma.expense.update({
      where: { id: expenseId },
      data: {
        status: ExpenseStatus.Paid,
        approved_by: approvedBy,
        approved_at: new Date(),
        chapa_transfer_ref: chapaResult.transfer_ref,
        chapa_transfer_status: chapaResult.status,
      },
    });

    const ledgerEntry = await this.ledger.createLedgerEntry({
      mahber_id: mahberId,
      member_id: approvedBy,
      transaction_type: TransactionType.Expense,
      amount: new Prisma.Decimal(Number(expense.amount)).negated(),
      description: `Expense: ${expense.reason} (${expense.category})`,
      expense_id: expense.id,
    });

    this.audit.logAuditEvent({
      mahber_id: mahberId,
      entity_type: 'expense',
      entity_id: expense.id,
      action: 'expense_approved',
      actor_id: approvedBy,
      old_value: { status: ExpenseStatus.Pending },
      new_value: {
        status: ExpenseStatus.Paid,
        approved_by: approvedBy,
        chapa_transfer_ref: chapaResult.transfer_ref,
        chapa_status: chapaResult.status,
        ledger_entry_id: ledgerEntry.id,
      },
    });

    this.logger.log(
      `Expense approved: id=${expense.id} amount=${expense.amount} chapa_ref=${chapaResult.transfer_ref} by=${approvedBy}`,
    );

    return updated;
  }

  async reject(
    expenseId: string,
    mahberId: string,
    approvedBy: string,
    reason: string,
  ) {
    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense || expense.mahber_id !== mahberId) {
      throw new BadRequestException('Expense not found');
    }

    if (expense.status !== ExpenseStatus.Pending) {
      throw new BadRequestException(
        `Expense is not pending. Current status: ${expense.status}`,
      );
    }

    const updated = await this.prisma.expense.update({
      where: { id: expenseId },
      data: {
        status: ExpenseStatus.Rejected,
        approved_by: approvedBy,
        approved_at: new Date(),
        rejection_reason: reason,
      },
    });

    this.audit.logAuditEvent({
      mahber_id: mahberId,
      entity_type: 'expense',
      entity_id: expense.id,
      action: 'expense_rejected',
      actor_id: approvedBy,
      old_value: { status: ExpenseStatus.Pending },
      new_value: { status: ExpenseStatus.Rejected, reason },
    });

    this.logger.log(
      `Expense rejected: id=${expense.id} by=${approvedBy} reason=${reason}`,
    );

    return updated;
  }

  async findAll(mahberId: string) {
    const data = await this.prisma.expense.findMany({
      where: { mahber_id: mahberId },
      orderBy: { created_at: 'desc' },
      include: {
        creator: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
      },
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

  async findPending(mahberId: string) {
    const data = await this.prisma.expense.findMany({
      where: { mahber_id: mahberId, status: ExpenseStatus.Pending },
      orderBy: { created_at: 'desc' },
      include: {
        creator: { select: { id: true, name: true } },
      },
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
