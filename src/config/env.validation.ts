import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Application
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('development'),
  ALLOWED_ORIGINS: Joi.string().optional(),

  // Database
  DATABASE_URL: Joi.string().required().messages({
    'any.required': 'DATABASE_URL is required. Provide a valid PostgreSQL connection string.',
    'string.empty': 'DATABASE_URL must not be empty.',
  }),

  // JWT
  JWT_SECRET: Joi.string().min(16).required().messages({
    'any.required': 'JWT_SECRET is required. Provide a secure random string.',
    'string.min': 'JWT_SECRET must be at least 16 characters long.',
  }),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),
  REDIS_TLS: Joi.string().valid('true', 'false').default('false'),

  // Chapa Payment Gateway
  CHAPA_SECRET_KEY: Joi.string().required().messages({
    'any.required': 'CHAPA_SECRET_KEY is required for payment processing.',
    'string.empty': 'CHAPA_SECRET_KEY must not be empty.',
  }),
  CHAPA_BASE_URL: Joi.string().uri().default('https://api.chapa.co/v1'),

  // Firebase Cloud Messaging
  FIREBASE_PROJECT_ID: Joi.string().required().messages({
    'any.required': 'FIREBASE_PROJECT_ID is required for push notifications.',
    'string.empty': 'FIREBASE_PROJECT_ID must not be empty.',
  }),
  FIREBASE_PRIVATE_KEY: Joi.string().required().messages({
    'any.required': 'FIREBASE_PRIVATE_KEY is required for push notifications.',
    'string.empty': 'FIREBASE_PRIVATE_KEY must not be empty.',
  }),
  FIREBASE_CLIENT_EMAIL: Joi.string().email().required().messages({
    'any.required': 'FIREBASE_CLIENT_EMAIL is required for push notifications.',
    'string.email': 'FIREBASE_CLIENT_EMAIL must be a valid email address.',
  }),
});
