import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('bcrypt');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    const dto = { phone: '+251911000001', password: 'pass123', name: 'Test User' };

    it('creates and returns user without password on success', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.user.create.mockResolvedValue({
        id: 'u1',
        phone: dto.phone,
        name: dto.name,
        password: 'hashed',
        email: null,
        bio: null,
      });

      const result = await service.register(dto as any);

      expect(result).not.toHaveProperty('password');
      expect(result.phone).toBe(dto.phone);
    });

    it('throws ConflictException when phone already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.register(dto as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const dto = { phone: '+251911000001', password: 'pass123' };
    const user = { id: 'u1', phone: dto.phone, name: 'Test', password: 'hashed' };

    it('returns access_token and user info on success', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login(dto as any);

      expect(result.access_token).toBe('jwt-token');
      expect(result.user.id).toBe('u1');
    });

    it('throws UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto as any)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('generateToken', () => {
    it('returns a JWT string', () => {
      mockJwtService.sign.mockReturnValue('signed-token');

      const token = service.generateToken({ id: 'u1', phone: '+251911000001' });

      expect(typeof token).toBe('string');
      expect(token).toBe('signed-token');
    });
  });
});
