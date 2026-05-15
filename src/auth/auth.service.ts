import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      bio: user.bio,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
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
      },
    });

    return {
      id: updated.id,
      phone: updated.phone,
      name: updated.name,
      email: updated.email,
      bio: updated.bio,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }

  generateToken(user: {
    id: string;
    phone: string;
    mahber_id?: string;
    role?: string;
  }): string {
    const payload: JwtPayload = {
      sub: user.id,
      phone: user.phone,
      ...(user.mahber_id && { mahber_id: user.mahber_id }),
      ...(user.role && { role: user.role }),
    };
    return this.jwtService.sign(payload);
  }
}
