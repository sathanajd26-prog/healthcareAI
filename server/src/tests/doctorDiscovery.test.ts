import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { ensureTestServer, closeTestServer } from './testSetup';
import { Doctor } from '../models/Doctor';
import { User } from '../models/User';
import { Patient } from '../models/Patient';
import { Appointment } from '../models/Appointment';
import { seedDatabase } from '../seed/seedData';

const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:5002/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'aegishealth_jwt_secret_for_local_development_testing_only_min_32_chars';

describe('Doctor Discovery & Profile Verification Test Suite (Stage 4 Fixes)', () => {
  let patientToken: string;
  let testPatientUser: any;
  let testPatientProfile: any;
  const createdDoctorIds: mongoose.Types.ObjectId[] = [];
  const createdUserIds: mongoose.Types.ObjectId[] = [];

  before(async () => {
    await ensureTestServer();

    // Create synthetic patient for booking verification
    testPatientUser = await User.create({
      phone: `+919777${Math.floor(100000 + Math.random() * 900000)}`,
      fullName: 'Discovery Test Patient',
      role: 'PATIENT',
      isVerified: true,
      permissions: ['patient:read', 'patient:write'],
    });
    createdUserIds.push(testPatientUser._id);

    testPatientProfile = await Patient.create({
      userId: testPatientUser._id,
      fullName: 'Discovery Test Patient',
      dob: new Date('1995-08-20'),
      gender: 'FEMALE',
      bloodGroup: 'O+',
      allergies: [],
      chronicConditions: [],
      emergencyContact: { name: 'Emergency Kin', relationship: 'Parent', phone: '+919777000000' },
      address: { city: 'Bangalore', state: 'Karnataka', postalCode: '560001' },
      healthScore: 92,
      familyMembers: [],
    });

    patientToken = jwt.sign(
      { id: testPatientUser._id.toString(), phone: testPatientUser.phone, role: 'PATIENT', permissions: testPatientUser.permissions },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  after(async () => {
    if (createdDoctorIds.length > 0) {
      await Doctor.deleteMany({ _id: { $in: createdDoctorIds } });
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    if (testPatientProfile?._id) {
      await Patient.deleteOne({ _id: testPatientProfile._id });
    }
    await Appointment.deleteMany({ patientName: 'Discovery Test Patient' });
    await closeTestServer();
  });

  it('1. GET /api/v1/doctors returns unique doctors with stable MongoDB _ids', async () => {
    const res = await fetch(`${API_BASE}/doctors`);
    assert.strictEqual(res.status, 200);

    const json: any = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data.doctors));
    assert.ok(json.data.doctors.length >= 5, 'Should have at least 5 seeded verified doctors');

    // Verify all doctor IDs are unique
    const idSet = new Set<string>();
    for (const doc of json.data.doctors) {
      assert.ok(doc._id, 'Each doctor must have a stable _id');
      assert.strictEqual(idSet.has(doc._id), false, `Duplicate doctor ID detected: ${doc._id}`);
      idSet.add(doc._id);
    }
  });

  it('2. Seed idempotency: Re-running seedDatabase does not duplicate doctors', async () => {
    const initialCount = await Doctor.countDocuments({});
    
    // Execute seed database again
    await seedDatabase();

    const postSeedCount = await Doctor.countDocuments({});
    assert.strictEqual(
      postSeedCount,
      initialCount,
      `Doctor count should remain identical after re-running seeds (${initialCount} vs ${postSeedCount})`
    );
  });

  it('3. Legitimate doctors with identical names remain distinct records', async () => {
    const userA = await User.create({
      phone: `+919666${Math.floor(100000 + Math.random() * 900000)}`,
      fullName: 'Dr. Same Name Clinician',
      role: 'DOCTOR',
      isVerified: true,
    });
    createdUserIds.push(userA._id);

    const docA = await Doctor.create({
      userId: userA._id,
      fullName: 'Dr. Same Name Clinician',
      title: 'Dr.',
      registrationNumber: `REG-SAME-A-${Date.now()}`,
      registrationCouncil: 'Karnataka Medical Council',
      experienceYears: 10,
      specialties: ['Cardiologist'],
      consultationModes: ['VIDEO'],
      pricing: { inPersonFee: 900, videoFee: 700, homeVisitFee: 1500, currency: 'INR' },
      verificationStatus: 'VERIFIED',
      ratingAverage: 4.8,
      ratingCount: 50,
      qualifications: [{ degree: 'MBBS', college: 'KMC', year: 2012 }],
      clinicAffiliations: [{ clinicName: 'Cardio Center Alpha', city: 'Bangalore' }],
    });
    createdDoctorIds.push(docA._id);

    const userB = await User.create({
      phone: `+919555${Math.floor(100000 + Math.random() * 900000)}`,
      fullName: 'Dr. Same Name Clinician',
      role: 'DOCTOR',
      isVerified: true,
    });
    createdUserIds.push(userB._id);

    const docB = await Doctor.create({
      userId: userB._id,
      fullName: 'Dr. Same Name Clinician',
      title: 'Dr.',
      registrationNumber: `REG-SAME-B-${Date.now()}`,
      registrationCouncil: 'Delhi Medical Council',
      experienceYears: 18,
      specialties: ['Dermatologist'],
      consultationModes: ['IN_PERSON'],
      pricing: { inPersonFee: 1100, videoFee: 800, homeVisitFee: 2000, currency: 'INR' },
      verificationStatus: 'VERIFIED',
      ratingAverage: 4.9,
      ratingCount: 110,
      qualifications: [{ degree: 'MBBS', college: 'MAMC', year: 2005 }],
      clinicAffiliations: [{ clinicName: 'Derma Skin Care Beta', city: 'Delhi' }],
    });
    createdDoctorIds.push(docB._id);

    // Query doctors with the shared name
    const res = await fetch(`${API_BASE}/doctors?query=Same%20Name%20Clinician`);
    assert.strictEqual(res.status, 200);
    const json: any = await res.json();
    assert.strictEqual(json.success, true);

    const matching = json.data.doctors.filter((d: any) => d.fullName === 'Dr. Same Name Clinician');
    assert.strictEqual(matching.length, 2, 'Both legitimate doctors with the same name must be returned');

    // Verify distinct IDs and distinct registration numbers
    assert.notStrictEqual(matching[0]._id, matching[1]._id);
    assert.notStrictEqual(matching[0].registrationNumber, matching[1].registrationNumber);
  });

  it('4. Doctor profile image URL is valid and verified in seed & database', async () => {
    const shalini = await Doctor.findOne({ registrationNumber: 'MCI-40192-TN' });
    assert.ok(shalini, 'Dr. Shalini Swaminathan must exist in DB');
    assert.ok(shalini.avatarUrl, 'Must have avatarUrl');
    assert.notStrictEqual(
      shalini.avatarUrl,
      'https://images.unsplash.com/photo-1594824813583-a798993f491c?w=500&auto=format&fit=crop&q=80',
      'Broken 404 URL must not be present'
    );
    assert.ok(
      shalini.avatarUrl.includes('photo-1651008376811'),
      'Must use verified working clinician image'
    );
  });

  it('5. Doctor-specific fields come from persisted document and nextAvailableSlot agrees with slots API', async () => {
    const doctor = await Doctor.findOne({ registrationNumber: 'MCI-84729-KAR' });
    assert.ok(doctor);

    const res = await fetch(`${API_BASE}/doctors/${doctor._id}`);
    assert.strictEqual(res.status, 200);
    const json: any = await res.json();
    assert.strictEqual(json.data.fullName, doctor.fullName);
    assert.strictEqual(json.data.pricing.videoFee, doctor.pricing.videoFee);
    assert.strictEqual(json.data.experienceYears, doctor.experienceYears);
    assert.strictEqual(json.data.ratingAverage, doctor.ratingAverage);

    // Check slot availability API
    const slotRes = await fetch(`${API_BASE}/doctors/${doctor._id}/slots`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert.strictEqual(slotRes.status, 200);
    const slotJson: any = await slotRes.json();
    assert.ok(Array.isArray(slotJson.data.slots));
    const firstFree = slotJson.data.slots.find((s: any) => s.available);
    assert.ok(firstFree, 'Should have at least one free slot');

    // Check listing nextAvailableSlot agrees
    const listRes = await fetch(`${API_BASE}/doctors?query=${encodeURIComponent(doctor.fullName)}`);
    const listJson: any = await listRes.json();
    const docFromList = listJson.data.doctors.find((d: any) => d._id === doctor._id.toString());
    assert.ok(docFromList);
    assert.strictEqual(docFromList.nextAvailableSlot, `Today, ${firstFree.time}`);
  });

  it('6. Doctor search and multi-faceted filters function correctly', async () => {
    // Filter by specialty
    const specRes = await fetch(`${API_BASE}/doctors?specialty=Pediatrician`);
    const specJson: any = await specRes.json();
    assert.ok(specJson.data.doctors.length > 0);
    for (const d of specJson.data.doctors) {
      assert.ok(d.specialties.some((s: string) => /Pediatrician/i.test(s)));
    }

    // Filter by maxFee for VIDEO
    const feeRes = await fetch(`${API_BASE}/doctors?maxFee=600&mode=VIDEO`);
    const feeJson: any = await feeRes.json();
    assert.ok(feeJson.data.doctors.length > 0);
    for (const d of feeJson.data.doctors) {
      assert.ok(d.pricing.videoFee <= 600);
    }
  });

  it('7. Appointment booking records the exact selected doctor ID', async () => {
    const doctor = await Doctor.findOne({ registrationNumber: 'MCI-62910-DEL' }); // Dr. Rohan Mehra
    assert.ok(doctor);

    const bookingRes = await fetch(`${API_BASE}/appointments/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        doctorId: doctor._id.toString(),
        mode: 'VIDEO',
        appointmentDate: '2026-11-20',
        timeSlot: '11:00 AM',
        symptoms: ['Discovery verification test'],
        patientName: 'Discovery Test Patient',
      }),
    });

    assert.strictEqual(bookingRes.status, 201);
    const bookingJson: any = await bookingRes.json();
    assert.strictEqual(bookingJson.success, true);
    assert.strictEqual(bookingJson.data.doctorId, doctor._id.toString());
    assert.strictEqual(bookingJson.data.doctorName, doctor.fullName);
  });

  it('8. Empty search results and invalid doctor IDs return appropriate states', async () => {
    // Query that matches 0 doctors
    const emptyRes = await fetch(`${API_BASE}/doctors?query=NonExistentDoctorName123456`);
    assert.strictEqual(emptyRes.status, 200);
    const emptyJson: any = await emptyRes.json();
    assert.strictEqual(emptyJson.success, true);
    assert.strictEqual(emptyJson.data.total, 0);
    assert.strictEqual(emptyJson.data.doctors.length, 0);

    // Non-existent MongoDB ID
    const notFoundId = new mongoose.Types.ObjectId();
    const notFoundRes = await fetch(`${API_BASE}/doctors/${notFoundId}`);
    assert.strictEqual(notFoundRes.status, 404);
    const notFoundJson: any = await notFoundRes.json();
    assert.strictEqual(notFoundJson.success, false);
    assert.strictEqual(notFoundJson.error.code, 'NOT_FOUND');
  });
});
