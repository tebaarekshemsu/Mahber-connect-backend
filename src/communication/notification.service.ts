import { Injectable, Logger } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from './firebase.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseService,
  ) {}

  /** Register or update a device token for a user. */
  async registerDevice(userId: string, token: string, platform: string): Promise<void> {
    await this.prisma.deviceToken.upsert({
      where: { token },
      update: { user_id: userId, platform, is_active: true },
      create: { user_id: userId, token, platform, is_active: true },
    });
    this.logger.log(`Device registered for user ${userId} (platform: ${platform})`);
  }

  /** Mark a device token as inactive for a user. */
  async unregisterDevice(userId: string, token: string): Promise<void> {
    await this.prisma.deviceToken.updateMany({
      where: { user_id: userId, token },
      data: { is_active: false },
    });
    this.logger.log(`Device unregistered for user ${userId}`);
  }

  /** Send a push notification to all active devices of a user. */
  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    const tokens = await this.getActiveTokensForUser(userId);
    if (tokens.length === 0) return;

    const result = await this.firebase.sendToMultipleDevices(tokens, title, body, data);
    this.logger.log(
      `Notification sent to user ${userId}: ${result.successCount} success, ${result.failureCount} failed`,
    );
  }

  /** Send a push notification to all active members of a Mahber. */
  async sendToMahberMembers(
    mahberId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    const memberships = await this.prisma.membership.findMany({
      where: { mahber_id: mahberId, status: MembershipStatus.Active },
      select: { member_id: true },
    });

    if (memberships.length === 0) return;

    const userIds = memberships.map((m: { member_id: string }) => m.member_id);

    const deviceTokens = await this.prisma.deviceToken.findMany({
      where: { user_id: { in: userIds }, is_active: true },
      select: { token: true },
    });

    const tokens = deviceTokens.map((d: { token: string }) => d.token);
    if (tokens.length === 0) return;

    const result = await this.firebase.sendToMultipleDevices(tokens, title, body, data);
    this.logger.log(
      `Notification sent to mahber ${mahberId} members: ${result.successCount} success, ${result.failureCount} failed`,
    );
  }

  private async getActiveTokensForUser(userId: string): Promise<string[]> {
    const records = await this.prisma.deviceToken.findMany({
      where: { user_id: userId, is_active: true },
      select: { token: true },
    });
    return records.map((r: { token: string }) => r.token);
  }
}
