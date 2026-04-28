import { registerAs } from '@nestjs/config';

export const redisConfig = registerAs('redis', () => {
  const redisTlsEnv = process.env.REDIS_TLS;
  const useTls = redisTlsEnv === 'true';
  
  console.log('[RedisConfig] REDIS_TLS env var:', redisTlsEnv);
  console.log('[RedisConfig] useTls:', useTls);
  
  const config = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    tls: useTls ? {
      rejectUnauthorized: false, // For Upstash
    } : undefined,
  };
  
  console.log('[RedisConfig] Final config:', JSON.stringify(config, null, 2));
  
  return config;
});

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  tls?: any;
}
