import { Test, TestingModule } from '@nestjs/testing';
import { MembershipStatus, ViolationType } from '@prisma/client';
import { FineCalculationProcessor } from './fine-calculation.processor';
import { PrismaService } from '../../prisma/prisma.service';
import { FineService } from '../../financial/fine.service';
import { NotificationService } from '../../communication/notification.service';

const mockPrisma = {
  mahber: {
    findMany: jest.fn(),
  },
  membership: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  ledgerEntry: {
    findFirst: jest.fn(),
  },
  fine: {
    findFirst: jest.fn(),
  },
};

const mockFineService = {
  applyFine: jest.fn(),
  hasUnpaidFinesExceedingThreshold: jest.fn(),
};

const mockNotificationService = {
  sendToUser: jest.fn(),
};

describe('FineCalculationProcessor', () => {
  let processor: FineCalculationProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FineCalculationProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FineService, useValue: mockFineService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    processor = module.get<FineCalculationProcessor>(FineCalculationProcessor);
    jest.clearAllMocks();
  });

  describe('process', () => {
    const mockJob = {
      id: 'job-1',
      name: 'fine-calculation',
      attemptsMade: 0,
      data: {},
    } as any;

    it('applies a fine when a contribution is missed and no fine was recently applied', async () => {
      mockPrisma.mahber.findMany.mockResolvedValue([
        {
          id: 'mahber-1',
          configuration: {
            payment_frequency: 'Monthly',
            contribution_amount: 500,
            penalty_rate: 50,
            penalty_mode: 'fixed',
            penalty_interval: '30d',
            max_fine_total: 1000,
          },
        },
      ]);

      mockPrisma.membership.findMany.mockResolvedValue([
        { id: 'mem-1', member_id: 'user-1' },
      ]);

      // No recent contribution
      mockPrisma.ledgerEntry.findFirst.mockResolvedValue(null);
      // No existing fine
      mockPrisma.fine.findFirst.mockResolvedValue(null);

      mockFineService.hasUnpaidFinesExceedingThreshold.mockResolvedValue(false);

      await processor.process(mockJob);

      expect(mockFineService.applyFine).toHaveBeenCalledWith(
        'mahber-1',
        'user-1',
        ViolationType.MISSED_PAYMENT,
        50,
        500,
        'fixed',
        expect.any(String),
      );
      expect(mockNotificationService.sendToUser).toHaveBeenCalledWith(
        'user-1',
        'Fine Applied',
        expect.any(String),
        expect.any(Object),
      );
    });

    it('does not apply a fine if a contribution exists after the overdue date', async () => {
      mockPrisma.mahber.findMany.mockResolvedValue([
        {
          id: 'mahber-1',
          configuration: {
            payment_frequency: 'Monthly',
            contribution_amount: 500,
            penalty_rate: 50,
            penalty_mode: 'fixed',
            penalty_interval: '30d',
          },
        },
      ]);

      mockPrisma.membership.findMany.mockResolvedValue([
        { id: 'mem-1', member_id: 'user-1' },
      ]);

      // Contribution found
      mockPrisma.ledgerEntry.findFirst.mockResolvedValue({ id: 'entry-1' });

      await processor.process(mockJob);

      expect(mockFineService.applyFine).not.toHaveBeenCalled();
    });

    it('does not apply a fine if a fine was already applied within the penalty interval', async () => {
      mockPrisma.mahber.findMany.mockResolvedValue([
        {
          id: 'mahber-1',
          configuration: {
            payment_frequency: 'Monthly',
            contribution_amount: 500,
            penalty_rate: 50,
            penalty_mode: 'fixed',
            penalty_interval: '30d',
          },
        },
      ]);

      mockPrisma.membership.findMany.mockResolvedValue([
        { id: 'mem-1', member_id: 'user-1' },
      ]);

      mockPrisma.ledgerEntry.findFirst.mockResolvedValue(null);
      // Fine applied 1 day ago (less than 30d interval)
      mockPrisma.fine.findFirst.mockResolvedValue({
        id: 'fine-1',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });

      await processor.process(mockJob);

      expect(mockFineService.applyFine).not.toHaveBeenCalled();
    });

    it('applies a repeated fine if the previous fine is older than the penalty interval', async () => {
      mockPrisma.mahber.findMany.mockResolvedValue([
        {
          id: 'mahber-1',
          configuration: {
            payment_frequency: 'Monthly',
            contribution_amount: 500,
            penalty_rate: 50,
            penalty_mode: 'fixed',
            penalty_interval: '30d',
          },
        },
      ]);

      mockPrisma.membership.findMany.mockResolvedValue([
        { id: 'mem-1', member_id: 'user-1' },
      ]);

      mockPrisma.ledgerEntry.findFirst.mockResolvedValue(null);
      // Fine applied 31 days ago (more than 30d interval)
      mockPrisma.fine.findFirst.mockResolvedValue({
        id: 'fine-1',
        created_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
      });

      await processor.process(mockJob);

      expect(mockFineService.applyFine).toHaveBeenCalled();
    });

    it('bans the member and sends a notification if unpaid fines exceed the max_fine_total', async () => {
      mockPrisma.mahber.findMany.mockResolvedValue([
        {
          id: 'mahber-1',
          configuration: {
            payment_frequency: 'Monthly',
            contribution_amount: 500,
            penalty_rate: 50,
            penalty_mode: 'fixed',
            penalty_interval: '30d',
            max_fine_total: 1000,
          },
        },
      ]);

      mockPrisma.membership.findMany.mockResolvedValue([
        { id: 'mem-1', member_id: 'user-1' },
      ]);

      mockPrisma.ledgerEntry.findFirst.mockResolvedValue(null);
      mockPrisma.fine.findFirst.mockResolvedValue(null);

      // Unpaid fines exceed threshold
      mockFineService.hasUnpaidFinesExceedingThreshold.mockResolvedValue(true);

      await processor.process(mockJob);

      expect(mockPrisma.membership.update).toHaveBeenCalledWith({
        where: { id: 'mem-1' },
        data: { status: MembershipStatus.Banned },
      });
      expect(mockNotificationService.sendToUser).toHaveBeenCalledWith(
        'user-1',
        'Membership Banned',
        expect.any(String),
        expect.any(Object),
      );
    });
  });
});
