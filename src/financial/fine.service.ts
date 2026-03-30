import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, ViolationType, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from './ledger.service';

@Injectable()
export class FineService {
  private readonly logger = new Logger(FineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  // ─── Task 9.2 ────────────────────────────────────────────────────────────────

  /**
   * Deterministically calculate a fine amount.
   * percentage mode: amount = contributionAmount * penaltyRate / 100
   * fixed mode:      amount = penaltyRate
   */
  calculateFine(
    penaltyRate: number,
    contributionAmount: number,
    mode: 'percentage' | 'fixed',
  ): Prisma.Decimal {
    if (mode === 'percentage') {
      return new Prisma.Decimal(contributionAmount)
        .mul(new Prisma.Decimal(penaltyRate))
        .div(new Prisma.Decimal(100));
    }
    return new Prisma.Decimal(penaltyRate);
  }

  /**
   * Create a fine record and a corresponding ledger entry (debit).
   */
  async applyFine(
    mahberId: string,
    memberId: string,
    violationType: ViolationType,
    penaltyRate: number,
    contributionAmount: number,
    mode: 'percentage' | 'fixed',
    description: string,
    prismaClient?: Prisma.TransactionClient,
  ) {
    const amount = this.calculateFine(penaltyRate, contributionAmount, mode);
    const client = prismaClient ?? this.prisma;

    const fine = await client.fine.create({
      data: {
        mahber_id: mahberId,
        member_id: memberId,
        violation_type: violationType,
        amount,
      },
    });

    await this.ledger.createLedgerEntry(
      {
        mahber_id: mahberId,
        member_id: memberId,
        transaction_type: TransactionType.Fine,
        amount: amount.negated(),
        description,
        fine_id: fine.id,
      },
      prismaClient,
    );

    this.logger.log(
      `Fine applied: id=${fine.id} mahber=${mahberId} member=${memberId} amount=${amount} type=${violationType}`,
    );

    return fine;
  }

  // ─── Task 9.3 ────────────────────────────────────────────────────────────────

  async waiveFine(
    fineId: string,
    mahberId: string,
    actorId: string,
    reason: string,
  ) {
    const fine = await this.prisma.fine.findFirst({
      where: { id: fineId, mahber_id: mahberId },
    });

    if (!fine) {
      throw new NotFoundException('Fine not found');
    }

    if (fine.is_waived) {
      throw new ForbiddenException('Fine is already waived');
    }

    const updated = await this.prisma.fine.update({
      where: { id: fineId },
      data: {
        is_waived: true,
        waiver_reason: reason,
        waived_by: actorId,
        waived_at: new Date(),
      },
    });

    this.logger.log(
      `Fine waived: id=${fineId} mahber=${mahberId} actor=${actorId} reason="${reason}"`,
    );

    return updated;
  }

  async findAll(
    mahberId: string,
    memberId?: string,
    isWaived?: boolean,
  ) {
    const where: Prisma.FineWhereInput = { mahber_id: mahberId };
    if (memberId !== undefined) where.member_id = memberId;
    if (isWaived !== undefined) where.is_waived = isWaived;

    return this.prisma.fine.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
  }

  // ─── Task 9.4 ────────────────────────────────────────────────────────────────

  /**
   * Returns true if the member has unpaid (non-waived) fines whose total
   * exceeds the given threshold. Used for Equb lottery eligibility.
   */
  async hasUnpaidFinesExceedingThreshold(
    mahberId: string,
    memberId: string,
    threshold: number,
  ): Promise<boolean> {
    const result = await this.prisma.fine.aggregate({
      where: {
        mahber_id: mahberId,
        member_id: memberId,
        is_waived: false,
      },
      _sum: { amount: true },
    });

    const total = result._sum.amount ?? new Prisma.Decimal(0);
    return total.greaterThan(new Prisma.Decimal(threshold));
  }
}
