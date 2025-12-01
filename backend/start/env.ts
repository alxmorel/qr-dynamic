import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  APP_KEY: Env.schema.string(),
  APP_NAME: Env.schema.string(),
  APP_URL: Env.schema.string(),
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  
  // Database
  DB_HOST: Env.schema.string(),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),
  
  // Session
  SESSION_DRIVER: Env.schema.string.optional(),
  SESSION_SECRET: Env.schema.string(),
  
  // Mail
  SMTP_HOST: Env.schema.string(),
  SMTP_PORT: Env.schema.number(),
  SMTP_USER: Env.schema.string(),
  SMTP_PASS: Env.schema.string(),
  SMTP_SECURE: Env.schema.string.optional(),
  MAIL_FROM: Env.schema.string(),
  
  // Google OAuth
  GOOGLE_CLIENT_ID: Env.schema.string.optional(),
  GOOGLE_CLIENT_SECRET: Env.schema.string.optional(),
  GOOGLE_CALLBACK_URL: Env.schema.string.optional(),
  
  // Encryption
  ENCRYPTION_KEY: Env.schema.string(),
  
  // App Base URL
  APP_BASE_URL: Env.schema.string(),
})

