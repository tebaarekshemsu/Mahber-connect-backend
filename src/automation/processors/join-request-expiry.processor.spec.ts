import { Test, TestingModule } from '@nestjs/testing';
import { JoinRequestStatus } from '@prisma/client';
import { JoinRequestExpiryProcessor } from './join-request-expiry.processor';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  joinRequest: {
    updateMany: jest.fn(),
  },
};

describe('JoinRequestExpiryProcessor', () => {
  let processor: JoinRequestExpiryProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JoinRequestExpiryProcessor,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    processor = module.get<JoinRequestExpiryProcessor>(JoinRequestExpiryProcessor);
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('invalidates expired pending join requests', async () => {
      mockPrisma.joinRequest.updateMany.mockResolvedValue({ count: 3 });

      const mockJob = {
        id: 'job-1',
        name: 'join-request-expiry',
        attemptsMade: 0,
        data: {},
      } as any;

      await processor.process(mockJob);

      expect(mockPrisma.joinRequest.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: JoinRequestStatus.Pending,
            created_at: expect.objectContaining({ lt: expect.any(Date) }),
          }),
          data: { status: JoinRequestStatus.Invalidated },
        }),
      );
    });

    it('calls updateMany with a cutoff date 7 days in the past', async () => {
      mockPrisma.joinRequest.updateMany.mockResolvedValue({ count: 0 });

      const before = new Date();
      const mockJob = { id: 'job-2', name: 'expiry', attemptsMade: 0, data: {} } as any;

      await processor.process(mockJob);

      const callArgs = mockPrisma.joinRequest.updateMany.mock.calls[0][0];
      const cutoff: Date = callArgs.where.created_at.lt;

      const sevenDaysAgo = new Date(before.getTime() - 7 * 24 * 60 * 60 * 1000);
      // Allow 1 second tolerance
      expect(Math.abs(cutoff.getTime() - sevenDaysAgo.getTime())).toBeLessThan(1000);
    });
  });
});
