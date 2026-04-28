import { Controller, Get, Logger } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Get('detailed')
  @HealthCheck()
  @ApiOperation({ 
    summary: 'Detailed health check - Tests database and Redis connectivity',
    description: 'Returns the health status of PostgreSQL database and Redis (used for job queues and caching). Use this endpoint to verify all backend services are operational.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'All services are healthy',
    schema: {
      example: {
        status: 'ok',
        info: {
          database: { status: 'up' },
          redis: { status: 'up' }
        },
        error: {},
        details: {
          database: { status: 'up' },
          redis: { status: 'up' }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 503, 
    description: 'One or more services are down',
    schema: {
      example: {
        status: 'error',
        info: {
          database: { status: 'up' }
        },
        error: {
          redis: { status: 'down' }
        },
        details: {
          database: { status: 'up' },
          redis: { status: 'down' }
        }
      }
    }
  })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.checkDatabase(),
      () => this.checkRedis(),
    ]);
  }

  private async checkDatabase(): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { database: { status: 'up' } };
    } catch {
      return { database: { status: 'down' } };
    }
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string>('redis.password') || undefined;
    
    // Read TLS directly from environment variable as fallback
    const tlsEnabled = process.env.REDIS_TLS === 'true';
    const tls = tlsEnabled ? { rejectUnauthorized: false } : undefined;
    
    // Debug: Log what we're getting
    this.logger.log(`Redis config - REDIS_TLS env var: ${process.env.REDIS_TLS}`);
    this.logger.log(`Redis config - tlsEnabled: ${tlsEnabled}`);
    this.logger.log(`Attempting Redis connection to ${host}:${port} with TLS: ${!!tls}`);
    
    const client = new Redis({
      host,
      port,
      password,
      tls,
      connectTimeout: 10000,
      retryStrategy: () => null, // Don't retry on health check
    });

    try {
      const result = await client.ping();
      this.logger.log(`Redis connection successful, PING response: ${result}`);
      return { redis: { status: 'up' } };
    } catch (error: any) {
      this.logger.error(`Redis connection failed: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      return { redis: { status: 'down', error: error.message } };
    } finally {
      try {
        await client.quit();
      } catch (quitError: any) {
        this.logger.warn(`Error closing Redis connection: ${quitError.message}`);
      }
    }
  }
}
