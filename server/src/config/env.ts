import dotenv from 'dotenv';
import path from 'path';

// Load .env from server directory or root directory if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // fallback to current working directory

const INSECURE_DEFAULT_SECRETS = [
  'healthcare_superapp_jwt_secret_key_2026',
  'healthcare_super_app_jwt_secret_key_2026',
  'secret',
  'jwt_secret',
  'password',
  '123456',
  'changeme',
];

export interface AppConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  ENABLE_DEV_OTP_SHORTCUT: boolean;
  SMS_PROVIDER: 'mock' | 'twilio' | 'aws_sns';
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  CORS_ORIGIN: string | string[];
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_AUTH: number;
  RATE_LIMIT_MAX_BOOKING: number;
}

export function validateAndLoadConfig(): AppConfig {
  const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase() as 'development' | 'production' | 'test';
  const isProduction = nodeEnv === 'production';

  const jwtSecret = process.env.JWT_SECRET || (isProduction ? '' : 'dev_jwt_secret_key_for_local_testing_only_32_chars_long');
  const mongoUri = process.env.MONGODB_URI || (isProduction ? '' : 'mongodb://127.0.0.1:27017/hospital_superapp');
  const enableDevOtp = process.env.ENABLE_DEV_OTP_SHORTCUT === 'true';

  // Production Strict Security Validations
  if (isProduction) {
    const errors: string[] = [];

    if (!jwtSecret) {
      errors.push('JWT_SECRET is required in production.');
    } else {
      if (jwtSecret.length < 32) {
        errors.push(`JWT_SECRET is too short (${jwtSecret.length} chars). Production minimum is 32 characters.`);
      }
      if (INSECURE_DEFAULT_SECRETS.includes(jwtSecret.toLowerCase())) {
        errors.push('JWT_SECRET cannot use known default/example secret values.');
      }
    }

    if (!mongoUri) {
      errors.push('MONGODB_URI is required in production.');
    } else if (mongoUri.includes('127.0.0.1') || mongoUri.includes('localhost')) {
      // In production, warn or flag unauthenticated local database
      console.warn('[SECURITY WARNING] Production MONGODB_URI is pointing to localhost.');
    }

    if (enableDevOtp) {
      errors.push('ENABLE_DEV_OTP_SHORTCUT is enabled. Static OTP shortcuts are strictly forbidden in production.');
    }

    if (errors.length > 0) {
      const errorMsg = `\n========================================================\n[CRITICAL SECURITY CONFIGURATION ERROR - STARTUP ABORTED]\n${errors.map((e) => `  - ${e}`).join('\n')}\n========================================================\n`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  } else {
    // Development Warnings
    if (INSECURE_DEFAULT_SECRETS.includes(jwtSecret.toLowerCase()) || jwtSecret.includes('dev_jwt_secret')) {
      console.warn('[SECURITY WARNING] Running with development JWT_SECRET. Do NOT deploy with this key.');
    }
  }

  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
    : '*';

  return {
    NODE_ENV: nodeEnv,
    PORT: parseInt(process.env.PORT || '5001', 10),
    MONGODB_URI: mongoUri,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    ENABLE_DEV_OTP_SHORTCUT: isProduction ? false : (process.env.ENABLE_DEV_OTP_SHORTCUT !== 'false'),
    SMS_PROVIDER: (process.env.SMS_PROVIDER as any) || 'mock',
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
    CORS_ORIGIN: corsOrigin,
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins default
    RATE_LIMIT_MAX_AUTH: parseInt(process.env.RATE_LIMIT_MAX_AUTH || (nodeEnv === 'test' ? '500' : '15'), 10),
    RATE_LIMIT_MAX_BOOKING: parseInt(process.env.RATE_LIMIT_MAX_BOOKING || (nodeEnv === 'test' ? '500' : '30'), 10),
  };
}

export const env = validateAndLoadConfig();
