import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../../models/User';
import { Patient } from '../../models/Patient';
import { AuthRequest } from '../../middleware/auth';
import { env } from '../../config/env';
import { OtpService } from '../../services/otp/otpService';

const PHONE_REGEX = /^\+?[0-9]{10,15}$/;

// Pre-authorized accounts for demonstration & development
const AUTHORIZED_DEMO_ACCOUNTS: Record<string, { role: string; fullName: string }> = {
  '+919876543210': { role: 'PATIENT', fullName: 'John Doe (Patient)' },
  '+919876543211': { role: 'DOCTOR', fullName: 'Dr. Ananya Deshmukh (Cardiologist)' },
  '+919876543212': { role: 'SUPER_ADMIN', fullName: 'Dr. Rajesh Kumar (Enterprise Admin)' },
  '9876543210': { role: 'PATIENT', fullName: 'John Doe (Patient)' },
  '9876543211': { role: 'DOCTOR', fullName: 'Dr. Ananya Deshmukh (Cardiologist)' },
  '9876543212': { role: 'SUPER_ADMIN', fullName: 'Dr. Rajesh Kumar (Enterprise Admin)' },
};

// Request OTP / Single-Use Dispatch
export const requestOTP = async (req: Request, res: Response): Promise<void> => {
  const { phone } = req.body;
  if (!phone || typeof phone !== 'string' || !PHONE_REGEX.test(phone.trim())) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_PHONE', message: 'Valid 10-15 digit phone number is required (e.g. +919876543210)' },
    });
    return;
  }

  try {
    const result = await OtpService.requestOtp(phone.trim());
    if (!result.success) {
      const statusCode = result.error?.code === 'OTP_COOLDOWN_ACTIVE' ? 429 : 400;
      res.status(statusCode).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.json({
      success: true,
      data: { phone: phone.trim() },
      message: result.message,
    });
  } catch (error: any) {
    console.error('[Auth] Error requesting OTP:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to process verification code request' },
    });
  }
};

// Verify OTP & Authenticate
export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  const { phone, otp, role = 'PATIENT', fullName = 'Demo Patient' } = req.body;

  if (!phone || !otp) {
    res.status(400).json({
      success: false,
      error: { code: 'MISSING_CREDENTIALS', message: 'Phone number and verification OTP code are required' },
    });
    return;
  }

  const normalizedPhone = phone.trim();

  const requestedRole = (role || 'PATIENT').toUpperCase();

  // Role Escalation Defense: Block arbitrary self-assignment of clinician or administrative roles
  if (requestedRole !== 'PATIENT') {
    const authorized = AUTHORIZED_DEMO_ACCOUNTS[normalizedPhone];
    if (!authorized || authorized.role !== requestedRole) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_ROLE_ASSIGNMENT',
          message: 'Security Violation: Administrative and clinician roles cannot be self-assigned via public authentication.',
        },
      });
      return;
    }
  }

  // Verify OTP via stateful OtpService
  const verifyResult = await OtpService.verifyOtp(normalizedPhone, String(otp).trim());
  if (!verifyResult.success) {
    const statusCode = verifyResult.error?.code === 'MAX_ATTEMPTS_EXCEEDED' ? 429 : 400;
    res.status(statusCode).json({
      success: false,
      error: verifyResult.error,
    });
    return;
  }

  let user = await User.findOne({ phone: normalizedPhone });
  if (!user) {
    user = await User.create({
      phone: normalizedPhone,
      fullName: AUTHORIZED_DEMO_ACCOUNTS[normalizedPhone]?.fullName || fullName,
      role: requestedRole,
      isVerified: true,
      permissions:
        requestedRole === 'SUPER_ADMIN' || requestedRole === 'HOSPITAL_ADMIN' || requestedRole === 'CLINIC_ADMIN'
          ? ['admin:all', 'doctor:manage', 'patient:manage', 'compliance:audit']
          : requestedRole === 'DOCTOR'
          ? ['doctor:read', 'doctor:write', 'appointment:manage', 'prescription:write']
          : ['patient:read', 'patient:write', 'appointment:book'],
    });

    // Create Patient Profile
    await Patient.create({
      userId: user._id,
      fullName: user.fullName,
      dob: new Date('1994-05-14'),
      gender: 'MALE',
      bloodGroup: 'O+',
      allergies: [{ allergen: 'Penicillin', severity: 'HIGH', reaction: 'Skin rash' }],
      chronicConditions: ['Type-2 Diabetes', 'Hypertension (Mild)'],
      currentMedications: ['Metformin 500mg (OD)', 'Telmisartan 20mg (OD)'],
      emergencyContact: { name: 'Sarah (Spouse)', relationship: 'SPOUSE', phone: '+91 98450 11223' },
      abhaId: 'john.doe@abdm',
      abhaNumber: '91-4920-1129-8472',
      address: { city: 'Bangalore', state: 'Karnataka', postalCode: '560034' },
      familyMembers: [
        { name: 'Sarah Doe', relationship: 'SPOUSE', dob: new Date('1996-08-20'), gender: 'FEMALE', bloodGroup: 'B+' },
        { name: 'Liam Doe', relationship: 'CHILD', dob: new Date('2021-02-10'), gender: 'MALE', bloodGroup: 'O+' },
      ],
    });
  }

  const patient = await Patient.findOne({ userId: user._id });

  const token = jwt.sign(
    { id: user._id, role: user.role, permissions: user.permissions },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as any }
  );

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user._id,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        patientId: patient?._id,
      },
    },
    message: 'Authentication successful',
  });
};

// Logout User
export const logoutUser = async (req: AuthRequest, res: Response): Promise<void> => {
  // Stateless JWT logout acknowledgment (client invalidates local token storage)
  res.json({
    success: true,
    message: 'Session terminated successfully',
  });
};

// Get current profile
export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    const patient = await Patient.findOne({ userId: user._id });

    res.json({
      success: true,
      data: {
        user,
        patient,
      },
      message: 'Profile retrieved',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to retrieve profile' } });
  }
};
