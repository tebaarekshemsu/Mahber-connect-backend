/**
 * TestAppHelper
 *
 * Creates a NestJS test application with all external services mocked so that
 * integration / E2E tests can run without a real database, Redis, Chapa, or
 * Firebase instance.
 *
 * ## Infrastructure notes
 * - PrismaService  → replaced with an in-memory mock object
 * - ChapaService   → replaced with a jest mock
 * - FirebaseService → replaced with a jest mock
 * - ThrottlerModule → configured with very high limits so tests are not rate-limited
 * - ConfigModule   → provides the minimum env values required by JwtModule etc.
 *
 * ## Usage
 * ```ts
 * const { app, prismaMock } = await TestAppHelper.createTestApp();
 * // ... run supertest requests ...
 * await app.close();
 * ```
 *
 * Requirements: 26.2, 26.4
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { JwtStrategy } from '../../src/auth/strategies/jwt.strategy';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ChapaService } from '../../src/financial/chapa.service';
import { FirebaseService } from '../../src/communication/firebase.service';
import { GlobalExceptionFilter } from '../../src/common/filters/http-exception.filter';

// ---------------------------------------------------------------------------
// In-memory Prisma mock
// ---------------------------------------------------------------------------

export type PrismaMock = {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
};

export function createPrismaMock(): PrismaMock {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

// ---------------------------------------------------------------------------
// Chapa mock
// ---------------------------------------------------------------------------

export function createChapaMock() {
  return {
    initializePayment: jest.fn().mockResolvedValue({
      checkout_url: 'https://checkout.chapa.co/test',
      tx_ref: 'test-tx-ref',
    }),
    verifyPayment: jest.fn().mockResolvedValue({
      status: 'success',
      tx_ref: 'test-tx-ref',
      amount: 100,
      currency: 'ETB',
    }),
  };
}

// ---------------------------------------------------------------------------
// Firebase mock
// ---------------------------------------------------------------------------

export function createFirebaseMock() {
  return {
    onModuleInit: jest.fn(),
    sendToDevice: jest.fn().mockResolvedValue(true),
    sendToMultipleDevices: jest
      .fn()
      .mockResolvedValue({ successCount: 1, failureCount: 0 }),
    removeInvalidToken: jest.fn().mockResolvedValue(undefined),
  };
}

// ---------------------------------------------------------------------------
// Main helper
// ---------------------------------------------------------------------------

export interface TestAppResult {
  app: INestApplication;
  prismaMock: PrismaMock;
  chapaMock: ReturnType<typeof createChapaMock>;
  firebaseMock: ReturnType<typeof createFirebaseMock>;
}

export class TestAppHelper {
  /**
   * Creates a minimal NestJS application that includes only the Auth module
   * wired up with mocked dependencies.  Extend this as needed for other
   * modules by adding their controllers / services to the module definition.
   */
  static async createTestApp(): Promise<TestAppResult> {
    const prismaMock = createPrismaMock();
    const chapaMock = createChapaMock();
    const firebaseMock = createFirebaseMock();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        // Provide minimum config so JwtModule / strategies can initialise
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              jwt: { secret: 'test-jwt-secret-key-for-e2e-tests' },
              app: { port: 3000, nodeEnv: 'test' },
            }),
          ],
        }),
        // Throttler with very high limits so tests are never rate-limited
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 10000 }]),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'test-jwt-secret-key-for-e2e-tests',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtStrategy,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ChapaService, useValue: chapaMock },
        { provide: FirebaseService, useValue: firebaseMock },
        // Register ThrottlerGuard globally so @UseGuards(ThrottlerGuard) works
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile();

    const app = moduleFixture.createNestApplication();

    // Mirror the global pipes and filters used in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());

    await app.init();

    return { app, prismaMock, chapaMock, firebaseMock };
  }
}
