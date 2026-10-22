import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { ensureTestServer, closeTestServer } from './testSetup';

const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:5001/api/v1';

// Helper to make JSON requests
async function apiRequest(endpoint: string, options: { method?: string; token?: string; body?: any } = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
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
  return { status: response.status, data };
}

describe('AegisHealth Appointment Security & Concurrency Milestone Test Suite', () => {
  before(async () => {
    await ensureTestServer();
  });

  after(async () => {
    await closeTestServer();
  });
  let patientAToken: string;
  let patientBToken: string;
  let testDoctorId = '6ad20d8457d5731401876328'; // Dr. Ananya Deshmukh
  let testDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * (60 + Math.floor(Math.random() * 500))).toISOString().slice(0, 10);
  let slotTime = '10:00 AM';
  let rescheduleSlotTime = '11:00 AM';
  let appointmentAId: string;
  let appointmentBId: string;

  it('Setup: Authenticate Patient A and Patient B via OTP', async () => {
    // Authenticate Patient A (Primary demo patient)
    const resA = await apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: { phone: '9876543210', otp: '123456' },
    });
    assert.strictEqual(resA.status, 200, 'Patient A login should succeed');
    assert.ok(resA.data.data?.token, 'Patient A should receive JWT token');
    assert.strictEqual(resA.data.data?.user?.role, 'PATIENT');
    patientAToken = resA.data.data.token;

    // Authenticate Patient B (Secondary test patient)
    const resB = await apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: { phone: '9876543299', otp: '123456' },
    });
    assert.strictEqual(resB.status, 200, 'Patient B login should succeed');
    assert.ok(resB.data.data?.token, 'Patient B should receive JWT token');
    assert.strictEqual(resB.data.data?.user?.role, 'PATIENT');
    patientBToken = resB.data.data.token;
  });

  it('1. Unauthenticated booking attempt must fail with 401', async () => {
    const res = await apiRequest('/appointments/book', {
      method: 'POST',
      body: {
        doctorId: testDoctorId,
        appointmentDate: testDate,
        timeSlot: slotTime,
        mode: 'VIDEO',
      },
    });
    assert.strictEqual(res.status, 401, 'Should return 401 Unauthorized');
    assert.strictEqual(res.data.error?.code, 'UNAUTHORIZED');
  });

  it('2. Invalid input fails with 400 and structured validation errors', async () => {
    const res = await apiRequest('/appointments/book', {
      method: 'POST',
      token: patientAToken,
      body: {
        doctorId: 'not-a-valid-doctor-id',
        appointmentDate: 'not-a-date',
        // missing timeSlot and mode
      },
    });
    assert.strictEqual(res.status, 400, 'Should return 400 Bad Request');
    assert.strictEqual(res.data.error?.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.data.error?.details), 'Should provide schema validation error details');
  });

  it('3. Role escalation attempt during authentication must fail with 403', async () => {
    const res = await apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: {
        phone: '9888777666',
        otp: '123456',
        role: 'SUPER_ADMIN',
      },
    });
    assert.strictEqual(res.status, 403, 'Should reject self-assigned privileged role');
    assert.strictEqual(res.data.error?.code, 'FORBIDDEN_ROLE_ASSIGNMENT');
  });

  it('4. Successful appointment booking for Patient A persists in MongoDB', async () => {
    const res = await apiRequest('/appointments/book', {
      method: 'POST',
      token: patientAToken,
      body: {
        doctorId: testDoctorId,
        appointmentDate: testDate,
        timeSlot: slotTime,
        mode: 'VIDEO',
        chiefComplaint: 'Automated milestone health checkup test',
      },
    });

    assert.strictEqual(res.status, 201, 'Booking should return 201 Created');
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.data?._id, 'Should return persisted appointment ID');
    assert.strictEqual(res.data.data?.status, 'CONFIRMED');
    assert.strictEqual(res.data.data?.timeSlot, slotTime);
    assert.ok(res.data.data?.tokenNumber, 'Should generate an orderly queue token number');
    appointmentAId = res.data.data._id;
  });

  it('5. Conflicting slot booking (double-booking attempt) returns 409', async () => {
    // Patient B attempts to book the EXACT SAME doctor, date, and slot
    const res = await apiRequest('/appointments/book', {
      method: 'POST',
      token: patientBToken,
      body: {
        doctorId: testDoctorId,
        appointmentDate: testDate,
        timeSlot: slotTime,
        mode: 'IN_PERSON',
        chiefComplaint: 'Attempting conflicting booking',
      },
    });

    assert.strictEqual(res.status, 409, 'Conflict must return 409');
    assert.strictEqual(res.data.error?.code, 'SLOT_ALREADY_BOOKED');
  });

  it('6. Slot availability API correctly reflects booked vs available slots', async () => {
    const res = await apiRequest(`/doctors/${testDoctorId}/slots?date=${testDate}`, {
      token: patientAToken,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);

    const slot = res.data.data.slots.find((s: any) => s.time === slotTime);
    assert.ok(slot, 'Target slot should be in returned slots');
    assert.strictEqual(slot.available, false, 'Booked slot must be marked unavailable');

    const otherSlot = res.data.data.slots.find((s: any) => s.time === rescheduleSlotTime);
    assert.ok(otherSlot, 'Other slot should be present');
    assert.strictEqual(otherSlot.available, true, 'Unbooked slot must be marked available');
  });

  it('7. Unauthorized access check (IDOR): Patient B cannot cancel Patient A appointment', async () => {
    const res = await apiRequest(`/appointments/${appointmentAId}/cancel`, {
      method: 'PATCH',
      token: patientBToken,
      body: { reason: 'Malicious cancellation attempt' },
    });

    assert.strictEqual(res.status, 403, 'Should return 403 Forbidden on foreign appointment');
    assert.strictEqual(res.data.error?.code, 'FORBIDDEN');
  });

  it('8. Patient A successfully cancels appointment, releasing the slot index', async () => {
    const res = await apiRequest(`/appointments/${appointmentAId}/cancel`, {
      method: 'PATCH',
      token: patientAToken,
      body: { reason: 'Patient requested schedule adjustment' },
    });

    assert.strictEqual(res.status, 200, 'Cancellation should return 200 OK');
    assert.strictEqual(res.data.data?.status, 'CANCELLED');
    assert.ok(res.data.data?.cancellationReason);

    // Verify slot is immediately liberated for other patients
    const bookRes = await apiRequest('/appointments/book', {
      method: 'POST',
      token: patientBToken,
      body: {
        doctorId: testDoctorId,
        appointmentDate: testDate,
        timeSlot: slotTime,
        mode: 'VIDEO',
        chiefComplaint: 'Booking previously cancelled slot',
      },
    });

    assert.strictEqual(bookRes.status, 201, 'Liberated slot can now be booked by Patient B');
    appointmentBId = bookRes.data.data._id;
  });

  it('9. Rescheduling to an open slot succeeds and updates atomically', async () => {
    const res = await apiRequest(`/appointments/${appointmentBId}/reschedule`, {
      method: 'PATCH',
      token: patientBToken,
      body: {
        appointmentDate: testDate,
        timeSlot: rescheduleSlotTime,
      },
    });

    assert.strictEqual(res.status, 200, 'Rescheduling should return 200 OK');
    assert.strictEqual(res.data.data?.timeSlot, rescheduleSlotTime);
    assert.strictEqual(res.data.data?.status, 'CONFIRMED');
  });

  it('10. Dashboard retrieval strictly isolates Patient records', async () => {
    // Patient A calls my appointments
    const resA = await apiRequest('/appointments/my', {
      token: patientAToken,
    });
    assert.strictEqual(resA.status, 200);
    const apptsA = resA.data.data;
    assert.ok(Array.isArray(apptsA), 'Dashboard data should be an array');
    const hasPatientBAppt = apptsA.some((a: any) => a._id === appointmentBId);
    assert.strictEqual(hasPatientBAppt, false, "Patient A must NOT see Patient B's appointment");

    // Patient B calls my appointments
    const resB = await apiRequest('/appointments/my', {
      token: patientBToken,
    });
    assert.strictEqual(resB.status, 200);
    const apptsB = resB.data.data;
    const hasMyBAppt = apptsB.some((a: any) => a._id === appointmentBId);
    assert.strictEqual(hasMyBAppt, true, "Patient B should see their own appointment");
  });
});
