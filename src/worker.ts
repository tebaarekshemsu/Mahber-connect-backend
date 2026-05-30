import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Worker');

  logger.log('Starting background worker...');

  // Create application context (no HTTP server)
  const app = await NestFactory.createApplicationContext(AppModule);

  logger.log('Background worker started successfully');
  logger.log('Listening for jobs on Redis queues...');
  logger.log('Active processors: attendance, fine-calculation, lottery, payment-reminder, join-request-expiry, suspension-expiry');

  // Keep the process alive
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});
