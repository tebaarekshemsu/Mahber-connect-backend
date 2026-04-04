import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { FineService } from './fine.service';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from './ledger.service';

const mockPrisma = {
  fine: {
    aggregate: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockLedger = {
  createLedgerEntry: jest.fn(),
};

describe('FineService', () => {
  let service: FineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FineService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LedgerService, useValue: mockLedger },
      ],
    }).compile();

    service = module.get<FineService>(FineService);
    jest.clearAllMocks();
  });

  describe('calculateFine', () => {
    it('calculates fine in percentage mode', () => {
      const result = service.calculateFine(10, 500, 'percentage');
      expect(result.toNumber()).toBe(50);
    });

    it('calculates fine in fixed mode', () => {
      const result = service.calculateFine(100, 500, 'fixed');
      expect(result.toNumber()).toBe(100);
    });
  });

  describe('hasUnpaidFinesExceedingThreshold', () => {
    it('returns true when total unpaid fines exceed threshold', async () => {
      mockPrisma.fine.aggregate.mockResolvedValue({
        _sum: { amount: new Prisma.Decimal(200) },
      });

      const result = await service.hasUnpaidFinesExceedingThreshold('m1', 'mem1', 100);
      expect(result).toBe(true);
    });

    it('returns false when total unpaid fines are below threshold', async () => {
      mockPrisma.fine.aggregate.mockResolvedValue({
        _sum: { amount: new Prisma.Decimal(50) },
      });

      const result = await service.hasUnpaidFinesExceedingThreshold('m1', 'mem1', 100);
      expect(result).toBe(false);
    });

    it('returns false when there are no unpaid fines', async () => {
      mockPrisma.fine.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await service.hasUnpaidFinesExceedingThreshold('m1', 'mem1', 0);
      expect(result).toBe(false);
    });
  });
});
