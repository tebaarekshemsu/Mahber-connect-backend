import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';

const mockPrisma = {
  membership: {
    findFirst: jest.fn(),
  },
  chatMessage: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockNotificationService = {
  sendToMahberMembers: jest.fn(),
};

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('throws ForbiddenException for non-Active member', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue(null);

      await expect(
        service.sendMessage('m1', 'sender1', { content: 'Hello' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates and returns message for Active member', async () => {
      mockPrisma.membership.findFirst.mockResolvedValue({
        id: 'mem1',
        status: MembershipStatus.Active,
      });
      mockPrisma.chatMessage.create.mockResolvedValue({
        id: 'msg1',
        content: 'Hello',
        sender_id: 'sender1',
        mahber_id: 'm1',
      });

      const result = await service.sendMessage('m1', 'sender1', { content: 'Hello' } as any);

      expect(result.id).toBe('msg1');
    });
  });

  describe('editMessage', () => {
    it('throws ForbiddenException after 5-minute edit window', async () => {
      // Message created 10 minutes ago
      const oldDate = new Date(Date.now() - 10 * 60 * 1000);
      mockPrisma.chatMessage.findFirst.mockResolvedValue({
        id: 'msg1',
        sender_id: 'sender1',
        mahber_id: 'm1',
        is_deleted: false,
        created_at: oldDate,
      });

      await expect(
        service.editMessage('m1', 'msg1', 'sender1', { content: 'Edited' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('edits message within 5-minute window', async () => {
      // Message created 1 minute ago
      const recentDate = new Date(Date.now() - 60 * 1000);
      mockPrisma.chatMessage.findFirst.mockResolvedValue({
        id: 'msg1',
        sender_id: 'sender1',
        mahber_id: 'm1',
        is_deleted: false,
        created_at: recentDate,
      });
      mockPrisma.chatMessage.update.mockResolvedValue({
        id: 'msg1',
        content: 'Edited',
      });

      const result = await service.editMessage('m1', 'msg1', 'sender1', { content: 'Edited' } as any);

      expect(result.content).toBe('Edited');
    });

    it('throws ForbiddenException when editing another user\'s message', async () => {
      const recentDate = new Date(Date.now() - 60 * 1000);
      mockPrisma.chatMessage.findFirst.mockResolvedValue({
        id: 'msg1',
        sender_id: 'other-user',
        mahber_id: 'm1',
        is_deleted: false,
        created_at: recentDate,
      });

      await expect(
        service.editMessage('m1', 'msg1', 'sender1', { content: 'Edited' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when message does not exist', async () => {
      mockPrisma.chatMessage.findFirst.mockResolvedValue(null);

      await expect(
        service.editMessage('m1', 'nonexistent', 'sender1', { content: 'Edited' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
