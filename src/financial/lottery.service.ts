import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from './ledger.service';
import { FineService } from './fine.service';

export interface LotteryResult {
  lotteryId: string;
  mahberId: string;
  winnerId: string;
  eligibleMembers: string[];
  randomSeed: string;
  payoutAmount: Prisma.Decimal;
  createdAt: Date;
}

@Injectable()
export class LotteryService {
  private readonly logger = new Logger(LotteryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly fineService: FineService,
  ) {}

  /**
   * Execute a lottery draw for the given mahber.
   *
   * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
   *
   * @param mahberId           - The mahber to run the draw for
   * @param operationalCostRate - Percentage (0-100) deducted from the pot as operational costs
   * @param fineThreshold       - Members with unpaid fines above this amount are excluded
   */
  async executeLottery(
    mahberId: string,
    operationalCostRate: number,
    fineThreshold: number,
    executedBy: string,
  ): Promise<LotteryResult> {
    // 1. Get all Active members
    const activeMembers = await this.prisma.membership.findMany({
      where: { mahber_id: mahberId, status: 'Active' },
      select: { member_id: true, has_won_current_cycle: true },
    });

    if (activeMembers.length === 0) {
      throw new BadRequestException('No active members for the lottery draw');
    }

    // 2. Check ALL active members have paid their contribution since last draw
    const lastDraw = await this.prisma.lottery.findFirst({
      where: { mahber_id: mahberId },
      orderBy: { created_at: 'desc' },
      select: { created_at: true },
    });

    const mahber = await this.prisma.mahber.findUnique({
      where: { id: mahberId },
      select: { created_at: true },
    });

    const sinceDate = lastDraw?.created_at ?? mahber!.created_at;

    const unpaidMemberIds: string[] = [];
    for (const member of activeMembers) {
      const paid = await this.prisma.payment.findFirst({
        where: {
          mahber_id: mahberId,
          member_id: member.member_id,
          payment_type: 'Contribution',
          status: 'Completed',
          created_at: { gte: sinceDate },
        },
      });
      if (!paid) unpaidMemberIds.push(member.member_id);
    }

    if (unpaidMemberIds.length > 0) {
      const unpaidUsers = await this.prisma.user.findMany({
        where: { id: { in: unpaidMemberIds } },
        select: { name: true },
      });
      const names = unpaidUsers.map((u) => u.name).join(', ');
      throw new BadRequestException(
        `Lottery cannot be drawn: the following members have not paid their contribution: ${names}`,
      );
    }

    // 3. Exclude members who have already won this cycle (Req 9.3)
    const notYetWon = activeMembers.filter((m) => !m.has_won_current_cycle);

    // 4. Exclude members with unpaid fines exceeding threshold (Req 9.4)
    const eligibilityChecks = await Promise.all(
      notYetWon.map(async (m) => {
        const ineligible = await this.fineService.hasUnpaidFinesExceedingThreshold(
          mahberId,
          m.member_id,
          fineThreshold,
        );
        return { member_id: m.member_id, ineligible };
      }),
    );

    const eligibleMemberIds = eligibilityChecks
      .filter((c) => !c.ineligible)
      .map((c) => c.member_id);

    if (eligibleMemberIds.length === 0) {
      throw new BadRequestException('No eligible members for the lottery draw');
    }

    // 5. Generate cryptographically secure random seed (Req 9.2)
    const seedBuffer = crypto.randomBytes(32);
    const randomSeed = seedBuffer.toString('hex');

    // 6. Deterministic winner selection: seed (as BigInt) % eligibleMembers.length
    const seedBigInt = BigInt('0x' + randomSeed);
    const winnerIndex = Number(seedBigInt % BigInt(eligibleMemberIds.length));
    const winnerId = eligibleMemberIds[winnerIndex];

    // 7. Calculate payout: sum of all Contribution ledger entries minus operational costs (Req 9.5)
    const contributionSum = await this.prisma.ledgerEntry.aggregate({
      where: {
        mahber_id: mahberId,
        transaction_type: TransactionType.Contribution,
      },
      _sum: { amount: true },
    });

    const totalContributions = contributionSum._sum.amount ?? new Prisma.Decimal(0);
    const operationalCost = totalContributions
      .mul(new Prisma.Decimal(operationalCostRate))
      .div(new Prisma.Decimal(100));
    const payoutAmount = totalContributions.sub(operationalCost);

    // 8. Persist lottery record, payout ledger entry, expense record, and winner flag atomically
    const lottery = await this.prisma.$transaction(async (tx) => {
      // Create Lottery record
      const lotteryRecord = await tx.lottery.create({
        data: {
          mahber_id: mahberId,
          winner_id: winnerId,
          eligible_members: eligibleMemberIds,
          random_seed: randomSeed,
          payout_amount: payoutAmount,
        },
      });

      // Create Equb_Payout ledger entry for winner (negative amount = expense/debit)
      await this.ledger.createLedgerEntry(
        {
          mahber_id: mahberId,
          member_id: winnerId,
          transaction_type: TransactionType.Equb_Payout,
          amount: payoutAmount.negated(),
          description: `Equb payout from lottery draw ${lotteryRecord.id}`,
          lottery_id: lotteryRecord.id,
        },
        tx,
      );

      // Fetch winner's name for the expense record
      const winnerUser = await tx.user.findUnique({
        where: { id: winnerId },
        select: { name: true },
      });

      // Create Expense record so Equb payout appears in the expenses list
      await tx.expense.create({
        data: {
          mahber_id: mahberId,
          amount: payoutAmount,
          reason: `Equb lottery payout to ${winnerUser?.name ?? winnerId} (draw ${lotteryRecord.id})`,
          category: 'Equb_Payout',
          status: 'Paid',
          created_by: executedBy,
          recipient_name: winnerUser?.name ?? 'Equb Winner',
          recipient_account_type: 'internal',
          recipient_account: 'Equb Payout',
          recipient_bank_code: null,
        },
      });

      // Mark winner's has_won_current_cycle = true
      await tx.membership.updateMany({
        where: { mahber_id: mahberId, member_id: winnerId },
        data: { has_won_current_cycle: true },
      });

      return lotteryRecord;
    });

    const result: LotteryResult = {
      lotteryId: lottery.id,
      mahberId,
      winnerId,
      eligibleMembers: eligibleMemberIds,
      randomSeed,
      payoutAmount,
      createdAt: lottery.created_at,
    };

    // 9. Audit trail log (Req 9.6)
    this.logger.log(
      `[AUDIT] Lottery draw completed: ` +
        `lotteryId=${result.lotteryId} ` +
        `mahberId=${mahberId} ` +
        `winnerId=${winnerId} ` +
        `eligibleCount=${eligibleMemberIds.length} ` +
        `payoutAmount=${payoutAmount.toFixed(2)} ` +
        `randomSeed=${randomSeed} ` +
        `createdAt=${result.createdAt.toISOString()}`,
    );

    // 10. Notify all members (stub – FCM will be added later) (Req 9.7)
    this.notifyMembers(mahberId, result);

    return result;
  }

  /**
   * Stub notification method – logs for now; FCM integration will be added later.
   * Requirement 9.7
   */
  private notifyMembers(mahberId: string, result: LotteryResult): void {
    this.logger.log(
      `[NOTIFY] Lottery result for mahber ${mahberId}: ` +
        `winner=${result.winnerId} payout=${result.payoutAmount.toFixed(2)}`,
    );
  }
}
