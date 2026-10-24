import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestServer, closeTestServer } from './testSetup';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Doctor } from '../models/Doctor';
import { Patient } from '../models/Patient';
import { Appointment } from '../models/Appointment';
import { MedicalRecord } from '../models/MedicalRecord';

const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:5002/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'aegishealth_jwt_secret_for_local_development_testing_only_min_32_chars';

describe('Stage 4 End-to-End Real Frontend-Backend-Database Integration Workflows', () => {
  let patientToken: string;
  let doctorToken: string;
  let testDoctor: any;
  let testPatient: any;
  let pUser: any;
  let dUser: any;

  before(async () => {
    await ensureTestServer();

    // Create synthetic patient user & patient profile
    pUser = await User.create({
      phone: `+919999${Math.floor(100000 + Math.random() * 900000)}`,
      fullName: 'Real Stage4 Patient',
      role: 'PATIENT',
      isVerified: true,
      permissions: ['patient:read', 'patient:write'],
    });

    testPatient = await Patient.create({
      userId: pUser._id,
      fullName: 'Real Stage4 Patient',
      dob: new Date('1992-05-15'),
      gender: 'MALE',
      bloodGroup: 'B+',
      allergies: [],
      chronicConditions: ['Mild Asthma'],
      emergencyContact: { name: 'Emergency Kin', relationship: 'Family', phone: '+919999000000' },
      address: { city: 'Bangalore', state: 'Karnataka', postalCode: '560001' },
      healthScore: 89,
      familyMembers: [],
    });

    patientToken = jwt.sign(
      { id: pUser._id.toString(), phone: pUser.phone, role: 'PATIENT', permissions: pUser.permissions },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create synthetic doctor user & doctor profile
    dUser = await User.create({
      phone: `+919888${Math.floor(100000 + Math.random() * 900000)}`,
      fullName: 'Dr. Real Stage4 Specialist',
      role: 'DOCTOR',
      isVerified: true,
      permissions: ['doctor:read', 'doctor:write', 'prescription:create'],
    });

    testDoctor = await Doctor.create({
      userId: dUser._id,
      fullName: 'Dr. Real Stage4 Specialist',
      title: 'Dr.',
      avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300',
      registrationNumber: `REG-ST4-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      registrationCouncil: 'Karnataka Medical Council',
      experienceYears: 15,
      qualifications: [{ degree: 'MBBS', college: 'AIIMS', year: 2011 }],
      specialties: ['Cardiologist'],
      consultationModes: ['VIDEO', 'IN_PERSON'],
      pricing: { inPersonFee: 900, videoFee: 700, homeVisitFee: 2000, currency: 'INR' },
      clinicAffiliations: [{ clinicName: 'Metropolitan Heart Center', city: 'Bangalore' }],
      verificationStatus: 'VERIFIED',
      ratingAverage: 4.9,
      ratingCount: 150,
      slotDurationMinutes: 20,
      availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      nextAvailableSlot: 'Today, 04:00 PM',
    });

    doctorToken = jwt.sign(
      { id: dUser._id.toString(), phone: dUser.phone, role: 'DOCTOR', permissions: dUser.permissions },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('1. Doctor Search, Multi-Filter & Public Profile Discovery', () => {
    it('returns verified doctors with public fields and filters by specialty', async () => {
      const res = await fetch(`${API_BASE}/doctors?specialty=Cardiologist`);
      assert.strictEqual(res.status, 200);
      const json: any = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(Array.isArray(json.data.doctors));
      assert.ok(json.data.doctors.length >= 1);

      const found = json.data.doctors.find((d: any) => d._id === testDoctor._id.toString());
      assert.ok(found, 'Should find the created test doctor');
      assert.strictEqual(found.fullName, 'Dr. Real Stage4 Specialist');
      assert.strictEqual(found.pricing.videoFee, 700);
    });

    it('returns empty list gracefully when no doctors match filter', async () => {
      const res = await fetch(`${API_BASE}/doctors?specialty=NonExistentSpecialty12345`);
      assert.strictEqual(res.status, 200);
      const json: any = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.doctors.length, 0);
    });

    it('fetches single doctor profile by ID with 404 for nonexistent ID', async () => {
      const okRes = await fetch(`${API_BASE}/doctors/${testDoctor._id}`);
      assert.strictEqual(okRes.status, 200);
      const okJson: any = await okRes.json();
      assert.strictEqual(okJson.data._id, testDoctor._id.toString());

      const notFoundRes = await fetch(`${API_BASE}/doctors/507f1f77bcf86cd799439011`);
      assert.strictEqual(notFoundRes.status, 404);
    });
  });

  describe('2. Live Slot Availability & Appointment Concurrency Booking', () => {
    const testDate = '2026-11-20';
    const testSlot = '10:00 AM';

    it('verifies slot is initially available via GET /doctors/:id/slots', async () => {
      const res = await fetch(`${API_BASE}/doctors/${testDoctor._id}/slots?date=${testDate}`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      assert.strictEqual(res.status, 200);
      const json: any = await res.json();
      assert.strictEqual(json.success, true);
      const slotObj = json.data.slots.find((s: any) => s.time === testSlot);
      assert.ok(slotObj);
      assert.strictEqual(slotObj.available, true);
    });

    it('patient successfully books appointment and slot becomes booked', async () => {
      const bookRes = await fetch(`${API_BASE}/appointments/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify({
          doctorId: testDoctor._id.toString(),
          appointmentDate: testDate,
          timeSlot: testSlot,
          mode: 'VIDEO',
          symptoms: ['Follow-up consultation for cardiac review'],
        }),
      });

      assert.strictEqual(bookRes.status, 201);
      const bookJson: any = await bookRes.json();
      assert.strictEqual(bookJson.success, true);
      assert.strictEqual(bookJson.data.timeSlot, testSlot);
      assert.ok(bookJson.data.appointmentNumber);

      // Verify slot is now marked booked
      const slotCheck = await fetch(`${API_BASE}/doctors/${testDoctor._id}/slots?date=${testDate}`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      const slotJson: any = await slotCheck.json();
      const slotObj = slotJson.data.slots.find((s: any) => s.time === testSlot);
      assert.ok(slotObj);
      assert.strictEqual(slotObj.available, false, 'Booked slot must now report available: false');
    });

    it('rejects duplicate booking for the same slot with 409 conflict', async () => {
      const dupRes = await fetch(`${API_BASE}/appointments/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify({
          doctorId: testDoctor._id.toString(),
          appointmentDate: testDate,
          timeSlot: testSlot,
          mode: 'VIDEO',
          symptoms: ['Duplicate booking attempt'],
        }),
      });

      assert.strictEqual(dupRes.status, 409);
      const dupJson: any = await dupRes.json();
      assert.strictEqual(dupJson.error.code, 'SLOT_ALREADY_BOOKED');
    });
  });

  describe('3. Role-Scoped Appointment Dashboard & Doctor OPD Queue Integration', () => {
    it('Patient retrieves only their own booked appointments via GET /appointments/my', async () => {
      const res = await fetch(`${API_BASE}/appointments/my`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      assert.strictEqual(res.status, 200);
      const json: any = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(Array.isArray(json.data));
      assert.ok(json.data.length >= 1);
      json.data.forEach((appt: any) => {
        assert.strictEqual(appt.patientId, testPatient._id.toString(), 'Must only contain appointments for this patient');
      });
    });

    it('Doctor retrieves their clinical OPD schedule via GET /appointments/my and GET /appointments/doctor-queue', async () => {
      // 1. Doctor appointments list
      const docApptsRes = await fetch(`${API_BASE}/appointments/my`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      assert.strictEqual(docApptsRes.status, 200);
      const docApptsJson: any = await docApptsRes.json();
      assert.strictEqual(docApptsJson.success, true);
      assert.ok(Array.isArray(docApptsJson.data));

      // 2. Doctor OPD Queue
      const queueRes = await fetch(`${API_BASE}/appointments/doctor-queue`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      assert.strictEqual(queueRes.status, 200);
      const queueJson: any = await queueRes.json();
      assert.strictEqual(queueJson.success, true);
      assert.strictEqual(queueJson.data.doctorName, 'Dr. Real Stage4 Specialist');
      assert.ok(Array.isArray(queueJson.data.queue));
    });

    it('Rejects non-clinicians from accessing GET /appointments/doctor-queue with 403', async () => {
      const res = await fetch(`${API_BASE}/appointments/doctor-queue`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      assert.strictEqual(res.status, 403);
    });
  });

  describe('4. Medical Records & EMR Timeline Real Storage', () => {
    it('patient uploads a real clinical report and retrieves it in the longitudinal timeline', async () => {
      const uploadRes = await fetch(`${API_BASE}/records/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify({
          title: 'Comprehensive Lipid & Glycemic Panel',
          category: 'Pathology & Biochemistry',
          summary: 'Verified clinical laboratory accessioning.',
          encounterType: 'LAB_REPORT',
          biomarkers: [
            { name: 'HbA1c', value: '6.2', unit: '%', referenceRange: '< 5.7%', status: 'ELEVATED' },
          ],
          aiInsights: 'Glycemic control trend showing steady improvement.',
        }),
      });

      assert.strictEqual(uploadRes.status, 201);
      const uploadJson: any = await uploadRes.json();
      assert.strictEqual(uploadJson.success, true);
      assert.strictEqual(uploadJson.data.title, 'Comprehensive Lipid & Glycemic Panel');

      // Verify retrieval in timeline
      const timelineRes = await fetch(`${API_BASE}/records/timeline`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      assert.strictEqual(timelineRes.status, 200);
      const timelineJson: any = await timelineRes.json();
      assert.strictEqual(timelineJson.success, true);
      assert.ok(Array.isArray(timelineJson.data.records));
      const foundRecord = timelineJson.data.records.find((r: any) => r._id === uploadJson.data._id);
      assert.ok(foundRecord, 'Uploaded record must be present in patient timeline');
      assert.strictEqual(foundRecord.extractedBiomarkers[0].name, 'HbA1c');
      assert.strictEqual(foundRecord.extractedBiomarkers[0].value, '6.2');
    });
  });

  after(async () => {
    if (testDoctor?._id) {
      await Doctor.deleteOne({ _id: testDoctor._id });
    }
    if (testPatient?._id) {
      await Patient.deleteOne({ _id: testPatient._id });
    }
    if (pUser?._id) {
      await User.deleteOne({ _id: pUser._id });
    }
    if (dUser?._id) {
      await User.deleteOne({ _id: dUser._id });
    }
    await Appointment.deleteMany({
      patientName: 'Real Stage4 Patient',
    });
    await MedicalRecord.deleteMany({
      title: 'Comprehensive Lipid & Glycemic Panel',
    });
    await closeTestServer();
  });
});
