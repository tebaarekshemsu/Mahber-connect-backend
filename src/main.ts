import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Security middleware
  app.use(helmet());

  // CORS - improved handling: use ConfigService, trim origins, handle preflight and credentials
  const configService = app.get(ConfigService);
  const allowedOriginsRaw =
    configService.get<any>('app.allowedOrigins') ?? process.env.ALLOWED_ORIGINS ?? '';
  const allowedOrigins = Array.isArray(allowedOriginsRaw)
    ? allowedOriginsRaw.map((o) => String(o).trim()).filter(Boolean)
    : String(allowedOriginsRaw)
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // allow non-browser requests (no Origin header)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('MahberConnect API')
    .setDescription(
      'Backend API for MahberConnect - digitizing traditional Ethiopian social and financial institutions',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'User registration and authentication')
    .addTag('Membership', 'Organization management and membership')
    .addTag('Payments', 'Payment processing and ledger')
    .addTag('Events', 'Event scheduling and attendance')
    .addTag('Communication', 'Announcements, chat, and voting')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`MahberConnect API running on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
