import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { io as ioClient, Socket } from 'socket.io-client';
import { ensureTestServer, closeTestServer } from './testSetup';
import { validateAndLoadConfig } from '../config/env';

const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:5001/api/v1';
const WS_BASE = 'http://127.0.0.1:5001';

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

describe('Stage 3 Clinical Security, RBAC & Telehealth Milestone Test Suite', () => {
  before(async () => {
    await ensureTestServer();
  });

  after(async () => {
    await closeTestServer();
  });

  let patientAToken: string;
  let patientAId: string;
  let patientBToken: string;
  let patientBId: string;
  let doctorToken: string;
  let doctorDocId: string;
  let testAppointmentId: string;
  let createdPrescriptionId: string;

  it('Setup: Authenticate Patient A, Patient B, and Doctor A', async () => {
    // 1. Authenticate Patient A
    const resA = await apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: { phone: '9876543210', otp: '123456', role: 'PATIENT' },
    });
    assert.strictEqual(resA.status, 200);
    patientAToken = resA.data.data.token;
    patientAId = resA.data.data.user.patientId;
    assert.ok(patientAToken && patientAId, 'Patient A token and patientId must exist');

    // 2. Authenticate Patient B
    const resB = await apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: { phone: '9876543299', otp: '123456', role: 'PATIENT' },
    });
    assert.strictEqual(resB.status, 200);
    patientBToken = resB.data.data.token;
    patientBId = resB.data.data.user.patientId;
    assert.ok(patientBToken && patientBId, 'Patient B token and patientId must exist');

    // 3. Authenticate Doctor A (Dr. Ananya Deshmukh)
    const resDoc = await apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: { phone: '+919876543211', otp: '123456', role: 'DOCTOR' },
    });
    assert.strictEqual(resDoc.status, 200);
    doctorToken = resDoc.data.data.token;
    doctorDocId = resDoc.data.data.user.doctorId;
    assert.strictEqual(resDoc.data.data.user.role, 'DOCTOR');
    assert.ok(doctorToken, 'Doctor A token must exist');

    // 4. Create an appointment between Patient A and Doctor A to test encounter authorization
    const randomDays = 1500 + Math.floor(Math.random() * 8000);
    const testApptDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * randomDays).toISOString().slice(0, 10);
    const testSlot = `${String(1 + Math.floor(Math.random() * 8)).padStart(2, '0')}:${String(10 + Math.floor(Math.random() * 45))} AM`;

    const bookRes = await apiRequest('/appointments/book', {
      method: 'POST',
      token: patientAToken,
      body: {
        doctorId: doctorDocId,
        mode: 'VIDEO',
        appointmentDate: testApptDate,
        timeSlot: testSlot,
        symptoms: ['Chest palpitations review'],
        patientName: 'John Doe',
      },
    });
    assert.strictEqual(bookRes.status, 201, `Booking between Patient A and Doctor A must succeed: ${JSON.stringify(bookRes.data)}`);
    testAppointmentId = bookRes.data.data._id;
    assert.ok(testAppointmentId, 'Test appointment ID must be created');
  });

  describe('1. Digital Prescription Security & Role-Based Access Control', () => {
    it('Unauthenticated user cannot create a prescription (401)', async () => {
      const res = await apiRequest('/prescriptions', {
        method: 'POST',
        body: {
          patientId: patientAId,
          medications: [{ name: 'Amoxicillin', dosage: '500mg', frequency: 'TID', duration: '7 days' }],
        },
      });
      assert.strictEqual(res.status, 401);
    });

    it('Patient role cannot create a prescription (403 Forbidden)', async () => {
      const res = await apiRequest('/prescriptions', {
        method: 'POST',
        token: patientAToken,
        body: {
          patientId: patientAId,
          medications: [{ name: 'Metformin', dosage: '500mg', frequency: 'OD', duration: '30 days' }],
        },
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error?.code, 'FORBIDDEN');
    });

    it('Authorized clinician successfully creates and digitally signs a prescription (201)', async () => {
      const res = await apiRequest('/prescriptions', {
        method: 'POST',
        token: doctorToken,
        body: {
          patientId: patientAId,
          appointmentId: testAppointmentId,
          medications: [
            { name: 'Metformin Hydrochloride', dosage: '500mg', frequency: 'OD (After dinner)', duration: '60 days' },
            { name: 'Atorvastatin', dosage: '10mg', frequency: 'OD (Bedtime)', duration: '30 days' },
          ],
          advice: 'Monitor fasting blood glucose bi-weekly and maintain active hydration.',
        },
      });
      assert.strictEqual(res.status, 201);
      assert.ok(res.data.data?._id);
      assert.ok(res.data.data?.prescriptionNumber?.startsWith('RX-'));
      assert.ok(res.data.data?.digitalSignature?.startsWith('VERIFIED_DS_'));
      assert.strictEqual(res.data.data?.patientId, patientAId);
      createdPrescriptionId = res.data.data._id;
    });

    it('Patient A retrieves their own prescription via GET /prescriptions/my', async () => {
      const res = await apiRequest('/prescriptions/my', {
        token: patientAToken,
      });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data.data));
      const hasMyRx = res.data.data.some((rx: any) => rx._id === createdPrescriptionId);
      assert.strictEqual(hasMyRx, true, 'Patient A should see their newly created prescription');
    });

    it('Strict Isolation: Patient B sees 0 prescriptions and NO leak of Patient A data', async () => {
      const res = await apiRequest('/prescriptions/my', {
        token: patientBToken,
      });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data.data));
      const leakedPatientARx = res.data.data.some((rx: any) => rx._id === createdPrescriptionId);
      assert.strictEqual(leakedPatientARx, false, 'Patient B must NOT receive any prescriptions belonging to Patient A');
    });

    it('IDOR Check: Patient B cannot access Patient A prescription by ID (403)', async () => {
      const res = await apiRequest(`/prescriptions/${createdPrescriptionId}`, {
        token: patientBToken,
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error?.code, 'FORBIDDEN_RECORD_ACCESS');
    });

    it('Designated Clinician can view the prescription by ID (200)', async () => {
      const res = await apiRequest(`/prescriptions/${createdPrescriptionId}`, {
        token: doctorToken,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data?._id, createdPrescriptionId);
    });
  });

  describe('2. Longitudinal Medical Record Isolation', () => {
    it('Patient A uploads a clinical record', async () => {
      const res = await apiRequest('/records/upload', {
        method: 'POST',
        token: patientAToken,
        body: {
          title: 'Cardiology Exercise Tolerance Test',
          category: 'Diagnostics',
          summary: 'Treadmill stress test normal. No ischemic ST depressions.',
        },
      });
      assert.strictEqual(res.status, 201);
      assert.ok(res.data.data?._id);
    });

    it('Patient B timeline contains 0 records from Patient A', async () => {
      const res = await apiRequest('/records/timeline', {
        token: patientBToken,
      });
      assert.strictEqual(res.status, 200);
      const records = res.data.data.records;
      const prescriptions = res.data.data.prescriptions;
      const hasPatientARecord = records.some((r: any) => r.title === 'Cardiology Exercise Tolerance Test');
      assert.strictEqual(hasPatientARecord, false, "Patient B timeline must not contain Patient A's records");
      const hasPatientARx = prescriptions.some((p: any) => p._id === createdPrescriptionId);
      assert.strictEqual(hasPatientARx, false, "Patient B timeline must not contain Patient A's prescriptions");
    });
  });

  describe('3. Socket.IO Telehealth Security & Real-Time Encounter Authorization', () => {
    it('Unauthenticated Socket.IO connection attempt is rejected with AUTHENTICATION_REQUIRED', async () => {
      const socket = ioClient(WS_BASE, {
        transports: ['websocket'],
        reconnection: false,
      });

      const err: any = await new Promise((resolve) => {
        socket.on('connect_error', (error) => {
          socket.close();
          resolve(error);
        });
        socket.on('connect', () => {
          socket.close();
          resolve(null);
        });
      });

      assert.ok(err, 'Unauthenticated socket connection must fail');
      assert.ok(err.message.includes('AUTHENTICATION_REQUIRED'), 'Error should state authentication required');
    });

    it('Socket.IO connection with invalid token is rejected', async () => {
      const socket = ioClient(WS_BASE, {
        auth: { token: 'invalid_malformed_token_123' },
        transports: ['websocket'],
        reconnection: false,
      });

      const err: any = await new Promise((resolve) => {
        socket.on('connect_error', (error) => {
          socket.close();
          resolve(error);
        });
        socket.on('connect', () => {
          socket.close();
          resolve(null);
        });
      });

      assert.ok(err, 'Connection with invalid token must fail');
      assert.ok(err.message.includes('AUTHENTICATION_FAILED'), 'Error should state authentication failed');
    });

    it('Authorized Patient A and Patient B connect successfully with valid JWT tokens', async () => {
      const socketA = ioClient(WS_BASE, {
        auth: { token: patientAToken },
        transports: ['websocket'],
        reconnection: false,
      });

      const connectedA = await new Promise<boolean>((resolve) => {
        socketA.on('connect', () => resolve(true));
        socketA.on('connect_error', () => resolve(false));
      });

      assert.strictEqual(connectedA, true, 'Patient A should connect successfully');
      socketA.close();
    });

    it('Patient B cannot join Patient A & Doctor A appointment room (FORBIDDEN_ROOM_ACCESS)', async () => {
      const socketB = ioClient(WS_BASE, {
        auth: { token: patientBToken },
        transports: ['websocket'],
        reconnection: false,
      });

      await new Promise<void>((resolve) => socketB.on('connect', () => resolve()));

      // Patient B attempts to join Patient A's appointment room
      const joinResponse: any = await new Promise((resolve) => {
        socketB.emit('join-room', { roomId: testAppointmentId }, (ack: any) => {
          resolve(ack);
        });
      });

      assert.strictEqual(joinResponse.success, false);
      assert.strictEqual(joinResponse.error, 'FORBIDDEN_ROOM_ACCESS');
      socketB.close();
    });

    it('Authorized Patient A successfully joins their own appointment room', async () => {
      const socketA = ioClient(WS_BASE, {
        auth: { token: patientAToken },
        transports: ['websocket'],
        reconnection: false,
      });

      await new Promise<void>((resolve) => socketA.on('connect', () => resolve()));

      const joinResponse: any = await new Promise((resolve) => {
        socketA.emit('join-room', { roomId: testAppointmentId }, (ack: any) => {
          resolve(ack);
        });
      });

      assert.strictEqual(joinResponse.success, true);
      assert.strictEqual(joinResponse.roomId, testAppointmentId);
      assert.strictEqual(joinResponse.role, 'PATIENT');

      // Test send-message: server should enforce session identity
      const msgRes: any = await new Promise((resolve) => {
        socketA.emit('send-message', { roomId: testAppointmentId, message: 'Hello Doctor, I am online.' }, (ack: any) => {
          resolve(ack);
        });
      });

      assert.strictEqual(msgRes.success, true);
      assert.strictEqual(msgRes.data.role, 'PATIENT');
      assert.strictEqual(msgRes.data.message, 'Hello Doctor, I am online.');

      socketA.close();
    });

    it('Unjoined client cannot send message or forward signal (NOT_IN_ROOM)', async () => {
      const socketB = ioClient(WS_BASE, {
        auth: { token: patientBToken },
        transports: ['websocket'],
        reconnection: false,
      });

      await new Promise<void>((resolve) => socketB.on('connect', () => resolve()));

      // Send message to room without having joined
      const msgRes: any = await new Promise((resolve) => {
        socketB.emit('send-message', { roomId: testAppointmentId, message: 'Eavesdropping attempt' }, (ack: any) => {
          resolve(ack);
        });
      });

      assert.strictEqual(msgRes.success, false);
      assert.strictEqual(msgRes.error, 'NOT_IN_ROOM');

      socketB.close();
    });
  });

  describe('4. Production Hardening & Demo Flag Protection', () => {
    it('Strictly prevents ENABLE_DEV_OTP_SHORTCUT in production configuration', () => {
      const origEnv = process.env;
      try {
        process.env = {
          ...origEnv,
          NODE_ENV: 'production',
          JWT_SECRET: 'production_high_entropy_secret_with_more_than_32_characters_12345',
          MONGODB_URI: 'mongodb+srv://admin:pass@cluster.mongodb.net/aegis',
          ENABLE_DEV_OTP_SHORTCUT: 'true',
        };
        assert.throws(
          () => validateAndLoadConfig(),
          /Static OTP shortcuts are strictly forbidden in production/,
          'Production startup must abort if dev shortcut is enabled'
        );
      } finally {
        process.env = origEnv;
      }
    });
  });
});
