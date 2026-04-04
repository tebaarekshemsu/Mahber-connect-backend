import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, TransactionType } from '@prisma/client';
import { LedgerService } from './ledger.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  ledgerEntry: {
    findFirst: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

describe('LedgerService', () => {
  let service: LedgerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LedgerService>(LedgerService);
    jest.clearAllMocks();
  });

  describe('createLedgerEntry', () => {
    it('creates entry with correct running balance when no prior entries', async () => {
      mockPrisma.ledgerEntry.findFirst.mockResolvedValue(null);
      mockPrisma.ledgerEntry.create.mockResolvedValue({
        id: 'le1',
        running_balance: new Prisma.Decimal(100),
      });

      const data = {
        mahber_id: 'm1',
        member_id: 'mem1',
        transaction_type: TransactionType.Contribution,
        amount: new Prisma.Decimal(100),
        description: 'Monthly contribution',
      };

      await service.createLedgerEntry(data);

      expect(mockPrisma.ledgerEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            running_balance: new Prisma.Decimal(100),
          }),
        }),
      );
    });

    it('adds amount to previous running balance', async () => {
      mockPrisma.ledgerEntry.findFirst.mockResolvedValue({
        running_balance: new Prisma.Decimal(200),
      });
      mockPrisma.ledgerEntry.create.mockResolvedValue({
        id: 'le2',
        running_balance: new Prisma.Decimal(300),
      });

      const data = {
        mahber_id: 'm1',
        member_id: 'mem1',
        transaction_type: TransactionType.Contribution,
        amount: new Prisma.Decimal(100),
        description: 'Second contribution',
      };

      await service.createLedgerEntry(data);

      expect(mockPrisma.ledgerEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            running_balance: new Prisma.Decimal(300),
          }),
        }),
      );
    });
  });

  describe('getMemberBalance', () => {
    it('returns sum of amounts for the member', async () => {
      mockPrisma.ledgerEntry.aggregate.mockResolvedValue({
        _sum: { amount: new Prisma.Decimal(500) },
      });

      const balance = await service.getMemberBalance('m1', 'mem1');
      expect(balance.toNumber()).toBe(500);
    });

    it('returns zero when no entries exist', async () => {
      mockPrisma.ledgerEntry.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const balance = await service.getMemberBalance('m1', 'mem1');
      expect(balance.toNumber()).toBe(0);
    });
  });
});
