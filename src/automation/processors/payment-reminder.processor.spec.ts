import { Test, TestingModule } from '@nestjs/testing';
import { MembershipStatus, PaymentStatus, PaymentType } from '@prisma/client';
import { PaymentReminderProcessor } from './payment-reminder.processor';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../communication/notification.service';

const mockPrisma = {
  mahber: {
    findMany: jest.fn(),
  },
  membership: {
    findMany: jest.fn(),
  },
  payment: {
    findFirst: jest.fn(),
  },
};

const mockNotificationService = {
  sendToUser: jest.fn(),
};

describe('PaymentReminderProcessor', () => {
  let processor: PaymentReminderProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentReminderProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    processor = module.get<PaymentReminderProcessor>(PaymentReminderProcessor);
    jest.clearAllMocks();
  });

  describe('process', () => {
    const mockJob = {
      id: 'job-2',
      name: 'payment-reminder',
      attemptsMade: 0,
      data: {},
    } as any;

    it('sends payment reminders when due date is in 3 days', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);

      mockPrisma.mahber.findMany.mockResolvedValue([
        {
          id: 'mahber-1',
          configuration: {
            payment_frequency: 'Monthly',
            contribution_amount: 500,
            next_payment_date: futureDate.toISOString(),
          },
        },
      ]);

      mockPrisma.membership.findMany.mockResolvedValue([
        { member_id: 'user-1' },
      ]);

      // No completed payment
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      await processor.process(mockJob);

      expect(mockNotificationService.sendToUser).toHaveBeenCalledWith(
        'user-1',
        'Payment Due in 3 Days',
        expect.stringContaining('500'),
        expect.objectContaining({
          mahberId: 'mahber-1',
          amount: '500',
          type: 'PAYMENT_REMINDER',
          payUrl: '/mahbers/mahber-1/pay',
        }),
      );
    });

    it('sends payment reminders when due date is in 1 day (tomorrow)', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      mockPrisma.mahber.findMany.mockResolvedValue([
        {
          id: 'mahber-1',
          configuration: {
            payment_frequency: 'Monthly',
            contribution_amount: 500,
            next_payment_date: futureDate.toISOString(),
          },
        },
      ]);

      mockPrisma.membership.findMany.mockResolvedValue([
        { member_id: 'user-1' },
      ]);

      mockPrisma.payment.findFirst.mockResolvedValue(null);

      await processor.process(mockJob);

      expect(mockNotificationService.sendToUser).toHaveBeenCalledWith(
        'user-1',
        'Payment Due Tomorrow',
        expect.stringContaining('500'),
        expect.objectContaining({
          mahberId: 'mahber-1',
          amount: '500',
          type: 'PAYMENT_REMINDER',
          payUrl: '/mahbers/mahber-1/pay',
        }),
      );
    });

    it('skips sending reminder if a payment is already completed for the period', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);

      mockPrisma.mahber.findMany.mockResolvedValue([
        {
          id: 'mahber-1',
          configuration: {
            payment_frequency: 'Monthly',
            contribution_amount: 500,
            next_payment_date: futureDate.toISOString(),
          },
        },
      ]);

      mockPrisma.membership.findMany.mockResolvedValue([
        { member_id: 'user-1' },
      ]);

      // Payment completed found
      mockPrisma.payment.findFirst.mockResolvedValue({ id: 'payment-1' });

      await processor.process(mockJob);

      expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    });

    it('skips sending reminder if due date is not 3 days or 1 day away', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5); // 5 days away

      mockPrisma.mahber.findMany.mockResolvedValue([
        {
          id: 'mahber-1',
          configuration: {
            payment_frequency: 'Monthly',
            contribution_amount: 500,
            next_payment_date: futureDate.toISOString(),
          },
        },
      ]);

      mockPrisma.membership.findMany.mockResolvedValue([
        { member_id: 'user-1' },
      ]);

      mockPrisma.payment.findFirst.mockResolvedValue(null);

      await processor.process(mockJob);

      expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    });
  });
});
