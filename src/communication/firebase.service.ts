import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: admin.app.App | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    const projectId = this.config.get<string>('firebase.projectId');
    const privateKey = this.config.get<string>('firebase.privateKey');
    const clientEmail = this.config.get<string>('firebase.clientEmail');

    if (!projectId || !privateKey || !clientEmail) {
      this.logger.warn('Firebase credentials not fully configured — FCM disabled');
      return;
    }

    // Avoid re-initializing if already initialized (e.g. in tests)
    if (admin.apps.length > 0) {
      this.app = admin.apps[0]!;
      return;
    }

    this.app = admin.initializeApp({
      credential: admin.credential.cert({ projectId, privateKey, clientEmail }),
    });

    this.logger.log('Firebase Admin SDK initialized');
  }

  /** Send FCM notification to a single device token. */
  async sendToDevice(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    if (!this.app) {
      this.logger.warn('[FCM] Firebase not initialized — skipping sendToDevice');
      return false;
    }

    try {
      await admin.messaging(this.app).send({
        token,
        notification: { title, body },
        data,
      });
      return true;
    } catch (err: any) {
      this.logger.error(`[FCM] sendToDevice failed for token ${token}: ${err?.message}`);
      if (this.isInvalidTokenError(err)) {
        await this.removeInvalidToken(token);
      }
      return false;
    }
  }

  /** Send FCM notification to multiple device tokens. */
  async sendToMultipleDevices(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ successCount: number; failureCount: number }> {
    if (!this.app || tokens.length === 0) {
      return { successCount: 0, failureCount: tokens.length };
    }

    const messaging = admin.messaging(this.app);
    const BATCH_SIZE = 500; // FCM multicast limit
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batch = tokens.slice(i, i + BATCH_SIZE);
      try {
        const response = await messaging.sendEachForMulticast({
          tokens: batch,
          notification: { title, body },
          data,
        });

        successCount += response.successCount;
        failureCount += response.failureCount;

        // Remove invalid tokens
        const invalidTokens: string[] = [];
        response.responses.forEach((res: admin.messaging.SendResponse, idx: number) => {
          if (!res.success && this.isInvalidTokenError(res.error)) {
            invalidTokens.push(batch[idx]);
          }
        });

        for (const t of invalidTokens) {
          await this.removeInvalidToken(t);
        }
      } catch (err: any) {
        this.logger.error(`[FCM] sendToMultipleDevices batch failed: ${err?.message}`);
        failureCount += batch.length;
      }
    }

    return { successCount, failureCount };
  }

  /** Mark a device token as inactive in the database. */
  async removeInvalidToken(token: string): Promise<void> {
    try {
      await this.prisma.deviceToken.updateMany({
        where: { token },
        data: { is_active: false },
      });
      this.logger.log(`[FCM] Marked token as inactive: ${token}`);
    } catch (err: any) {
      this.logger.error(`[FCM] Failed to remove invalid token: ${err?.message}`);
    }
  }

  private isInvalidTokenError(err: any): boolean {
    const invalidCodes = [
      'messaging/invalid-registration-token',
      'messaging/registration-token-not-registered',
      'messaging/invalid-argument',
    ];
    return invalidCodes.includes(err?.code ?? err?.errorInfo?.code ?? '');
  }
}
