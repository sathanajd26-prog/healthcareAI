import crypto from 'crypto';
import { OtpRecord } from '../../models/OtpRecord';
import { getSmsProvider } from '../sms/smsProvider';
import { env } from '../../config/env';

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds cooldown
const MAX_VERIFY_ATTEMPTS = 3;

function hashOtp(otp: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(otp).digest('hex');
}

export interface RequestOtpResult {
  success: boolean;
  message: string;
  cooldownRemaining?: number;
  error?: {
    code: string;
    message: string;
  };
}

export interface VerifyOtpResult {
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
}

export class OtpService {
  /**
   * Request and dispatch a secure single-use OTP
   */
  static async requestOtp(phone: string): Promise<RequestOtpResult> {
    const normalizedPhone = phone.trim();

    // Check for existing active OTP and cooldown
    const existing = await OtpRecord.findOne({
      phone: normalizedPhone,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (existing) {
      const timeSinceLastSent = Date.now() - existing.lastSentAt.getTime();
      if (timeSinceLastSent < RESEND_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((RESEND_COOLDOWN_MS - timeSinceLastSent) / 1000);
        return {
          success: false,
          message: `Please wait ${remainingSeconds} seconds before requesting a new verification code.`,
          cooldownRemaining: remainingSeconds,
          error: {
            code: 'OTP_COOLDOWN_ACTIVE',
            message: `Rate limit: Please wait ${remainingSeconds}s before requesting another OTP.`,
          },
        };
      }
      // Invalidate the previous code so only 1 active code exists at a time
      existing.isUsed = true;
      await existing.save();
    }

    // Generate cryptographic 6-digit OTP
    let generatedOtp = crypto.randomInt(100000, 999999).toString();

    // In explicitly configured development/test environment ONLY:
    // If DEV_OTP_SHORTCUT is enabled, we can deterministicize for predefined test accounts
    if (env.NODE_ENV !== 'production' && env.ENABLE_DEV_OTP_SHORTCUT) {
      const isDemoAccount = [
        '+919876543210',
        '+919876543211',
        '+919876543212',
        '9876543210',
        '9876543211',
        '9876543212',
      ].includes(normalizedPhone) || normalizedPhone.startsWith('98765432');
      if (isDemoAccount) {
        generatedOtp = '123456';
      }
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const otpHash = hashOtp(generatedOtp, salt);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    // Persist OTP record with TTL
    await OtpRecord.create({
      phone: normalizedPhone,
      otpHash,
      salt,
      attempts: 0,
      lastSentAt: new Date(),
      expiresAt,
      isUsed: false,
    });

    // Dispatch via configured SMS provider
    const smsProvider = getSmsProvider();
    const dispatchResult = await smsProvider.sendOtp(normalizedPhone, generatedOtp);

    if (!dispatchResult.success) {
      return {
        success: false,
        message: 'Failed to deliver OTP SMS via telecommunications carrier.',
        error: {
          code: 'SMS_DISPATCH_FAILURE',
          message: dispatchResult.error || 'SMS Gateway unreachable',
        },
      };
    }

    return {
      success: true,
      message: `Verification code dispatched to ${normalizedPhone.slice(0, 3)}****${normalizedPhone.slice(-3)}. Code valid for 5 minutes.`,
    };
  }

  /**
   * Verify an OTP with attempt limiting, expiration check, and single-use invalidation
   */
  static async verifyOtp(phone: string, inputOtp: string): Promise<VerifyOtpResult> {
    const normalizedPhone = phone.trim();

    const record = await OtpRecord.findOne({
      phone: normalizedPhone,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!record) {
      if (env.NODE_ENV !== 'production' && env.ENABLE_DEV_OTP_SHORTCUT) {
        const isDemo = ['+919876543210', '+919876543211', '9876543210', '9876543211'].includes(normalizedPhone) || normalizedPhone.startsWith('98765432');
        if (isDemo && inputOtp.trim() === '123456') {
          return { success: true };
        }
      }

      return {
        success: false,
        error: {
          code: 'OTP_EXPIRED_OR_NOT_FOUND',
          message: 'Verification code is invalid, expired, or not requested. Please request a new code.',
        },
      };
    }

    if (record.isUsed) {
      return {
        success: false,
        error: {
          code: 'OTP_ALREADY_USED',
          message: 'This verification code has already been used. Please request a new code.',
        },
      };
    }

    // Check maximum verification attempts
    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      record.isUsed = true; // Invalidate record immediately
      await record.save();
      return {
        success: false,
        error: {
          code: 'MAX_ATTEMPTS_EXCEEDED',
          message: 'Maximum verification attempts exceeded. Code invalidated for security. Please request a new OTP.',
        },
      };
    }

    const expectedHash = hashOtp(inputOtp.trim(), record.salt);
    const isMatch = crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(record.otpHash));

    if (!isMatch) {
      record.attempts += 1;
      const remaining = MAX_VERIFY_ATTEMPTS - record.attempts;
      await record.save();

      return {
        success: false,
        error: {
          code: 'INVALID_OTP',
          message: remaining > 0
            ? `Incorrect verification code. ${remaining} attempt(s) remaining.`
            : 'Maximum verification attempts exceeded. Code invalidated.',
        },
      };
    }

    // Match verified! Immediately burn OTP to guarantee single-use
    record.isUsed = true;
    await record.save();

    return { success: true };
  }
}
