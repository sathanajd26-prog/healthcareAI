import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { io as ioClient } from 'socket.io-client';
import { ensureTestServer, closeTestServer } from './testSetup';
import { User } from '../models/User';
import { Patient } from '../models/Patient';
import { Doctor } from '../models/Doctor';
import { Appointment } from '../models/Appointment';
import { MedicalRecord } from '../models/MedicalRecord';

const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:5002/api/v1';
const WS_BASE = process.env.WS_BASE_URL || 'http://127.0.0.1:5002';
const JWT_SECRET = process.env.JWT_SECRET || 'aegishealth_jwt_secret_for_local_development_testing_only_min_32_chars';

describe('Stage 6.1 Phase 5: Authorization & Validation Hardening Test Suite', () => {
  let patientUser: any;
  let patientProfile: any;
  let doctorUser: any;
  let doctorProfile: any;
  let unrelatedDoctorUser: any;
  let unrelatedDoctorProfile: any;
  let patientBUser: any;
  let patientBProfile: any;

  let activeAppointment: any;
  let cancelledAppointment: any;

  before(async () => {
    await ensureTestServer();

    // 1. Create Patient A
    patientUser = await User.create({
      phone: `+919711${Math.floor(100000 + Math.random() * 900000)}`,
      fullName: 'AuthHarden Patient Alpha',
      role: 'PATIENT',
      isVerified: true,
      tokenVersion: 0,
      permissions: ['patient:read', 'patient:write'],
    });

    patientProfile = await Patient.create({
      userId: patientUser._id,
      fullName: patientUser.fullName,
      dob: new Date('1990-01-01'),
      gender: 'FEMALE',
      bloodGroup: 'A+',
      allergies: [],
      chronicConditions: [],
      emergencyContact: { name: 'Kin Alpha', relationship: 'Parent', phone: patientUser.phone },
      address: { city: 'Bangalore', state: 'Karnataka', postalCode: '560001' },
      familyMembers: [],
    });

    // 2. Create Patient B
    patientBUser = await User.create({
      phone: `+919722${Math.floor(100000 + Math.random() * 900000)}`,
      fullName: 'AuthHarden Patient Beta',
      role: 'PATIENT',
      isVerified: true,
      tokenVersion: 0,
      permissions: ['patient:read', 'patient:write'],
    });

    patientBProfile = await Patient.create({
      userId: patientBUser._id,
      fullName: patientBUser.fullName,
      dob: new Date('1993-05-12'),
      gender: 'MALE',
      bloodGroup: 'B+',
      allergies: [],
      chronicConditions: [],
      emergencyContact: { name: 'Kin Beta', relationship: 'Sibling', phone: patientBUser.phone },
      address: { city: 'Bangalore', state: 'Karnataka', postalCode: '560002' },
      familyMembers: [],
    });

    // 3. Create Doctor A (Has encounter with Patient A)
    doctorUser = await User.create({
      phone: `+919733${Math.floor(100000 + Math.random() * 900000)}`,
      fullName: 'Dr. AuthHarden Attending',
      role: 'DOCTOR',
      isVerified: true,
      tokenVersion: 0,
      permissions: ['doctor:read', 'doctor:write'],
    });

    doctorProfile = await Doctor.create({
      userId: doctorUser._id,
      fullName: doctorUser.fullName,
      registrationNumber: `REG-AUTH-${Date.now()}-1`,
      registrationCouncil: 'Karnataka Medical Council',
      specialties: ['Cardiology'],
      qualifications: [{ degree: 'MBBS', college: 'AIIMS', year: 2011 }],
      experienceYears: 12,
      consultationFee: 900,
      rating: 4.9,
      languages: ['English', 'Hindi'],
      isAvailableToday: true,
      bio: 'Cardiology specialist.',
    });

    // 4. Create Unrelated Doctor B (No encounter with Patient A)
    unrelatedDoctorUser = await User.create({
      phone: `+919744${Math.floor(100000 + Math.random() * 900000)}`,
      fullName: 'Dr. AuthHarden Unrelated',
      role: 'DOCTOR',
      isVerified: true,
      tokenVersion: 0,
      permissions: ['doctor:read', 'doctor:write'],
    });

    unrelatedDoctorProfile = await Doctor.create({
      userId: unrelatedDoctorUser._id,
      fullName: unrelatedDoctorUser.fullName,
      registrationNumber: `REG-AUTH-${Date.now()}-2`,
      registrationCouncil: 'Maharashtra Medical Council',
      specialties: ['Dermatology'],
      qualifications: [{ degree: 'MBBS', college: 'GMC', year: 2015 }],
      experienceYears: 8,
      consultationFee: 800,
      rating: 4.7,
      languages: ['English'],
      isAvailableToday: true,
      bio: 'Dermatologist.',
    });

    // 5. Create Active (CONFIRMED) Appointment between Patient A & Doctor A
    activeAppointment = await Appointment.create({
      appointmentNumber: `APPT-AUTH-${Date.now()}-1`,
      patientId: patientProfile._id,
      patientName: patientProfile.fullName,
      doctorId: doctorProfile._id,
      doctorName: doctorProfile.fullName,
      doctorSpecialty: 'Cardiology',
      appointmentDate: new Date(Date.now() + 86400000),
      timeSlot: '10:00 AM',
      mode: 'VIDEO',
      status: 'CONFIRMED',
      telemedicineRoomId: `room-auth-active-${Date.now()}`,
    });

    // 6. Create Cancelled Appointment between Patient A & Doctor A
    cancelledAppointment = await Appointment.create({
      appointmentNumber: `APPT-AUTH-${Date.now()}-2`,
      patientId: patientProfile._id,
      patientName: patientProfile.fullName,
      doctorId: doctorProfile._id,
      doctorName: doctorProfile.fullName,
      doctorSpecialty: 'Cardiology',
      appointmentDate: new Date(Date.now() + 172800000),
      timeSlot: '11:00 AM',
      mode: 'VIDEO',
      status: 'CANCELLED',
      cancellationReason: 'Patient schedule conflict',
      telemedicineRoomId: `room-auth-cancelled-${Date.now()}`,
    });
  });

  after(async () => {
    // Cleanup created test records
    await MedicalRecord.deleteMany({ patientId: { $in: [patientProfile._id, patientBProfile._id] } });
    await Appointment.deleteMany({ _id: { $in: [activeAppointment._id, cancelledAppointment._id] } });
    await Doctor.deleteMany({ _id: { $in: [doctorProfile._id, unrelatedDoctorProfile._id] } });
    await Patient.deleteMany({ _id: { $in: [patientProfile._id, patientBProfile._id] } });
    await User.deleteMany({
      _id: { $in: [patientUser._id, patientBUser._id, doctorUser._id, unrelatedDoctorUser._id] },
    });
    await closeTestServer();
  });

  describe('1. SEC-04: JWT Session Revocation & Logout Invalidation', () => {
    it('Valid login token with tokenVersion allows access to protected endpoints', async () => {
      const validToken = jwt.sign(
        { id: patientUser._id.toString(), role: 'PATIENT', permissions: patientUser.permissions, tokenVersion: 0 },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${validToken}` },
      });

      assert.strictEqual(res.status, 200, 'Valid token should be accepted with 200 OK');
      const json: any = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.user._id, patientUser._id.toString());
    });

    it('POST /auth/logout increments user tokenVersion in database', async () => {
      const userBefore = await User.findById(patientUser._id);
      const versionBefore = userBefore?.tokenVersion ?? 0;

      const token = jwt.sign(
        { id: patientUser._id.toString(), role: 'PATIENT', permissions: patientUser.permissions, tokenVersion: versionBefore },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const logoutRes = await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      assert.strictEqual(logoutRes.status, 200, 'Logout should succeed with 200 OK');
      const logoutJson: any = await logoutRes.json();
      assert.strictEqual(logoutJson.success, true);
      assert.strictEqual(logoutJson.message, 'Session terminated successfully');

      const userAfter = await User.findById(patientUser._id);
      assert.strictEqual(userAfter?.tokenVersion, versionBefore + 1, 'tokenVersion must be incremented by 1');
      assert.ok(userAfter?.lastLogoutAt, 'lastLogoutAt timestamp must be recorded');
    });

    it('Subsequent protected requests with the logged-out token are rejected with 401 TOKEN_REVOKED', async () => {
      // The token used before logout had tokenVersion: 0, but user now has tokenVersion: 1
      const staleToken = jwt.sign(
        { id: patientUser._id.toString(), role: 'PATIENT', permissions: patientUser.permissions, tokenVersion: 0 },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${staleToken}` },
      });

      assert.strictEqual(res.status, 401, 'Logged-out token must be rejected with 401');
      const json: any = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error?.code, 'TOKEN_REVOKED', 'Error code must be TOKEN_REVOKED');
    });

    it('Re-authenticating produces new token with incremented tokenVersion that succeeds', async () => {
      const user = await User.findById(patientUser._id);
      const currentVersion = user?.tokenVersion ?? 0;

      const freshToken = jwt.sign(
        { id: patientUser._id.toString(), role: 'PATIENT', permissions: patientUser.permissions, tokenVersion: currentVersion },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${freshToken}` },
      });

      assert.strictEqual(res.status, 200, 'Fresh token with current tokenVersion must succeed');
    });

    it('Backward compatibility: legacy token without tokenVersion is rejected after logout', async () => {
      // Create a dedicated legacy user
      const legacyUser = await User.create({
        phone: `+919755${Math.floor(100000 + Math.random() * 900000)}`,
        fullName: 'Legacy Token User',
        role: 'PATIENT',
        isVerified: true,
        tokenVersion: 0,
      });

      // Legacy token has NO tokenVersion field in payload
      const legacyToken = jwt.sign(
        { id: legacyUser._id.toString(), role: 'PATIENT', permissions: [] },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // 1. Initial request before logout should succeed
      const initialRes = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${legacyToken}` },
      });
      assert.strictEqual(initialRes.status, 200, 'Legacy token should work before logout');

      // 2. Perform logout
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${legacyToken}` },
      });

      // 3. Subsequent request with legacy token must be rejected
      const afterLogoutRes = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${legacyToken}` },
      });
      assert.strictEqual(afterLogoutRes.status, 401, 'Legacy token must be rejected after logout');
      const afterLogoutJson: any = await afterLogoutRes.json();
      assert.strictEqual(afterLogoutJson.error?.code, 'TOKEN_REVOKED');

      await User.deleteOne({ _id: legacyUser._id });
    });

    it('Socket.IO handshake with a revoked token is rejected with TOKEN_REVOKED', async () => {
      // User patientUser now has tokenVersion >= 1. Provide token with tokenVersion: 0
      const revokedToken = jwt.sign(
        { id: patientUser._id.toString(), role: 'PATIENT', permissions: patientUser.permissions, tokenVersion: 0 },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const socket = ioClient(WS_BASE, {
        auth: { token: revokedToken },
        transports: ['websocket'],
        reconnection: false,
      });

      const err: any = await new Promise((resolve) => {
        socket.on('connect_error', (e) => resolve(e));
        socket.on('connect', () => resolve(null));
      });

      assert.ok(err, 'Socket connection with revoked token must fail');
      assert.ok(err.message.includes('TOKEN_REVOKED'), 'Error must specify TOKEN_REVOKED');
      socket.close();
    });
  });

  describe('2. SEC-07: Medical Record Upload Validation & Encounter Authorization', () => {
    let patientAToken: string;
    let doctorAToken: string;
    let unrelatedDoctorToken: string;

    before(async () => {
      const pUser = await User.findById(patientUser._id);
      patientAToken = jwt.sign(
        { id: patientUser._id.toString(), role: 'PATIENT', permissions: patientUser.permissions, tokenVersion: pUser?.tokenVersion },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const dUser = await User.findById(doctorUser._id);
      doctorAToken = jwt.sign(
        { id: doctorUser._id.toString(), role: 'DOCTOR', permissions: doctorUser.permissions, tokenVersion: dUser?.tokenVersion },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const uUser = await User.findById(unrelatedDoctorUser._id);
      unrelatedDoctorToken = jwt.sign(
        { id: unrelatedDoctorUser._id.toString(), role: 'DOCTOR', permissions: unrelatedDoctorUser.permissions, tokenVersion: uUser?.tokenVersion },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('Rejects record upload with 400 VALIDATION_ERROR on invalid request fields', async () => {
      const res = await fetch(`${API_BASE}/records/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientAToken}`,
        },
        body: JSON.stringify({
          title: '', // empty title violates min(1)
          vitals: { systolicBP: 9999 }, // systolicBP exceeds max(300)
        }),
      });

      assert.strictEqual(res.status, 400, 'Invalid request fields must return 400');
      const json: any = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error?.code, 'VALIDATION_ERROR');
    });

    it('Doctor upload without patientId fails with 400 INVALID_PATIENT_ID', async () => {
      const res = await fetch(`${API_BASE}/records/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${doctorAToken}`,
        },
        body: JSON.stringify({
          title: 'Consultation Note',
          summary: 'Patient presented with chest tightness.',
        }),
      });

      assert.strictEqual(res.status, 400, 'Clinician upload without patientId must fail with 400');
      const json: any = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error?.code, 'INVALID_PATIENT_ID');
    });

    it('Doctor upload for patient with NO prior encounter fails with 403 FORBIDDEN_CLINICAL_ACCESS', async () => {
      // Unrelated Doctor B has NO appointment/encounter with Patient A
      const res = await fetch(`${API_BASE}/records/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${unrelatedDoctorToken}`,
        },
        body: JSON.stringify({
          patientId: patientProfile._id.toString(),
          title: 'Unsolicited Dermatology Evaluation',
          summary: 'Examination performed without scheduled encounter.',
        }),
      });

      assert.strictEqual(res.status, 403, 'Clinician without encounter must be rejected with 403');
      const json: any = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error?.code, 'FORBIDDEN_CLINICAL_ACCESS');
    });

    it('Doctor upload for patient when encounter is CANCELLED (inactive encounter) fails with 403', async () => {
      // Create a standalone doctor and patient where the ONLY appointment between them is CANCELLED
      const tempDocUser = await User.create({
        phone: `+919766${Math.floor(100000 + Math.random() * 900000)}`,
        fullName: 'Dr. Cancelled Encounter',
        role: 'DOCTOR',
        isVerified: true,
        tokenVersion: 0,
      });

      const tempDocProfile = await Doctor.create({
        userId: tempDocUser._id,
        fullName: tempDocUser.fullName,
        registrationNumber: `REG-AUTH-${Date.now()}-3`,
        registrationCouncil: 'Delhi Medical Council',
        specialties: ['General Medicine'],
        qualifications: [{ degree: 'MBBS', college: 'KMC', year: 2018 }],
        consultationFee: 500,
        experienceYears: 5,
        rating: 4.5,
      });

      await Appointment.create({
        appointmentNumber: `APPT-CANC-${Date.now()}`,
        patientId: patientBProfile._id,
        patientName: patientBProfile.fullName,
        doctorId: tempDocProfile._id,
        doctorName: tempDocProfile.fullName,
        doctorSpecialty: 'General Medicine',
        appointmentDate: new Date(),
        timeSlot: '02:00 PM',
        mode: 'VIDEO',
        status: 'CANCELLED',
      });

      const tempDocToken = jwt.sign(
        { id: tempDocUser._id.toString(), role: 'DOCTOR', permissions: [], tokenVersion: 0 },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await fetch(`${API_BASE}/records/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tempDocToken}`,
        },
        body: JSON.stringify({
          patientId: patientBProfile._id.toString(),
          title: 'Note for Cancelled Encounter',
          summary: 'Attempting to document on a cancelled consultation.',
        }),
      });

      assert.strictEqual(res.status, 403, 'Inactive/cancelled encounter must not permit record creation');
      const json: any = await res.json();
      assert.strictEqual(json.error?.code, 'FORBIDDEN_CLINICAL_ACCESS');

      // Cleanup temp doc
      await Appointment.deleteMany({ doctorId: tempDocProfile._id });
      await Doctor.deleteOne({ _id: tempDocProfile._id });
      await User.deleteOne({ _id: tempDocUser._id });
    });

    it('Doctor with active/completed clinical encounter successfully uploads medical record with server-derived identity', async () => {
      // Doctor A has activeAppointment (CONFIRMED) with Patient A
      const res = await fetch(`${API_BASE}/records/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${doctorAToken}`,
        },
        body: JSON.stringify({
          patientId: patientProfile._id.toString(),
          title: 'In-Encounter Cardiology Assessment',
          category: 'Cardiology',
          summary: 'Patient evaluated for sinus arrhythmia. Resting ECG regular.',
          encounterType: 'CONSULTATION',
          vitals: {
            heartRate: 72,
            systolicBP: 120,
            diastolicBP: 80,
            spO2: 99,
          },
          clinicalNotes: 'Follow-up in 30 days if palpitations recur.',
        }),
      });

      assert.strictEqual(res.status, 201, 'Doctor with active encounter should create record with 201 Created');
      const json: any = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.patientId, patientProfile._id.toString());
      assert.strictEqual(json.data.doctorId, doctorProfile._id.toString(), 'Server must derive doctorId from clinician profile');
      assert.strictEqual(json.data.doctorName, doctorProfile.fullName, 'Server must derive doctorName from clinician profile');
    });

    it('Patient successfully uploads their own medical record and client-supplied patientId is not trusted', async () => {
      // Patient A tries to spoof patientId by passing Patient B's ID in the body
      const res = await fetch(`${API_BASE}/records/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientAToken}`,
        },
        body: JSON.stringify({
          patientId: patientBProfile._id.toString(), // Adversarial spoofing attempt
          title: 'Patient Personal Glucose Log',
          category: 'Diagnostics',
          summary: 'Fasting capillary blood glucose reading.',
          encounterType: 'LAB_REPORT',
          vitals: { glucose: 95 },
        }),
      });

      assert.strictEqual(res.status, 201, 'Patient self-upload should succeed with 201');
      const json: any = await res.json();
      assert.strictEqual(json.success, true);
      // Verify record is stored under Patient A, NOT the spoofed Patient B!
      assert.strictEqual(
        json.data.patientId,
        patientProfile._id.toString(),
        "Record patientId must be derived from authenticated user's profile, ignoring spoofed body patientId"
      );
    });
  });

  describe('3. SEC-13: Telehealth Room-Join Access Control for Cancelled & Missing Encounters', () => {
    let patientASocket: any;
    let patientBSocket: any;

    before(async () => {
      const pUser = await User.findById(patientUser._id);
      const tokenA = jwt.sign(
        { id: patientUser._id.toString(), role: 'PATIENT', permissions: patientUser.permissions, tokenVersion: pUser?.tokenVersion },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const pBUser = await User.findById(patientBUser._id);
      const tokenB = jwt.sign(
        { id: patientBUser._id.toString(), role: 'PATIENT', permissions: patientBUser.permissions, tokenVersion: pBUser?.tokenVersion },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      patientASocket = ioClient(WS_BASE, {
        auth: { token: tokenA },
        transports: ['websocket'],
        reconnection: false,
      });

      patientBSocket = ioClient(WS_BASE, {
        auth: { token: tokenB },
        transports: ['websocket'],
        reconnection: false,
      });

      await Promise.all([
        new Promise<void>((resolve) => patientASocket.on('connect', () => resolve())),
        new Promise<void>((resolve) => patientBSocket.on('connect', () => resolve())),
      ]);
    });

    after(() => {
      patientASocket?.close();
      patientBSocket?.close();
    });

    it('Attempting to join telehealth room for non-existent appointment returns APPOINTMENT_NOT_FOUND', async () => {
      const nonExistentRoomId = new Types.ObjectId().toString();

      const joinRes: any = await new Promise((resolve) => {
        patientASocket.emit('join-room', { roomId: nonExistentRoomId }, (ack: any) => {
          resolve(ack);
        });
      });

      assert.strictEqual(joinRes.success, false);
      assert.strictEqual(joinRes.error, 'APPOINTMENT_NOT_FOUND');
    });

    it('Unauthorized participant attempting to join appointment room returns FORBIDDEN_ROOM_ACCESS', async () => {
      // Patient B attempts to join Patient A's active appointment
      const joinRes: any = await new Promise((resolve) => {
        patientBSocket.emit('join-room', { roomId: activeAppointment._id.toString() }, (ack: any) => {
          resolve(ack);
        });
      });

      assert.strictEqual(joinRes.success, false);
      assert.strictEqual(joinRes.error, 'FORBIDDEN_ROOM_ACCESS');
    });

    it('Authorized participant attempting to join CANCELLED appointment returns APPOINTMENT_CANCELLED', async () => {
      // Patient A is a designated participant in cancelledAppointment, but it is cancelled
      const joinRes: any = await new Promise((resolve) => {
        patientASocket.emit('join-room', { roomId: cancelledAppointment._id.toString() }, (ack: any) => {
          resolve(ack);
        });
      });

      assert.strictEqual(joinRes.success, false);
      assert.strictEqual(joinRes.error, 'APPOINTMENT_CANCELLED');
      assert.ok(joinRes.message.includes('cancelled'));
    });

    it('Authorized participant successfully joins active CONFIRMED appointment room', async () => {
      // Patient A joins their active CONFIRMED appointment
      const joinRes: any = await new Promise((resolve) => {
        patientASocket.emit('join-room', { roomId: activeAppointment._id.toString() }, (ack: any) => {
          resolve(ack);
        });
      });

      assert.strictEqual(joinRes.success, true);
      assert.strictEqual(joinRes.roomId, activeAppointment._id.toString());
      assert.strictEqual(joinRes.role, 'PATIENT');
    });
  });
});
