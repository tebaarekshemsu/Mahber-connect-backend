import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ChapaService } from './chapa.service';
import { ConfigService } from '@nestjs/config';
import { MembershipStatus, Prisma } from '@prisma/client';
import { addFrequency } from '../common/utils/date.utils';
import { PaymentService } from './payment.service';

@ApiTags('Financial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mahbers/:id')
export class MahberFinanceController {
  private readonly logger = new Logger(MahberFinanceController.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly chapa: ChapaService,
    private readonly config: ConfigService,
    private readonly paymentService: PaymentService,
  ) {}

  @Post('join')
  @ApiOperation({ summary: 'Join a Mahber and initiate payment if join fee is required' })
  async joinMahber(
    @Param('id') mahberId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const userId = user.sub;

    const mahber = await this.prisma.mahber.findUnique({
      where: { id: mahberId },
    });
    if (!mahber) {
      throw new NotFoundException('Mahber not found');
    }

    // Check if membership already exists for the user
    let membership = await this.prisma.membership.findFirst({
      where: { mahber_id: mahberId, member_id: userId },
    });

    if (membership) {
      if (membership.status === MembershipStatus.Active) {
        throw new BadRequestException('You are already an active member of this Mahber.');
      }
      if (membership.status === MembershipStatus.Banned) {
        throw new ForbiddenException('You have been banned from this Mahber.');
      }
    } else {
      // If no membership exists, they can only join if it is a public Mahber
      if (!mahber.is_public) {
        throw new ForbiddenException(
          'This is a private Mahber. You must be invited or approved by an admin first.',
        );
      }
    }

    const config = mahber.configuration as {
      join_fee_required?: boolean;
      join_fee_amount?: number;
      payment_frequency?: string;
    } | null;

    const joinFeeRequired = config?.join_fee_required ?? false;
    const joinFeeAmount = config?.join_fee_amount ?? 0;

    if (joinFeeRequired && joinFeeAmount > 0) {
      // Create a PendingPayment
      const pendingPayment = await this.prisma.pendingPayment.create({
        data: {
          mahber_id: mahberId,
          member_id: userId,
          amount: new Prisma.Decimal(joinFeeAmount),
          status: 'pending',
        },
      });

      // Get user details
      const userRecord = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });
      const nameParts = (userRecord.name || 'Unknown User').split(' ');
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || 'User';
      const email = userRecord.email || `${userId}@mahberconnect.com`;

      // Call Chapa to initialize payment
      const callbackUrl =
        this.config.get<string>('app.callbackUrl') ??
        ' https://minute-worldcat-flexible-warm.trycloudflare.com/payment/callback';
      const returnUrl =
        this.config.get<string>('app.returnUrl') ??
        ' https://minute-worldcat-flexible-warm.trycloudflare.com/payment/return';

      this.logger.log(`Chapa init (join) - callbackUrl=${callbackUrl} returnUrl=${returnUrl} tx_ref=${pendingPayment.id}`);
      const chapaResult = await this.chapa.initializePayment({
        tx_ref: pendingPayment.id,
        amount: joinFeeAmount,
        currency: 'ETB',
        email,
        first_name: firstName,
        last_name: lastName,
        callback_url: callbackUrl,
        return_url: returnUrl,
        customization: {
          title: `Join ${mahber.name}`,
          description: `Join fee for ${mahber.name}`,
        },
        metadata: {
          mahber_id: mahberId,
          member_id: userId,
          payment_type: 'JoinFee',
          amount: joinFeeAmount,
        },
      });

      // If they didn't have a membership, create one as Payment_Required
      if (!membership) {
        membership = await this.prisma.membership.create({
          data: {
            mahber_id: mahberId,
            member_id: userId,
            status: MembershipStatus.Payment_Required,
            role: { name: 'Member', permissions: [] },
          },
        });
      }

      return {
        paymentRequired: true,
        amount: joinFeeAmount,
        currency: 'ETB',
        paymentUrl: chapaResult.checkout_url,
        token: pendingPayment.id,
      };
    } else {
      // No join fee required: activate membership immediately!
      const nextPaymentDue = addFrequency(new Date(), config?.payment_frequency);

      if (membership) {
        await this.prisma.membership.update({
          where: { id: membership.id },
          data: {
            status: MembershipStatus.Active,
            joined_at: new Date(),
            activation_date: new Date(),
            next_payment_due: nextPaymentDue,
          },
        });
      } else {
        await this.prisma.membership.create({
          data: {
            mahber_id: mahberId,
            member_id: userId,
            status: MembershipStatus.Active,
            role: { name: 'Member', permissions: [] },
            joined_at: new Date(),
            activation_date: new Date(),
            next_payment_due: nextPaymentDue,
          },
        });
      }

      return {
        paymentRequired: false,
        message: 'Successfully joined Mahber',
        active: true,
      };
    }
  }

  @Post('pay')
  @ApiOperation({ summary: 'Initiate a recurring contribution payment' })
  async payRecurring(
    @Param('id') mahberId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.paymentService.initiatePayment(mahberId, user.sub, {
      fine_ids: [],
    });

    return {
      checkout_url: result.checkout_url,
      payment_id: result.tx_ref,
    };
  }

  @Get('wallet')
  @ApiOperation({ summary: 'Get wallet history (ledger entries) and total balance for the Mahber' })
  async getWallet(
    @Param('id') mahberId: string,
    @Query('memberId') memberId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.LedgerEntryWhereInput = { mahber_id: mahberId };
    if (memberId) {
      where.member_id = memberId;
    }

    const [entries, sumResult] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.ledgerEntry.aggregate({
        where,
        _sum: { amount: true },
      }),
    ]);

    const balance = sumResult._sum.amount ?? new Prisma.Decimal(0);

    return {
      entries,
      balance: balance.toString(),
    };
  }
}
