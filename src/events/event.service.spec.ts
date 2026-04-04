import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventService } from './event.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  event: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('EventService', () => {
  let service: EventService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EventService>(EventService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates and returns an event successfully', async () => {
      const dto = {
        title: 'Monthly Meeting',
        description: 'Regular meeting',
        event_type: 'Meeting',
        start_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 50 * 60 * 60 * 1000).toISOString(),
        location: 'Hall A',
        is_mandatory: true,
      };

      const created = { id: 'ev1', mahber_id: 'm1', ...dto };
      mockPrisma.event.create.mockResolvedValue(created);

      const result = await service.create('m1', 'actor1', dto as any);

      expect(result.id).toBe('ev1');
      expect(mockPrisma.event.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('throws BadRequestException when within 24h of start_time', async () => {
      // Event starts in 12 hours — within the 24h cutoff
      const startTime = new Date(Date.now() + 12 * 60 * 60 * 1000);
      const event = {
        id: 'ev1',
        mahber_id: 'm1',
        start_time: startTime,
        is_cancelled: false,
      };

      mockPrisma.event.findFirst.mockResolvedValue(event);

      await expect(
        service.update('m1', 'ev1', 'actor1', { title: 'Updated' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates event when more than 24h before start_time', async () => {
      // Event starts in 48 hours — outside the 24h cutoff
      const startTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const event = {
        id: 'ev1',
        mahber_id: 'm1',
        start_time: startTime,
        is_cancelled: false,
      };

      mockPrisma.event.findFirst.mockResolvedValue(event);
      mockPrisma.event.update.mockResolvedValue({ ...event, title: 'Updated' });

      const result = await service.update('m1', 'ev1', 'actor1', { title: 'Updated' } as any);

      expect(result.title).toBe('Updated');
    });

    it('throws NotFoundException when event does not exist', async () => {
      mockPrisma.event.findFirst.mockResolvedValue(null);

      await expect(
        service.update('m1', 'nonexistent', 'actor1', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
