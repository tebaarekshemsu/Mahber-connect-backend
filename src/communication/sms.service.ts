import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService implements OnModuleInit {
  private readonly logger = new Logger(SmsService.name);
  private twilioClient: any = null;
  private fromNumber: string = '';

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const accountSid = this.config.get<string>('sms.accountSid');
    const authToken = this.config.get<string>('sms.authToken');
    const fromNumber = this.config.get<string>('sms.fromNumber');

    if (!accountSid || !authToken || !fromNumber) {
      this.logger.warn('Twilio not fully configured — SMS notifications disabled');
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const twilio = require('twilio');
      this.twilioClient = twilio(accountSid, authToken);
      this.fromNumber = fromNumber;
      this.logger.log('SMS service initialized');
    } catch (err: any) {
      this.logger.error(`[SMS] Failed to initialize Twilio client: ${err?.message}`);
    }
  }

  async send(to: string, body: string): Promise<boolean> {
    if (!this.twilioClient) {
      this.logger.warn('[SMS] Twilio not initialized — skipping send');
      return false;
    }

    try {
      await this.twilioClient.messages.create({
        body,
        from: this.fromNumber,
        to,
      });
      return true;
    } catch (err: any) {
      this.logger.error(`[SMS] Failed to send to ${to}: ${err?.message}`);
      return false;
    }
  }
}
