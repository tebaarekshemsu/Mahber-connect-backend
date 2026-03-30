import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as QRCode from 'qrcode';

interface QrPayload {
  event_id: string;
  mahber_id: string;
  exp: number;
}

@Injectable()
export class QrService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate a QR code for an event.
   * The JWT expires at event end_time + 30 minutes.
   * Returns a base64 data URL (image/png).
   *
   * Validates: Requirements 11.1, 11.2
   */
  async generateQRCode(event: {
    id: string;
    mahber_id: string;
    end_time: Date;
  }): Promise<string> {
    const secret = this.configService.get<string>('jwt.secret');

    // Expiration: event end_time + 30 minutes (in seconds for JWT)
    const expSeconds = Math.floor(event.end_time.getTime() / 1000) + 30 * 60;

    const payload: QrPayload = {
      event_id: event.id,
      mahber_id: event.mahber_id,
      exp: expSeconds,
    };

    const token = this.jwtService.sign(payload, {
      secret,
      expiresIn: expSeconds - Math.floor(Date.now() / 1000),
    });

    const dataUrl = await QRCode.toDataURL(token);
    return dataUrl;
  }

  /**
   * Validate a QR token: verify signature, expiration, and that
   * the encoded mahber_id matches the expected mahber.
   *
   * Validates: Requirements 11.3, 11.6
   */
  validateQRCode(
    token: string,
    mahberId: string,
  ): QrPayload {
    const secret = this.configService.get<string>('jwt.secret');

    let payload: QrPayload;
    try {
      payload = this.jwtService.verify<QrPayload>(token, { secret });
    } catch {
      throw new UnauthorizedException('QR code is invalid or expired');
    }

    if (payload.mahber_id !== mahberId) {
      throw new UnauthorizedException('QR code does not belong to this mahber');
    }

    return payload;
  }
}
