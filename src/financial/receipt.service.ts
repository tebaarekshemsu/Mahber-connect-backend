import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class ReceiptService {
  private readonly logger = new Logger(ReceiptService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateReceiptBuffer(mahberId: string, paymentId: string): Promise<Buffer> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, mahber_id: mahberId },
    });

    if (!payment || payment.status !== 'Completed') {
      throw new NotFoundException(
        payment ? 'Receipt is only available for completed payments' : 'Payment not found',
      );
    }

    const [mahber, member, ledger] = await Promise.all([
      this.prisma.mahber.findUnique({ where: { id: mahberId } }),
      this.prisma.user.findUnique({ where: { id: payment.member_id } }),
      this.prisma.ledgerEntry.findFirst({
        where: { payment_id: paymentId },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    if (!mahber || !member) {
      throw new NotFoundException('Associated mahber or member not found');
    }

    return this.buildPdf(payment, mahber, member, ledger ?? null);
  }

  private buildPdf(
    payment: {
      id: string;
      tx_ref: string;
      chapa_reference: string | null;
      amount: { toNumber: () => number };
      payment_type: string;
      completed_at: Date | null;
      created_at: Date;
    },
    mahber: { name: string; type: string },
    member: { name: string; phone: string; email: string | null },
    ledger: { running_balance: { toNumber: () => number }; description: string } | null,
  ): Buffer {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const amount = Number(payment.amount);
    const balance = ledger ? Number(ledger.running_balance) : 0;
    const date = payment.completed_at ?? payment.created_at;
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('MahberConnect', { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#666').text('Digital Receipt', { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ddd').stroke();
    doc.moveDown();

    // Title
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#000').text('PAYMENT RECEIPT', { align: 'center' });
    doc.moveDown(1.5);

    // Receipt details
    const leftX = 50;
    const labelX = 200;
    const lineHeight = 20;

    let y = doc.y;

    const field = (label: string, value: string) => {
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#333').text(label, leftX, y);
      doc.font('Helvetica').fillColor('#000').text(value, labelX, y);
      y += lineHeight;
    };

    field('Receipt #:', payment.tx_ref.slice(0, 12).toUpperCase());
    if (payment.chapa_reference) {
      field('Chapa Ref:', payment.chapa_reference);
    }
    field('Date:', formattedDate);
    field('Organization:', mahber.name);
    field('Type:', mahber.type);
    y += 6;

    // Separator
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#eee').stroke();
    y += 10;

    field('Member:', member.name);
    field('Phone:', member.phone);
    if (member.email) field('Email:', member.email);
    y += 6;

    // Separator
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#eee').stroke();
    y += 10;

    // Payment breakdown
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text('Payment Breakdown', leftX, y);
    y += 22;

    const paymentType = payment.payment_type.charAt(0) + payment.payment_type.slice(1).toLowerCase();
    field('Payment Type:', paymentType);
    field('Amount:', `${amount.toFixed(2)} ETB`);

    if (ledger) {
      field('Running Balance:', `${balance.toFixed(2)} ETB`);
    }
    y += 6;

    // Bottom line
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').stroke();
    y += 14;

    // Total
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#B8860B').text(
      `Total Paid: ${amount.toFixed(2)} ETB`,
      leftX,
      y,
      { align: 'right' },
    );
    y += 30;

    // Footer
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').stroke();
    y += 10;
    doc.fontSize(8).font('Helvetica').fillColor('#999').text(
      'This is a computer-generated receipt. No signature is required.',
      leftX,
      y,
      { align: 'center' },
    );
    doc.fontSize(8).text(
      `Generated on ${new Date().toLocaleString()} | MahberConnect`,
      { align: 'center' },
    );

    doc.end();

    return Buffer.concat(chunks);
  }
}
