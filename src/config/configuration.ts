import { registerAs } from '@nestjs/config';
const DEFAULT_URL = 'https://mahber-connect-backend.onrender.com';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
    'https://mahberconnectfrontend.vercel.app',
    'http://localhost:3000',
    DEFAULT_URL,
  ],
  url: process.env.APP_URL || DEFAULT_URL,
  callbackUrl:
    process.env.APP_CALLBACK_URL || `${process.env.APP_URL || DEFAULT_URL}/payment/callback`,
  returnUrl:
    process.env.APP_RETURN_URL || `${process.env.APP_URL || DEFAULT_URL}/payment/return`,
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
}));

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
}));

export const chapaConfig = registerAs('chapa', () => ({
  secretKey: process.env.CHAPA_SECRET_KEY,
  baseUrl: process.env.CHAPA_BASE_URL || 'https://api.chapa.co/v1',
  approvalSecret: process.env.CHAPA_APPROVAL_SECRET,
}));

export const firebaseConfig = registerAs('firebase', () => ({
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
}));

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
}));

export interface AppConfig {
  port: number;
  nodeEnv: string;
  allowedOrigins: string[];
  url: string;
  callbackUrl: string;
  returnUrl: string;
}

export interface DatabaseConfig {
  url: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export interface ChapaConfig {
  secretKey: string;
  baseUrl: string;
  approvalSecret?: string;
}

export interface FirebaseConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export const emailConfig = registerAs('email', () => ({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM || 'noreply@mahberconnect.com',
}));

export const smsConfig = registerAs('sms', () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  fromNumber: process.env.TWILIO_FROM_NUMBER,
}));

export const cloudinaryConfig = registerAs('cloudinary', () => ({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
}));

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export interface SmsConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}
