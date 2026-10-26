import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { env } from '../config/env';

export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_AUTH,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication requests from this client. Please wait before retrying.',
      },
    });
  },
});

export const bookingRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_BOOKING,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many booking requests. Concurrency guard engaged. Please wait before retrying.',
      },
    });
  },
});

// Dedicated Public AI Doctor Matching Rate Limiter (IP-based, standard IPv6-safe keying)
export const aiPublicMatchLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_AI_MATCH,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many symptom triage requests. Please wait a few minutes before trying again.',
      },
    });
  },
});

// Dedicated AI Health Assistant Chat Rate Limiter (User-based or IPv6-safe IP-based)
export const aiChatLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_AI_CHAT,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => (req.user?.id ? `user:${req.user.id}` : ipKeyGenerator(req)),
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'AI Health Assistant consultation rate limit reached. Please wait before asking further questions.',
      },
    });
  },
});

// Dedicated AI Document OCR & Biomarker Analysis Rate Limiter
export const aiOcrLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_AI_OCR,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => (req.user?.id ? `user:${req.user.id}` : ipKeyGenerator(req)),
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Document analysis limit exceeded. Please wait before uploading additional laboratory reports.',
      },
    });
  },
});
