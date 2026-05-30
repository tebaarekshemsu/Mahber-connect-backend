import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MembershipStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { MarkMessagesReadDto } from './dto/mark-messages-read.dto';
import { NotificationService } from './notification.service';
import { CommunicationGateway } from './communication.gateway';

const EDIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly gateway: CommunicationGateway,
  ) {}

  async sendMessage(mahberId: string, senderId: string, dto: SendMessageDto) {
    // Requirement 14.2 — must have Active membership
    const membership = await this.prisma.membership.findFirst({
      where: { mahber_id: mahberId, member_id: senderId, status: MembershipStatus.Active },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Only Active members can send messages in this organization',
      );
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        mahber_id: mahberId,
        sender_id: senderId,
        content: dto.content,
      },
    });

    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { name: true },
    });
    const senderName = sender?.name || 'A member';

    await this.notificationService.sendToMahberMembers(
      mahberId,
      `New message in chat`,
      `${senderName}: ${dto.content}`,
      { type: 'CHAT', messageId: message.id },
      NotificationType.info,
      `/mahbers/${mahberId}/chat`,
      senderId,
    );

    // Emit event via WebSocket to the Mahber room
    const messageWithSender = { ...message, sender: { name: senderName } };
    this.gateway.server.to(`mahber_${mahberId}`).emit('new_message', messageWithSender);

    return message;
  }

  async findAll(mahberId: string, page: number, limit: number, currentUserId?: string) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.chatMessage.findMany({
        where: { mahber_id: mahberId, is_deleted: false },
        orderBy: { created_at: 'asc' },
        skip,
        take: limit,
        include: {
          read_receipts: {
            select: { member_id: true, read_at: true },
          },
        },
      }),
      this.prisma.chatMessage.count({
        where: { mahber_id: mahberId, is_deleted: false },
      }),
    ]);

    // Enrich each message with read count and is_read_by_me flag
    const enriched = data.map((msg) => {
      const { read_receipts, ...rest } = msg;
      return {
        ...rest,
        read_by_count: read_receipts.length,
        is_read_by_me: currentUserId
          ? read_receipts.some((r) => r.member_id === currentUserId)
          : false,
      };
    });

    return {
      data: enriched,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async editMessage(
    mahberId: string,
    messageId: string,
    senderId: string,
    dto: EditMessageDto,
  ) {
    const message = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, mahber_id: mahberId },
    });

    if (!message || message.is_deleted) {
      throw new NotFoundException('Message not found');
    }

    if (message.sender_id !== senderId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    // Requirement 14.4 — 5-minute edit window
    const ageMs = Date.now() - message.created_at.getTime();
    if (ageMs > EDIT_WINDOW_MS) {
      throw new ForbiddenException('Messages can only be edited within 5 minutes of sending');
    }

    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { content: dto.content, edited_at: new Date() },
    });
  }

  async deleteMessage(mahberId: string, messageId: string, actorId: string) {
    const message = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, mahber_id: mahberId },
    });

    if (!message || message.is_deleted) {
      throw new NotFoundException('Message not found');
    }

    // Requirement 14.5 — sender or admin can delete
    const isSender = message.sender_id === actorId;

    if (!isSender) {
      const membership = await this.prisma.membership.findFirst({
        where: { mahber_id: mahberId, member_id: actorId },
      });

      if (!membership) {
        throw new ForbiddenException('You are not a member of this organization');
      }

      const role = membership.role as { name: string; permissions: string[] };
      const isAdmin = role?.permissions?.includes('manage_members');

      if (!isAdmin) {
        throw new ForbiddenException('Only the sender or an admin can delete messages');
      }
    }

    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { is_deleted: true },
    });
  }

  // ── Read Receipts ──────────────────────────────────────────────────────────

  async markMessagesRead(
    mahberId: string,
    memberId: string,
    dto: MarkMessagesReadDto,
  ) {
    // Verify active membership
    const membership = await this.prisma.membership.findFirst({
      where: { mahber_id: mahberId, member_id: memberId, status: MembershipStatus.Active },
    });
    if (!membership) {
      throw new ForbiddenException('You must be an active member to mark messages as read');
    }

    // Filter to only messages that belong to this mahber and aren't the sender's own
    const messages = await this.prisma.chatMessage.findMany({
      where: {
        id: { in: dto.message_ids },
        mahber_id: mahberId,
        is_deleted: false,
        sender_id: { not: memberId }, // Don't create receipts for your own messages
      },
      select: { id: true },
    });

    if (messages.length === 0) {
      return { marked: 0 };
    }

    const validIds = messages.map((m) => m.id);

    // Upsert read receipts (skip duplicates via onConflict)
    let createdCount = 0;
    for (const msgId of validIds) {
      try {
        await this.prisma.chatReadReceipt.create({
          data: {
            message_id: msgId,
            member_id: memberId,
          },
        });
        createdCount++;
      } catch (err: any) {
        // P2002 = unique constraint violation → already read, skip
        if (err?.code !== 'P2002') throw err;
      }
    }

    // Broadcast read receipt event via WebSocket so senders see it in real-time
    this.gateway.server.to(`mahber_${mahberId}`).emit('messages_read', {
      reader_id: memberId,
      message_ids: validIds,
      read_at: new Date().toISOString(),
    });

    return { marked: createdCount };
  }

  async getReadReceipts(mahberId: string, messageId: string) {
    const message = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, mahber_id: mahberId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const receipts = await this.prisma.chatReadReceipt.findMany({
      where: { message_id: messageId },
      orderBy: { read_at: 'asc' },
    });

    // Batch-fetch user names
    const memberIds = receipts.map((r) => r.member_id);
    const users = await this.prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    return receipts.map((r) => ({
      member_id: r.member_id,
      member_name: userMap.get(r.member_id) ?? 'Unknown',
      read_at: r.read_at,
    }));
  }

  async getUnreadCount(mahberId: string, memberId: string) {
    // Count messages in this mahber that: (1) are not deleted, (2) were not sent by this member,
    // (3) do NOT have a read receipt from this member.
    const count = await this.prisma.chatMessage.count({
      where: {
        mahber_id: mahberId,
        is_deleted: false,
        sender_id: { not: memberId },
        read_receipts: {
          none: { member_id: memberId },
        },
      },
    });

    return { unread_count: count };
  }
}
