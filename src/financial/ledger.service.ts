import { Injectable } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as PDFDocument from 'pdfkit';

export interface CreateLedgerEntryData {
  mahber_id: string;
  member_id: string;
  transaction_type: TransactionType;
  amount: Prisma.Decimal;
  description: string;
  payment_id?: string;
  fine_id?: string;
  lottery_id?: string;
  expense_id?: string;
  payout_id?: string;
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
        expense_id: data.expense_id ?? null,
        payout_id: data.payout_id ?? null,
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

  async exportCsv(
    mahberId: string,
    filters: { startDate?: Date; endDate?: Date; type?: string },
  ): Promise<string> {
    const where: Prisma.LedgerEntryWhereInput = { mahber_id: mahberId };

    if (filters.startDate || filters.endDate) {
      where.created_at = {};
      if (filters.startDate) where.created_at.gte = filters.startDate;
      if (filters.endDate) where.created_at.lte = filters.endDate;
    }

    if (filters.type && filters.type !== 'All') {
      where.transaction_type = filters.type as TransactionType;
    }

    const entries = await this.prisma.ledgerEntry.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    const escapeCsv = (val: unknown): string => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = ['Date', 'Transaction Type', 'Member ID', 'Amount', 'Running Balance', 'Description'];
    const rows = entries.map((e) =>
      [
        e.created_at.toISOString(),
        e.transaction_type,
        e.member_id,
        e.amount.toString(),
        e.running_balance.toString(),
        e.description,
      ]
        .map(escapeCsv)
        .join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }

  async exportFinancialReportPdf(
    mahberId: string,
    mahberName: string,
    filters: { startDate?: Date; endDate?: Date },
  ): Promise<Buffer> {
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (filters.startDate) dateFilter.gte = filters.startDate;
    if (filters.endDate) dateFilter.lte = filters.endDate;
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    const [summary, entries] = await Promise.all([
      this.prisma.ledgerEntry.groupBy({
        by: ['transaction_type'],
        where: {
          mahber_id: mahberId,
          ...(hasDateFilter ? { created_at: dateFilter } : {}),
        },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.findMany({
        where: {
          mahber_id: mahberId,
          ...(hasDateFilter ? { created_at: dateFilter } : {}),
        },
        orderBy: { created_at: 'desc' },
        take: 200,
      }),
    ]);

    const sumByType = (type: TransactionType): number => {
      const entry = summary.find((r) => r.transaction_type === type);
      return entry ? Number(entry._sum.amount) : 0;
    };

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const totalContributions = sumByType(TransactionType.Contribution);
    const totalFines = sumByType(TransactionType.Fine);
    const totalExpenses = sumByType(TransactionType.Expense);
    const totalPayouts =
      sumByType(TransactionType.Equb_Payout) +
      sumByType(TransactionType.Iddir_Payout) +
      sumByType(TransactionType.Payout);
    const netBalance = totalContributions + totalFines - totalPayouts - totalExpenses;

    const dateRangeLabel =
      filters.startDate && filters.endDate
        ? `${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}`
        : 'All time';

    const leftMargin = 50;
    let y = 50;

    const writeText = (text: string, opts: { size?: number; bold?: boolean; color?: string } = {}) => {
      const fontSize = opts.size ?? 12;
      const font = opts.bold ? 'Helvetica-Bold' : 'Helvetica';
      doc.font(font).fontSize(fontSize);
      if (opts.color) doc.fillColor(opts.color);
      doc.text(text, leftMargin, y, { width: 495 });
      y += fontSize * 1.5;
      doc.fillColor('#000000');
    };

    writeText('Financial Report', { size: 22, bold: true });
    writeText(mahberName, { size: 14, color: '#666666' });
    writeText(`Period: ${dateRangeLabel}`, { size: 11, color: '#999999' });
    y += 10;

    doc.moveTo(leftMargin, y).lineTo(545, y).strokeColor('#cccccc').stroke();
    y += 20;

    writeText('Summary', { size: 16, bold: true });
    writeText(`Total Contributions:   ${totalContributions.toFixed(2)} ETB`);
    writeText(`Total Fines:          ${totalFines.toFixed(2)} ETB`);
    writeText(`Total Payouts:        ${totalPayouts.toFixed(2)} ETB`);
    writeText(`Total Expenses:       ${totalExpenses.toFixed(2)} ETB`);
    y += 5;
    writeText(`Net Balance:          ${netBalance.toFixed(2)} ETB`, { bold: true, color: netBalance >= 0 ? '#15803d' : '#dc2626' });
    y += 10;

    doc.moveTo(leftMargin, y).lineTo(545, y).strokeColor('#cccccc').stroke();
    y += 20;

    writeText('Recent Transactions', { size: 16, bold: true });

    const tableTop = y;
    const colWidths = [90, 80, 70, 75, 160];
    const headers = ['Date', 'Type', 'Amount', 'Balance', 'Description'];

    doc.font('Helvetica-Bold').fontSize(8);
    let x = leftMargin;
    headers.forEach((h, i) => {
      doc.text(h, x, tableTop, { width: colWidths[i], align: 'left' });
      x += colWidths[i];
    });
    y = tableTop + 14;

    doc.moveTo(leftMargin, y - 4).lineTo(leftMargin + colWidths.reduce((a, b) => a + b, 0), y - 4).strokeColor('#cccccc').stroke();

    doc.font('Helvetica').fontSize(7);
    for (const entry of entries.slice(0, 100)) {
      if (y > 750) {
        doc.addPage();
        y = 50;
      }

      x = leftMargin;
      const dateStr = entry.created_at.toISOString().split('T')[0];
      const amountStr = Number(entry.amount).toFixed(2);
      const balanceStr = Number(entry.running_balance).toFixed(2);

      doc.text(dateStr, x, y, { width: colWidths[0], align: 'left' }); x += colWidths[0];
      doc.text(entry.transaction_type, x, y, { width: colWidths[1], align: 'left' }); x += colWidths[1];
      doc.text(amountStr, x, y, { width: colWidths[2], align: 'left' }); x += colWidths[2];
      doc.text(balanceStr, x, y, { width: colWidths[3], align: 'left' }); x += colWidths[3];
      doc.text(entry.description.substring(0, 60), x, y, { width: colWidths[4], align: 'left' }); x += colWidths[4];

      y += 12;
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
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
