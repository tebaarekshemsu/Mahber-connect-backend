import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private from: string = 'noreply@mahberconnect.com';

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('email.host');
    const port = this.config.get<number>('email.port');
    const user = this.config.get<string>('email.user');
    const pass = this.config.get<string>('email.pass');
    const from = this.config.get<string>('email.from');

    if (!host || !user || !pass) {
      this.logger.warn('SMTP not fully configured — email notifications disabled');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    if (from) this.from = from;

    this.logger.log('Email service initialized');
  }

  async send(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('[Email] SMTP not initialized — skipping send');
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
      });
      return true;
    } catch (err: any) {
      this.logger.error(`[Email] Failed to send to ${to}: ${err?.message}`);
      return false;
    }
  }
}
