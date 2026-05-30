import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../communication/sms.service';
import { NotificationService } from '../communication/notification.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

const BCRYPT_SALT_ROUNDS = 10;
const RESET_CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly smsService: SmsService,
    private readonly notificationService: NotificationService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (existing) {
      throw new ConflictException(
        'A user with this phone number already exists',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        password: hashedPassword,
        name: dto.name,
        email: dto.email,
        bio: dto.bio,
      },
    });

    // Send welcome notification
    try {
      await this.notificationService.sendToUser(
        user.id,
        'Welcome to MahberConnect!',
        `Welcome, ${user.name}! We're thrilled to have you join MahberConnect. Explore community financial pools, manage your Equbs, and connect with your local community.`,
        undefined,
        NotificationType.info,
      );
    } catch (notificationError: any) {
      this.logger.error(
        `Failed to send welcome notification to user ${user.id}: ${notificationError.message}`,
      );
    }

    // Return user without password
    const { password: _password, ...result } = user;
    return result;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user) {
      this.logger.warn(
        `Failed login attempt for phone: ${dto.phone} - user not found`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.is_suspended) {
      throw new UnauthorizedException('Your account has been suspended');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);

    if (!passwordValid) {
      this.logger.warn(
        `Failed login attempt for phone: ${dto.phone} - invalid password`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const access_token = this.generateToken(user);

    return {
      access_token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        is_super_admin: user.is_super_admin,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password: _password, ...result } = user;
    return result;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.notification_prefs !== undefined && { notification_prefs: dto.notification_prefs }),
      },
    });

    const { password: _password, ...result } = updated;
    return result;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(
      dto.newPassword,
      BCRYPT_SALT_ROUNDS,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    this.logger.log(`Password changed successfully for user: ${userId}`);

    return { message: 'Password changed successfully' };
  }

  generateToken(user: {
    id: string;
    phone: string;
    mahber_id?: string;
    role?: string;
    is_super_admin?: boolean;
  }): string {
    const payload: JwtPayload = {
      sub: user.id,
      phone: user.phone,
      ...(user.mahber_id && { mahber_id: user.mahber_id }),
      ...(user.role && { role: user.role }),
      ...(user.is_super_admin && { is_super_admin: true }),
    };
    return this.jwtService.sign(payload);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user) {
      // Don't reveal whether the phone exists
      this.logger.warn(
        `Forgot password requested for unknown phone: ${dto.phone}`,
      );
      return { message: 'If the account exists, a reset code has been sent.' };
    }

    // Generate a 6-digit numeric code
    const code = crypto.randomInt(100_000, 999_999).toString();

    // Clean up any existing unused tokens for this user
    await this.prisma.passwordResetToken.deleteMany({
      where: { user_id: user.id, used_at: null, expires_at: { gt: new Date() } },
    });

    // Store the hashed code
    const codeHash = await bcrypt.hash(code, BCRYPT_SALT_ROUNDS);

    await this.prisma.passwordResetToken.create({
      data: {
        user_id: user.id,
        code_hash: codeHash,
        expires_at: new Date(Date.now() + RESET_CODE_EXPIRY_MS),
      },
    });

    // Send code via SMS
    const smsBody = `Your MahberConnect password reset code is: ${code}. This code expires in 10 minutes.`;
    const sent = await this.smsService.send(dto.phone, smsBody);

    if (sent) {
      this.logger.log(`Password reset code sent to ${dto.phone}`);
    } else {
      this.logger.warn(
        `Failed to send password reset code to ${dto.phone} — SMS not configured`,
      );
    }

    return { message: 'If the account exists, a reset code has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    // Find a valid, unused token for this user
    const token = await this.prisma.passwordResetToken.findFirst({
      where: {
        user_id: user.id,
        used_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!token) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    // Verify the code
    const codeValid = await bcrypt.compare(dto.code, token.code_hash);
    if (!codeValid) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);

    // Update user password and mark token as used in a transaction
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { used_at: new Date() },
      }),
    ]);

    // Invalidate any other unused tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: { user_id: user.id, used_at: null },
      data: { used_at: new Date() },
    });

    this.logger.log(`Password reset successfully for user: ${user.id}`);

    return { message: 'Password reset successfully.' };
  }

  async searchByPhone(phone: string) {
    const user = await this.prisma.user.findUnique({
      where: { phone },
      select: { id: true, name: true, phone: true },
    });
    if (!user) {
      throw new NotFoundException('User with this phone number not found');
    }
    return user;
  }
}
