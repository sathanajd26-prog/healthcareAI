import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { validateAndLoadConfig } from '../config/env';
import { getMongooseConnectOptions } from '../config/db';
import { ensureTestServer, closeTestServer } from './testSetup';
import { OtpRecord } from '../models/OtpRecord';
import { User } from '../models/User';

const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:5002/api/v1';
const createdTestPhones: string[] = [];

async function apiRequest(endpoint: string, options: { method?: string; token?: string; body?: any; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data: any = await response.json().catch(() => null);
  return { status: response.status, data, headers: response.headers };
}

describe('AegisHealth Milestone 2: Security Hardening & Runtime Verification Test Suite', () => {
  before(async () => {
    await ensureTestServer();
  });

  after(async () => {
    try {
      if (createdTestPhones.length > 0) {
        await OtpRecord.deleteMany({ phone: { $in: createdTestPhones } });
        await User.deleteMany({ phone: { $in: createdTestPhones } });
      }
    } catch (e) {
      // ignore
    }
    await closeTestServer();
  });

  describe('1. Production Secret Validation & Startup Safeguards', () => {
    it('Fails startup when JWT_SECRET is missing in production', () => {
      const origEnv = process.env;
      try {
        process.env = {
          ...origEnv,
          NODE_ENV: 'production',
          JWT_SECRET: '',
          MONGODB_URI: 'mongodb+srv://admin:pass@cluster.mongodb.net/aegis',
        };
        assert.throws(
          () => validateAndLoadConfig(),
          /JWT_SECRET is required in production/,
          'Should abort startup when JWT_SECRET is missing in production'
        );
      } finally {
        process.env = origEnv;
      }
    });

    it('Fails startup when JWT_SECRET is too short (< 32 chars) in production', () => {
      const origEnv = process.env;
      try {
        process.env = {
          ...origEnv,
          NODE_ENV: 'production',
          JWT_SECRET: 'short_secret_key_123',
          MONGODB_URI: 'mongodb+srv://admin:pass@cluster.mongodb.net/aegis',
        };
        assert.throws(
          () => validateAndLoadConfig(),
          /JWT_SECRET is too short/,
          'Should abort startup when JWT_SECRET has low entropy'
        );
      } finally {
        process.env = origEnv;
      }
    });

    it('Fails startup when JWT_SECRET uses insecure default fallback values in production', () => {
      const origEnv = process.env;
      try {
        process.env = {
          ...origEnv,
          NODE_ENV: 'production',
          JWT_SECRET: 'healthcare_superapp_jwt_secret_key_2026',
          MONGODB_URI: 'mongodb+srv://admin:pass@cluster.mongodb.net/aegis',
        };
        assert.throws(
          () => validateAndLoadConfig(),
          /cannot use known default\/example secret values/,
          'Should abort startup when using hardcoded repository secrets'
        );
      } finally {
        process.env = origEnv;
      }
    });

    it('Fails startup if ENABLE_DEV_OTP_SHORTCUT is enabled in production', () => {
      const origEnv = process.env;
      try {
        process.env = {
          ...origEnv,
          NODE_ENV: 'production',
          JWT_SECRET: 'strong_production_secret_key_32_characters_minimum_entropy',
          MONGODB_URI: 'mongodb+srv://admin:pass@cluster.mongodb.net/aegis',
          ENABLE_DEV_OTP_SHORTCUT: 'true',
        };
        assert.throws(
          () => validateAndLoadConfig(),
          /Static OTP shortcuts are strictly forbidden in production/,
          'Should abort startup if dev OTP bypass is enabled in production'
        );
      } finally {
        process.env = origEnv;
      }
    });

    it('Fails startup when CORS_ORIGIN is missing in production', () => {
      const origEnv = process.env;
      try {
        process.env = {
          ...origEnv,
          NODE_ENV: 'production',
          JWT_SECRET: 'strong_production_secret_key_32_characters_minimum_entropy',
          MONGODB_URI: 'mongodb+srv://admin:pass@cluster.mongodb.net/aegis',
          CORS_ORIGIN: '',
        };
        assert.throws(
          () => validateAndLoadConfig(),
          /CORS_ORIGIN is required in production/,
          'Should abort startup when CORS_ORIGIN is missing in production'
        );
      } finally {
        process.env = origEnv;
      }
    });

    it('Fails startup when CORS_ORIGIN is wildcard "*" in production', () => {
      const origEnv = process.env;
      try {
        process.env = {
          ...origEnv,
          NODE_ENV: 'production',
          JWT_SECRET: 'strong_production_secret_key_32_characters_minimum_entropy',
          MONGODB_URI: 'mongodb+srv://admin:pass@cluster.mongodb.net/aegis',
          CORS_ORIGIN: '*',
        };
        assert.throws(
          () => validateAndLoadConfig(),
          /cannot be wildcard "\*"/,
          'Should abort startup when CORS_ORIGIN is wildcard in production'
        );
      } finally {
        process.env = origEnv;
      }
    });

    it('Fails startup when CORS_ORIGIN contains invalid URL formats in production', () => {
      const origEnv = process.env;
      try {
        process.env = {
          ...origEnv,
          NODE_ENV: 'production',
          JWT_SECRET: 'strong_production_secret_key_32_characters_minimum_entropy',
          MONGODB_URI: 'mongodb+srv://admin:pass@cluster.mongodb.net/aegis',
          CORS_ORIGIN: 'not-a-valid-url,https://valid.aegis.org',
        };
        assert.throws(
          () => validateAndLoadConfig(),
          /Invalid origin format in CORS_ORIGIN/,
          'Should abort startup when CORS_ORIGIN has invalid origin format'
        );
      } finally {
        process.env = origEnv;
      }
    });

    it('Succeeds validation in production when valid CORS_ORIGIN and secrets are provided', () => {
      const origEnv = process.env;
      try {
        process.env = {
          ...origEnv,
          NODE_ENV: 'production',
          JWT_SECRET: 'strong_production_secret_key_32_characters_minimum_entropy',
          MONGODB_URI: 'mongodb+srv://admin:pass@cluster.mongodb.net/aegis',
          CORS_ORIGIN: 'https://app.aegishealth.org,https://doctor.aegishealth.org',
          ENABLE_DEV_OTP_SHORTCUT: 'false',
        };
        const config = validateAndLoadConfig();
        assert.strictEqual(config.CORS_ORIGIN.length, 2);
        assert.ok(config.CORS_ORIGIN.includes('https://app.aegishealth.org'));
        assert.ok(config.CORS_ORIGIN.includes('https://doctor.aegishealth.org'));
      } finally {
        process.env = origEnv;
      }
    });
  });

  describe('2. OTP Lifecycle: Cooldowns, Attempt Limits, Expiration & Single-Use', () => {
    const testPhone = `+9199${Math.floor(10000000 + Math.random() * 90000000)}`;
    createdTestPhones.push(testPhone);

    it('Request OTP succeeds and does not expose OTP plaintext in response', async () => {
      const res = await apiRequest('/auth/request-otp', {
        method: 'POST',
        body: { phone: testPhone },
      });

      assert.strictEqual(res.status, 200, 'Should return 200 OK');
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.data?.phone, testPhone);
      // Verify no OTP code is returned in response
      assert.strictEqual(res.data.data?.otp, undefined, 'Plaintext OTP must NEVER leak in API responses');
      assert.ok(!JSON.stringify(res.data).includes('123456'), 'Response must not contain plaintext codes');
    });

    it('Immediate second OTP request triggers resend cooldown (429)', async () => {
      const res = await apiRequest('/auth/request-otp', {
        method: 'POST',
        body: { phone: testPhone },
      });

      assert.strictEqual(res.status, 429, 'Should return 429 on active cooldown');
      assert.strictEqual(res.data.error?.code, 'OTP_COOLDOWN_ACTIVE');
    });

    it('Incorrect OTP decrements attempts and returns count remaining', async () => {
      const res = await apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: { phone: testPhone, otp: '000000' },
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.error?.code, 'INVALID_OTP');
      assert.ok(res.data.error?.message.includes('attempt(s) remaining'));
    });

    it('Exceeding 3 failed attempts locks and invalidates the OTP code (429)', async () => {
      // 2nd failed attempt
      await apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: { phone: testPhone, otp: '111111' },
      });

      // 3rd failed attempt
      await apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: { phone: testPhone, otp: '222222' },
      });

      // 4th attempt after max attempts reached
      const res4 = await apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: { phone: testPhone, otp: '333333' },
      });

      assert.strictEqual(res4.status, 429, 'Should return 429 MAX_ATTEMPTS_EXCEEDED');
      assert.strictEqual(res4.data.error?.code, 'MAX_ATTEMPTS_EXCEEDED');
    });

    it('Single-use burning: once verified, an OTP cannot be reused', async () => {
      const burnPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
      createdTestPhones.push(burnPhone);

      // Request OTP
      const reqRes = await apiRequest('/auth/request-otp', {
        method: 'POST',
        body: { phone: burnPhone },
      });
      assert.strictEqual(reqRes.status, 200);

      // In dev mode, demo phone starting with 98765432 or predefined account receives 123456
      const demoBurnPhone = `98765432${Math.floor(10 + Math.random() * 89)}`;
      createdTestPhones.push(demoBurnPhone);
      await apiRequest('/auth/request-otp', {
        method: 'POST',
        body: { phone: demoBurnPhone },
      });

      const verifyRes1 = await apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: { phone: demoBurnPhone, otp: '123456' },
      });
      assert.strictEqual(verifyRes1.status, 200, 'Initial verification should succeed');

      // Attempt second verification with the same OTP
      const verifyRes2 = await apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: { phone: demoBurnPhone, otp: '123456' },
      });
      assert.strictEqual(verifyRes2.status, 400, 'Re-verifying burned OTP must fail');
      assert.strictEqual(verifyRes2.data.error?.code, 'OTP_ALREADY_USED');
    });
  });

  describe('3. Session Logout & Security Headers', () => {
    it('POST /auth/logout invalidates session cleanly with 200 OK', async () => {
      // Authenticate to get valid token using dedicated test phone
      const authPhone = `98765432${Math.floor(10 + Math.random() * 89)}`;
      createdTestPhones.push(authPhone);

      await apiRequest('/auth/request-otp', {
        method: 'POST',
        body: { phone: authPhone },
      });

      const loginRes = await apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: { phone: authPhone, otp: '123456' },
      });
      assert.strictEqual(loginRes.status, 200);
      const token = loginRes.data.data.token;

      const logoutRes = await apiRequest('/auth/logout', {
        method: 'POST',
        token,
      });

      assert.strictEqual(logoutRes.status, 200);
      assert.strictEqual(logoutRes.data.success, true);
    });

    it('Security headers (Helmet) are present on HTTP responses', async () => {
      const res = await apiRequest('/health');
      assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
      assert.strictEqual(res.headers.get('x-frame-options'), 'DENY');
    });

    it('Rate limiter headers are present on authentication endpoints', async () => {
      const ratePhone = `+91912${Math.floor(1000000 + Math.random() * 9000000)}`;
      createdTestPhones.push(ratePhone);
      const res = await apiRequest('/auth/request-otp', {
        method: 'POST',
        body: { phone: ratePhone },
      });
      // Rate limiter standard headers
      assert.ok(res.headers.has('ratelimit-limit') || res.headers.has('x-ratelimit-limit'), 'Should include rate limit headers');
    });
  });

  describe('4. CORS, Content Security Policy (CSP) & Database Production Safeguards', () => {
    it('Helmet emits a restrictive Content-Security-Policy header', async () => {
      const res = await apiRequest('/health');
      const csp = res.headers.get('content-security-policy') || '';
      assert.ok(csp.length > 0, 'Content-Security-Policy header must be present');
      assert.ok(csp.includes("default-src 'self'"), 'CSP must restrict default-src to self');
      assert.ok(csp.includes("script-src 'self'"), 'CSP must restrict script-src to self');
      assert.ok(csp.includes("frame-ancestors 'none'"), 'CSP must forbid iframe embedding (anti-clickjacking)');
      assert.ok(csp.includes("object-src 'none'"), 'CSP must forbid plugin objects');
      assert.ok(csp.includes('https://images.unsplash.com'), 'CSP must allow verified doctor avatar image hosts');
      assert.ok(csp.includes('https://fonts.googleapis.com'), 'CSP must allow Google Fonts style sources');
      assert.strictEqual(csp.includes("'unsafe-eval'"), false, 'CSP must NEVER include unsafe-eval');
    });

    it('Disables Mongoose autoIndex in production while enabling in development/test', () => {
      const prodOpts = getMongooseConnectOptions('production');
      assert.strictEqual(prodOpts.autoIndex, false, 'autoIndex must be disabled in production');

      const devOpts = getMongooseConnectOptions('development');
      assert.strictEqual(devOpts.autoIndex, true, 'autoIndex should be enabled in development');

      const testOpts = getMongooseConnectOptions('test');
      assert.strictEqual(testOpts.autoIndex, true, 'autoIndex should be enabled in test');
    });

    it('Reflects allowed trusted origin and allows credentials in CORS', async () => {
      const trustedOrigin = 'http://localhost:5173';
      const res = await fetch(`${API_BASE}/health`, {
        method: 'GET',
        headers: {
          'Origin': trustedOrigin,
        },
      });

      assert.strictEqual(res.headers.get('access-control-allow-origin'), trustedOrigin);
      assert.strictEqual(res.headers.get('access-control-allow-credentials'), 'true');
    });

    it('Does NOT reflect untrusted origins in Access-Control-Allow-Origin header', async () => {
      const evilOrigin = 'https://malicious-healthcare-phishing.com';
      const res = await fetch(`${API_BASE}/health`, {
        method: 'GET',
        headers: {
          'Origin': evilOrigin,
        },
      });

      // Untrusted origin must NOT be reflected
      assert.strictEqual(
        res.headers.get('access-control-allow-origin'),
        null,
        'Access-Control-Allow-Origin must not be present for untrusted origin'
      );
    });

    it('Responds to CORS preflight OPTIONS request for trusted origins', async () => {
      const trustedOrigin = 'http://localhost:5173';
      const res = await fetch(`${API_BASE}/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': trustedOrigin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization, Content-Type',
        },
      });

      assert.strictEqual(res.status, 204);
      assert.strictEqual(res.headers.get('access-control-allow-origin'), trustedOrigin);
      assert.strictEqual(res.headers.get('access-control-allow-credentials'), 'true');
    });

    it('Rejects CORS preflight OPTIONS request for untrusted origins', async () => {
      const evilOrigin = 'https://attacker.evil.corp';
      const res = await fetch(`${API_BASE}/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': evilOrigin,
          'Access-Control-Request-Method': 'GET',
        },
      });

      assert.strictEqual(
        res.headers.get('access-control-allow-origin'),
        null,
        'Preflight for untrusted origin must NOT emit Access-Control-Allow-Origin'
      );
    });
  });

  describe('5. SEC-06: Endpoint-Specific Rate Limiting & Denial-of-Service Defenses', () => {
    it('Emits standard RateLimit headers on public AI matching endpoint (/doctors/ai-match)', async () => {
      const res = await apiRequest('/doctors/ai-match', {
        method: 'POST',
        body: { symptomText: 'persistent headache' },
      });
      assert.strictEqual(res.status, 200);
      assert.ok(
        res.headers.has('ratelimit-limit') || res.headers.has('x-ratelimit-limit'),
        'Must include standard rate limit headers'
      );
    });

    it('Emits standard RateLimit headers on AI Health Assistant (/ai/chat)', async () => {
      const authPhone = `98765432${Math.floor(10 + Math.random() * 89)}`;
      createdTestPhones.push(authPhone);
      await apiRequest('/auth/request-otp', { method: 'POST', body: { phone: authPhone } });
      const loginRes = await apiRequest('/auth/verify-otp', { method: 'POST', body: { phone: authPhone, otp: '123456' } });
      const token = loginRes.data.data.token;

      const res = await apiRequest('/ai/chat', {
        method: 'POST',
        token,
        body: { question: 'Healthy hydration advice' },
      });
      assert.strictEqual(res.status, 200);
      assert.ok(
        res.headers.has('ratelimit-limit') || res.headers.has('x-ratelimit-limit'),
        'Must include rate limit headers on AI chat'
      );
    });

    it('Enforces 429 Too Many Requests when rate threshold is exceeded', async () => {
      const express = (await import('express')).default;
      const rateLimit = (await import('express-rate-limit')).default;
      const testApp = express();

      const strictLimiter = rateLimit({
        windowMs: 60000,
        max: 2,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
          res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Rate limit exceeded. Please wait before retrying.',
            },
          });
        },
      });

      testApp.post('/test/limited-endpoint', strictLimiter, (_req, res) => {
        res.json({ success: true });
      });

      const server = testApp.listen(0);
      const port = (server.address() as any).port;

      try {
        // Request 1: Allowed
        const res1 = await fetch(`http://127.0.0.1:${port}/test/limited-endpoint`, { method: 'POST' });
        assert.strictEqual(res1.status, 200);

        // Request 2: Allowed
        const res2 = await fetch(`http://127.0.0.1:${port}/test/limited-endpoint`, { method: 'POST' });
        assert.strictEqual(res2.status, 200);

        // Request 3: Blocked (429)
        const res3 = await fetch(`http://127.0.0.1:${port}/test/limited-endpoint`, { method: 'POST' });
        assert.strictEqual(res3.status, 429);
        const json3: any = await res3.json();
        assert.strictEqual(json3.success, false);
        assert.strictEqual(json3.error.code, 'RATE_LIMIT_EXCEEDED');
      } finally {
        server.close();
      }
    });
  });
});
