import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { io as ioClient, Socket } from 'socket.io-client';
import { getSafeDbDiagnosticInfo, sanitizeMongoUri } from '../config/db';
import { ensureTestServer, closeTestServer } from './testSetup';
import { User } from '../models/User';

const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:5002/api/v1';
const WS_BASE = process.env.WS_BASE_URL || 'http://127.0.0.1:5002';
const JWT_SECRET = process.env.JWT_SECRET || 'aegishealth_jwt_secret_for_local_development_testing_only_min_32_chars';

describe('Stage 6.1 Phase 1: Information Disclosure & Credential Redaction Test Suite', () => {
  let testPatientUser: any;
  let testPatientToken: string;

  before(async () => {
    await ensureTestServer();

    // Create a temporary test patient user with identifiable name
    testPatientUser = await User.findOneAndUpdate(
      { phone: '+919876500001' },
      {
        phone: '+919876500001',
        fullName: 'Confidential Patient Alpha',
        role: 'PATIENT',
        isVerified: true,
      },
      { upsert: true, new: true }
    );

    testPatientToken = jwt.sign(
      {
        id: testPatientUser._id.toString(),
        phone: testPatientUser.phone,
        role: testPatientUser.role,
        permissions: ['patient:read', 'patient:write'],
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  after(async () => {
    try {
      if (testPatientUser?._id) {
        await User.deleteOne({ _id: testPatientUser._id });
      }
    } catch {
      // ignore
    }
    await closeTestServer();
  });

  describe('1. MongoDB Credential Redaction and Safe Diagnostics', () => {
    it('Redacts username and password from mongodb:// connection URIs', () => {
      const rawUri = 'mongodb://app_user:SuperSecretPassword123!@10.0.4.12:27017/aegis_health?authSource=admin';
      const sanitized = sanitizeMongoUri(rawUri);

      assert.strictEqual(sanitized.includes('SuperSecretPassword123!'), false, 'Sanitized URI must not contain password');
      assert.strictEqual(sanitized.includes('app_user'), false, 'Sanitized URI must not contain username');
      assert.ok(sanitized.includes('//***:***@10.0.4.12:27017/aegis_health'), 'Should mask credentials with asterisks');
    });

    it('Redacts credentials from mongodb+srv:// atlas connection URIs', () => {
      const rawUri = 'mongodb+srv://hospital_admin:TopSecretClusterKey@cluster0.aegis.mongodb.net/production?retryWrites=true';
      const sanitized = sanitizeMongoUri(rawUri);

      assert.strictEqual(sanitized.includes('TopSecretClusterKey'), false, 'Sanitized URI must not contain secret key');
      assert.strictEqual(sanitized.includes('hospital_admin'), false, 'Sanitized URI must not contain username');
      assert.ok(sanitized.includes('//***:***@cluster0.aegis.mongodb.net/production'), 'Must safely mask atlas credentials');
    });

    it('Handles URI without credentials gracefully', () => {
      const rawUri = 'mongodb://localhost:27017/aegis_dev';
      const sanitized = sanitizeMongoUri(rawUri);

      assert.strictEqual(sanitized, 'mongodb://localhost:27017/aegis_dev');
    });

    it('Extracts safe diagnostic target without sensitive credentials', () => {
      const rawUri = 'mongodb+srv://user:pass@cluster0.hospital.net/clinical_records?retryWrites=true';
      const diag = getSafeDbDiagnosticInfo(rawUri);

      assert.strictEqual(diag.protocol, 'mongodb+srv');
      assert.strictEqual(diag.host, 'cluster0.hospital.net');
      assert.strictEqual(diag.database, 'clinical_records');
      assert.strictEqual(JSON.stringify(diag).includes('pass'), false);
      assert.strictEqual(JSON.stringify(diag).includes('user'), false);
    });
  });

  describe('2. Socket.IO Telehealth Log Privacy (Absence of PHI in Logs)', () => {
    it('Does not emit patient full names into server console logs upon connection', async () => {
      const capturedLogs: string[] = [];
      const originalConsoleLog = console.log;

      console.log = (...args: any[]) => {
        capturedLogs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
        originalConsoleLog(...args);
      };

      let clientSocket: Socket | null = null;
      try {
        clientSocket = ioClient(WS_BASE, {
          auth: { token: testPatientToken },
          transports: ['websocket'],
          reconnection: false,
        });

        await new Promise<void>((resolve, reject) => {
          clientSocket?.on('connect', () => resolve());
          clientSocket?.on('connect_error', (err) => reject(err));
        });

        // Verify captured logs
        const matchingLog = capturedLogs.find((l) => l.includes('[Socket.io] Authenticated user connected:'));
        assert.ok(matchingLog, 'Connection log should be recorded');
        assert.strictEqual(
          matchingLog?.includes('Confidential Patient Alpha'),
          false,
          'Patient full name must NOT be printed in connection log'
        );
        assert.ok(
          matchingLog?.includes(`userId=${testPatientUser._id}`),
          'Connection log should contain safe userId identifier'
        );
        assert.ok(
          matchingLog?.includes('role=PATIENT'),
          'Connection log should contain safe role identifier'
        );
      } finally {
        console.log = originalConsoleLog;
        if (clientSocket) {
          clientSocket.close();
        }
      }
    });
  });

  describe('3. Production vs Development Error Response Handling', () => {
    // Helper to test express error handler logic in isolation
    const buildTestApp = (envMode: string) => {
      const testApp = express();

      testApp.get('/test/unexpected-500', (_req: Request, _res: Response, next: NextFunction) => {
        const error: any = new Error('MongoServerError: sensitive schema error in /var/lib/mongo/secrets.db');
        error.code = 'INTERNAL_DB_CRASH';
        next(error);
      });

      testApp.get('/test/operational-400', (_req: Request, _res: Response, next: NextFunction) => {
        const error: any = new Error('Invalid consultation date supplied');
        error.status = 400;
        error.code = 'INVALID_INPUT';
        error.isOperational = true;
        next(error);
      });

      // Mirror app.ts error handler
      testApp.use((err: any, req: Request, res: Response, _next: NextFunction) => {
        const status = typeof err.status === 'number' && err.status >= 400 && err.status <= 599 ? err.status : 500;
        const isProd = envMode === 'production';
        const isDev = envMode === 'development';
        const isOperational = err.isOperational === true || (status >= 400 && status < 500);

        const safeMessage =
          isProd && !isOperational
            ? 'An unexpected clinical service error occurred. Please try again later.'
            : err.message || 'An unexpected clinical service error occurred. Please try again.';

        const safeCode =
          isProd && !isOperational && !err.code
            ? 'INTERNAL_SERVER_ERROR'
            : err.code || 'INTERNAL_SERVER_ERROR';

        res.status(status).json({
          success: false,
          error: {
            code: safeCode,
            message: safeMessage,
            details: isDev ? err.stack : undefined,
          },
        });
      });

      return testApp;
    };

    it('Masks raw internal error messages and omits stack trace in production mode', async () => {
      const testApp = buildTestApp('production');
      const server = testApp.listen(0);
      const port = (server.address() as any).port;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/test/unexpected-500`);
        assert.strictEqual(res.status, 500);

        const json: any = await res.json();
        assert.strictEqual(json.success, false);
        assert.strictEqual(
          json.error.message,
          'An unexpected clinical service error occurred. Please try again later.',
          'Production 500 error message must be generic'
        );
        assert.strictEqual(
          json.error.details,
          undefined,
          'Stack trace and details must be omitted in production'
        );
        assert.strictEqual(
          JSON.stringify(json).includes('/var/lib/mongo/secrets.db'),
          false,
          'Internal database path must never leak in response'
        );
      } finally {
        server.close();
      }
    });

    it('Preserves intentional operational client messages in production mode (4xx status)', async () => {
      const testApp = buildTestApp('production');
      const server = testApp.listen(0);
      const port = (server.address() as any).port;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/test/operational-400`);
        assert.strictEqual(res.status, 400);

        const json: any = await res.json();
        assert.strictEqual(json.success, false);
        assert.strictEqual(json.error.code, 'INVALID_INPUT');
        assert.strictEqual(
          json.error.message,
          'Invalid consultation date supplied',
          'Operational 4xx message should be preserved for client clarity'
        );
        assert.strictEqual(json.error.details, undefined);
      } finally {
        server.close();
      }
    });

    it('Provides detailed error message and stack trace in development mode', async () => {
      const testApp = buildTestApp('development');
      const server = testApp.listen(0);
      const port = (server.address() as any).port;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/test/unexpected-500`);
        assert.strictEqual(res.status, 500);

        const json: any = await res.json();
        assert.strictEqual(json.success, false);
        assert.strictEqual(
          json.error.message,
          'MongoServerError: sensitive schema error in /var/lib/mongo/secrets.db',
          'Development mode should provide detailed message for debugging'
        );
        assert.ok(typeof json.error.details === 'string', 'Development mode should provide stack details');
      } finally {
        server.close();
      }
    });
  });
});
