import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MembershipStatus, NotificationType } from '@prisma/client';
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

  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
    type: NotificationType = NotificationType.info,
    link?: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notification_prefs: true },
    });

    if (!this.isNotificationEnabled(type, data?.type, user?.notification_prefs)) {
      return;
    }

    // Save in-app notification
    await this.prisma.notification.create({
      data: {
        user_id: userId,
        title,
        message: body,
        type,
        link,
      },
    });

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
    type: NotificationType = NotificationType.info,
    link?: string,
    excludeUserId?: string,
  ): Promise<void> {
    const memberships = await this.prisma.membership.findMany({
      where: { 
        mahber_id: mahberId, 
        status: MembershipStatus.Active,
        ...(excludeUserId && { member_id: { not: excludeUserId } }),
      },
      select: { member_id: true, user: { select: { notification_prefs: true } } },
    });

    if (memberships.length === 0) return;

    // Filter users based on their notification preferences
    const activeMembers = memberships.filter((m) => 
      this.isNotificationEnabled(type, data?.type, m.user?.notification_prefs)
    );

    if (activeMembers.length === 0) return;

    const userIds = activeMembers.map((m) => m.member_id);

    // Save in-app notifications in bulk
    await this.prisma.notification.createMany({
      data: userIds.map((userId: string) => ({
        user_id: userId,
        title,
        message: body,
        type,
        link,
      })),
    });

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

  /** Get all notifications for a user */
  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  /** Mark a specific notification as read */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.user_id !== userId) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { is_read: true },
    });
  }

  /** Mark all notifications as read for a user */
  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true },
    });
  }

  private isNotificationEnabled(type: NotificationType, customType?: string, prefs?: any): boolean {
    if (!prefs) return true; // Default is true

    if (type === NotificationType.payment) return prefs.payments !== false;
    if (type === NotificationType.event) return prefs.events !== false;
    if (customType === 'ANNOUNCEMENT') return prefs.announcements !== false;
    if (customType === 'CHAT') return prefs.chat !== false;

    return true; // Default for other types
  }

  private async getActiveTokensForUser(userId: string): Promise<string[]> {
    const records = await this.prisma.deviceToken.findMany({
      where: { user_id: userId, is_active: true },
      select: { token: true },
    });
    return records.map((r: { token: string }) => r.token);
  }
}
