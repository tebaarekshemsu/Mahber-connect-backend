import { Test, TestingModule } from '@nestjs/testing';
import { MahberFinanceController } from './mahber-finance.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ChapaService } from './chapa.service';
import { ConfigService } from '@nestjs/config';
import { MembershipStatus } from '@prisma/client';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const mockPrisma = {
  mahber: {
    findUnique: jest.fn(),
  },
  membership: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  pendingPayment: {
    create: jest.fn(),
  },
  user: {
    findUniqueOrThrow: jest.fn(),
  },
  ledgerEntry: {
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
};

const mockChapa = {
  initializePayment: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'app.callbackUrl') return 'http://callback';
    if (key === 'app.returnUrl') return 'http://return';
    return null;
  }),
};

describe('MahberFinanceController', () => {
  let controller: MahberFinanceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MahberFinanceController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ChapaService, useValue: mockChapa },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    controller = module.get<MahberFinanceController>(MahberFinanceController);
    jest.clearAllMocks();
  });

  describe('joinMahber', () => {
    const mockUserPayload = { sub: 'user1', phone: '123' };

    it('throws NotFoundException if Mahber is not found', async () => {
      mockPrisma.mahber.findUnique.mockResolvedValue(null);

      await expect(
        controller.joinMahber('m1', mockUserPayload as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if user is already an active member', async () => {
      mockPrisma.mahber.findUnique.mockResolvedValue({ id: 'm1', is_public: true });
      mockPrisma.membership.findFirst.mockResolvedValue({ status: MembershipStatus.Active });

      await expect(
        controller.joinMahber('m1', mockUserPayload as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException if private Mahber has no existing approved request', async () => {
      mockPrisma.mahber.findUnique.mockResolvedValue({ id: 'm1', is_public: false });
      mockPrisma.membership.findFirst.mockResolvedValue(null);

      await expect(
        controller.joinMahber('m1', mockUserPayload as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('initiates Chapa payment if join fee is required', async () => {
      mockPrisma.mahber.findUnique.mockResolvedValue({
        id: 'm1',
        name: 'Mahber Test',
        is_public: true,
        configuration: {
          join_fee_required: true,
          join_fee_amount: 150,
        },
      });
      mockPrisma.membership.findFirst.mockResolvedValue(null);
      mockPrisma.pendingPayment.create.mockResolvedValue({ id: 'p1', amount: new Prisma.Decimal(150) });
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ name: 'Tebarek', email: 'tebarek@gmail.com' });
      mockChapa.initializePayment.mockResolvedValue({ checkout_url: 'http://checkout-url' });
      mockPrisma.membership.create.mockResolvedValue({ id: 'mem1' });

      const result = await controller.joinMahber('m1', mockUserPayload as any);

      expect(result).toEqual({
        paymentRequired: true,
        amount: 150,
        currency: 'ETB',
        paymentUrl: 'http://checkout-url',
        token: 'p1',
      });
      expect(mockPrisma.pendingPayment.create).toHaveBeenCalled();
      expect(mockChapa.initializePayment).toHaveBeenCalled();
    });

    it('immediately activates membership if no join fee is required', async () => {
      mockPrisma.mahber.findUnique.mockResolvedValue({
        id: 'm1',
        is_public: true,
        configuration: {
          join_fee_required: false,
        },
      });
      mockPrisma.membership.findFirst.mockResolvedValue(null);
      mockPrisma.membership.create.mockResolvedValue({ id: 'mem1', status: MembershipStatus.Active });

      const result = await controller.joinMahber('m1', mockUserPayload as any);

      expect(result).toEqual({
        paymentRequired: false,
        message: 'Successfully joined Mahber',
        active: true,
      });
      expect(mockPrisma.membership.create).toHaveBeenCalled();
    });
  });

  describe('payRecurring', () => {
    const mockUserPayload = { sub: 'user1', phone: '123' };

    it('initiates recurring payment successfully', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue({ status: MembershipStatus.Active });
      mockPrisma.mahber.findUnique.mockResolvedValue({
        id: 'm1',
        name: 'Mahber Test',
        configuration: {
          contribution_amount: 500,
        },
      });
      mockPrisma.pendingPayment.create.mockResolvedValue({ id: 'pp1', amount: new Prisma.Decimal(500) });
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ name: 'Tebarek', email: 'tebarek@gmail.com' });
      mockChapa.initializePayment.mockResolvedValue({ checkout_url: 'http://checkout-recurring' });

      const result = await controller.payRecurring('m1', mockUserPayload as any);

      expect(result).toEqual({
        checkout_url: 'http://checkout-recurring',
        payment_id: 'pp1',
      });
    });
  });

  describe('wallet', () => {
    it('aggregates wallet ledger entries and returns sum total balance', async () => {
      mockPrisma.ledgerEntry.findMany.mockResolvedValue([
        { amount: new Prisma.Decimal(500), transaction_type: 'Contribution' },
        { amount: new Prisma.Decimal(-50), transaction_type: 'Fine' },
      ]);
      mockPrisma.ledgerEntry.aggregate.mockResolvedValue({
        _sum: { amount: new Prisma.Decimal(450) },
      });

      const result = await controller.getWallet('m1', 'user1');

      expect(result.balance).toBe('450');
      expect(result.entries).toHaveLength(2);
    });
  });
});
