import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import * as QRCode from 'qrcode';

interface QrPayload {
  event_id: string;
  mahber_id: string;
}

interface VerifiedQrPayload extends QrPayload {
  member_id?: string;
  exp?: number;
  iat?: number;
}

@Injectable()
export class QrService {
  private readonly logger = new Logger(QrService.name);

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
  async generateQRCode(event: { id: string; mahber_id: string; end_time: Date }): Promise<string> {
    const secret = this.configService.get<string>('jwt.secret');

    // Expiration: event end_time + 30 minutes (in seconds for JWT)
    const expSeconds = Math.floor(event.end_time.getTime() / 1000) + 30 * 60;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresIn = expSeconds - nowSeconds;

    if (expiresIn <= 0) {
      // Event already ended (or within the 30min window). Prevent generating an already-expired token.
      throw new UnauthorizedException('Event has already ended or QR would be expired');
    }

    const payload: QrPayload = {
      event_id: event.id,
      mahber_id: event.mahber_id,
    };

    // Do not include `exp` in the payload — provide `expiresIn` via options only.
    const token = this.jwtService.sign(payload, {
      secret,
      expiresIn,
    });

    this.logger.log(
      `Generated QR token for event=${event.id} mahber=${event.mahber_id} expires_in=${expiresIn}s`,
    );

    const dataUrl = await QRCode.toDataURL(token);
    return dataUrl;
  }

  /**
   * Validate a QR token: verify signature, expiration, and that
   * the encoded mahber_id matches the expected mahber.
   *
   * Validates: Requirements 11.3, 11.6
   */
  validateQRCode(token: string, mahberId: string): VerifiedQrPayload {
    const secret = this.configService.get<string>('jwt.secret');

    let payload: VerifiedQrPayload;
    try {
      payload = this.jwtService.verify<VerifiedQrPayload>(token, { secret });
      this.logger.log(
        `QR token verified: event_id=${payload.event_id} mahber_id=${payload.mahber_id} exp=${payload.exp ?? 'n/a'}`,
      );
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        this.logger.warn(`QR token expired: ${(err as any).message}`);
      } else if (err instanceof JsonWebTokenError) {
        this.logger.warn(`QR token invalid or malformed: ${(err as any).message}`);
      } else {
        this.logger.warn(`QR verification error: ${(err as any)?.message ?? err}`);
      }
      // For security, avoid logging the token itself in production.
      throw new UnauthorizedException('QR code is invalid or expired');
    }

    if (payload.mahber_id !== mahberId) {
      this.logger.warn(
        `QR code mahber mismatch: token_mahber=${payload.mahber_id} expected=${mahberId}`,
      );
      throw new UnauthorizedException('QR code does not belong to this mahber');
    }

    return payload;
  }
}
