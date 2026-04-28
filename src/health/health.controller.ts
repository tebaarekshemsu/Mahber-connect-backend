import { Controller, Get } from '@nestjs/common';
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
    const client = new Redis({
      host: this.configService.get<string>('redis.host', 'localhost'),
      port: this.configService.get<number>('redis.port', 6379),
      password: this.configService.get<string>('redis.password') || undefined,
      tls: this.configService.get<any>('redis.tls'),
      lazyConnect: true,
      connectTimeout: 5000,
    });

    try {
      await client.connect();
      await client.ping();
      return { redis: { status: 'up' } };
    } catch {
      return { redis: { status: 'down' } };
    } finally {
      await client.quit().catch(() => undefined);
    }
  }
}
