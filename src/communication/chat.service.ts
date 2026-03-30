import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';

const EDIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly prisma: PrismaService) {}

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

    // Requirement 14.7 — offline notification stub
    this.logger.log(
      `[NOTIFICATION STUB] New chat message (id=${message.id}) in mahber ${mahberId} ` +
        `from sender ${senderId}. Notify offline recipients via push notification.`,
    );

    return message;
  }

  async findAll(mahberId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.chatMessage.findMany({
        where: { mahber_id: mahberId, is_deleted: false },
        orderBy: { created_at: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.chatMessage.count({
        where: { mahber_id: mahberId, is_deleted: false },
      }),
    ]);

    return {
      data,
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
}
