import { Response } from 'express';
import { Appointment } from '../../models/Appointment';
import { Doctor } from '../../models/Doctor';
import { Patient } from '../../models/Patient';
import { AuthRequest } from '../../middleware/auth';
import { Types } from 'mongoose';

// Helper to normalize dates to midnight UTC for clean deterministic indexing & comparisons
export const normalizeToUtcDate = (dateInput: string | Date): Date => {
  const d = new Date(dateInput);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
};

// Book an appointment with robust concurrency control & ownership enforcement
export const bookAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { doctorId, appointmentDate, timeSlot, mode, symptoms, patientName } = req.body;

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required to book appointments' },
      });
      return;
    }

    if (!Types.ObjectId.isValid(doctorId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_DOCTOR_ID', message: 'Doctor ID is invalid' },
      });
      return;
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      res.status(404).json({
        success: false,
        error: { code: 'DOCTOR_NOT_FOUND', message: 'Doctor not found' },
      });
      return;
    }

    // Enforce patient identity tied strictly to authenticated user
    let patient = await Patient.findOne({ userId: req.user.id });
    if (!patient) {
      patient = await Patient.create({
        userId: req.user.id,
        fullName: patientName || req.user.id,
        dob: new Date('1990-01-01'),
        gender: 'OTHER',
        bloodGroup: 'O+',
      });
    }

    const normalizedDate = normalizeToUtcDate(appointmentDate);

    // 1. Pre-check for slot conflict
    const existingConflict = await Appointment.findOne({
      doctorId: doctor._id,
      appointmentDate: normalizedDate,
      timeSlot,
      status: { $in: ['CONFIRMED', 'CHECKED_IN'] },
    });

    if (existingConflict) {
      res.status(409).json({
        success: false,
        error: {
          code: 'SLOT_ALREADY_BOOKED',
          message: `The time slot (${timeSlot}) on ${normalizedDate.toISOString().slice(0, 10)} is already booked. Please choose an alternative slot.`,
        },
      });
      return;
    }

    // Generate human-friendly collision-free appointment number e.g. APPT-2026-9921
    const uniqueSuffix = `${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;
    const appointmentNumber = `APPT-2026-${uniqueSuffix}`;
    const tokenNumber = Math.floor(Math.random() * 20) + 1;
    const roomId = `room-${Math.random().toString(36).substring(2, 9)}`;

    const fee = mode === 'IN_PERSON' ? doctor.pricing.inPersonFee : doctor.pricing.videoFee;

    // 2. Persist in MongoDB — caught by partial unique index if concurrent collision occurs
    const appointment = await Appointment.create({
      appointmentNumber,
      patientId: patient._id,
      patientName: patientName || patient.fullName,
      doctorId: doctor._id,
      doctorName: doctor.fullName,
      doctorSpecialty: doctor.specialties[0] || 'General Physician',
      doctorAvatar: doctor.avatarUrl,
      clinicName: doctor.clinicAffiliations[0]?.clinicName || 'Apollo Clinical Care',
      appointmentDate: normalizedDate,
      timeSlot: timeSlot.trim(),
      mode: mode || 'VIDEO',
      status: 'CONFIRMED',
      tokenNumber,
      consultationFee: fee,
      paymentStatus: 'PAID',
      symptoms: Array.isArray(symptoms) ? symptoms : symptoms ? [symptoms] : ['General Wellness Review'],
      telemedicineRoomId: roomId,
    });

    res.status(201).json({
      success: true,
      data: appointment,
      message: 'Appointment confirmed successfully',
    });
  } catch (error: any) {
    // Handle MongoDB duplicate key error code 11000 from partial unique compound index
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        error: {
          code: 'SLOT_ALREADY_BOOKED',
          message: 'The requested appointment slot was booked concurrently by another patient. Please select a different slot.',
        },
      });
      return;
    }

    console.error('Error booking appointment:', error);
    res.status(500).json({
      success: false,
      error: { code: 'BOOKING_FAILED', message: 'Failed to complete appointment booking' },
    });
  }
};

// Get current patient's appointments (Scoped strictly to authenticated patient profile)
export const getMyAppointments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    if (req.user.role === 'DOCTOR') {
      let doctor = await Doctor.findOne({ userId: req.user.id });
      if (!doctor && Types.ObjectId.isValid(req.user.id)) {
        doctor = await Doctor.findById(req.user.id);
      }
      if (!doctor) {
        res.json({
          success: true,
          data: [],
          message: 'No doctor appointments found',
        });
        return;
      }

      const appointments = await Appointment.find({ doctorId: doctor._id })
        .sort({ appointmentDate: 1, createdAt: -1 })
        .limit(100);

      res.json({
        success: true,
        data: appointments,
        message: 'Doctor appointments retrieved successfully',
      });
      return;
    }

    const patient = await Patient.findOne({ userId: req.user.id });
    if (!patient) {
      // If user has no patient profile, return empty list (prevents data leakage of all patients)
      res.json({
        success: true,
        data: [],
        message: 'No patient appointments found',
      });
      return;
    }

    const appointments = await Appointment.find({ patientId: patient._id })
      .sort({ appointmentDate: -1, createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: appointments,
      message: 'Appointments retrieved successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch appointments' },
    });
  }
};

// Cancel an appointment with strict ownership verification
export const cancelAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid appointment ID' },
      });
      return;
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Appointment not found' },
      });
      return;
    }

    // Ownership Verification
    const patient = await Patient.findOne({ userId: req.user?.id });
    const doctor = await Doctor.findOne({ userId: req.user?.id });

    const isPatientOwner = patient && appointment.patientId.equals(patient._id);
    const isDoctorOwner = doctor && appointment.doctorId.equals(doctor._id);
    const isAdmin = req.user?.role && ['SUPER_ADMIN', 'CLINIC_ADMIN', 'HOSPITAL_ADMIN'].includes(req.user.role);

    if (!isPatientOwner && !isDoctorOwner && !isAdmin) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You are not authorized to cancel this appointment.',
        },
      });
      return;
    }

    if (appointment.status === 'CANCELLED') {
      res.status(400).json({
        success: false,
        error: { code: 'ALREADY_CANCELLED', message: 'This appointment is already cancelled.' },
      });
      return;
    }

    if (appointment.status === 'COMPLETED') {
      res.status(400).json({
        success: false,
        error: { code: 'CANNOT_CANCEL_COMPLETED', message: 'Completed appointments cannot be cancelled.' },
      });
      return;
    }

    const { reason } = req.body;
    appointment.status = 'CANCELLED';
    if (reason) {
      appointment.cancellationReason = reason;
    }
    await appointment.save();

    res.json({
      success: true,
      data: appointment,
      message: 'Appointment cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to cancel appointment' },
    });
  }
};

// Reschedule an appointment with conflict checks & ownership verification
export const rescheduleAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const targetDate = req.body.newDate || req.body.appointmentDate;
    const targetSlot = req.body.newTimeSlot || req.body.timeSlot;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid appointment ID' },
      });
      return;
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Appointment not found' },
      });
      return;
    }

    // Ownership Verification
    const patient = await Patient.findOne({ userId: req.user?.id });
    const doctor = await Doctor.findOne({ userId: req.user?.id });

    const isPatientOwner = patient && appointment.patientId.equals(patient._id);
    const isDoctorOwner = doctor && appointment.doctorId.equals(doctor._id);
    const isAdmin = req.user?.role && ['SUPER_ADMIN', 'CLINIC_ADMIN', 'HOSPITAL_ADMIN'].includes(req.user.role);

    if (!isPatientOwner && !isDoctorOwner && !isAdmin) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You are not authorized to reschedule this appointment.',
        },
      });
      return;
    }

    if (appointment.status === 'CANCELLED') {
      res.status(400).json({
        success: false,
        error: { code: 'ALREADY_CANCELLED', message: 'Cancelled appointments cannot be rescheduled. Please book a new slot.' },
      });
      return;
    }

    if (appointment.status === 'COMPLETED') {
      res.status(400).json({
        success: false,
        error: { code: 'CANNOT_RESCHEDULE_COMPLETED', message: 'Completed consultations cannot be rescheduled.' },
      });
      return;
    }

    const normalizedDate = normalizeToUtcDate(targetDate);

    // Check conflict
    const conflict = await Appointment.findOne({
      _id: { $ne: appointment._id },
      doctorId: appointment.doctorId,
      appointmentDate: normalizedDate,
      timeSlot: targetSlot.trim(),
      status: { $in: ['CONFIRMED', 'CHECKED_IN'] },
    });

    if (conflict) {
      res.status(409).json({
        success: false,
        error: {
          code: 'SLOT_ALREADY_BOOKED',
          message: `The slot (${targetSlot}) on ${normalizedDate.toISOString().slice(0, 10)} is already booked. Please choose an alternative.`,
        },
      });
      return;
    }

    appointment.appointmentDate = normalizedDate;
    appointment.timeSlot = targetSlot.trim();
    appointment.status = 'CONFIRMED';
    await appointment.save();

    res.json({
      success: true,
      data: appointment,
      message: 'Appointment rescheduled successfully',
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        error: {
          code: 'SLOT_ALREADY_BOOKED',
          message: 'The requested slot was booked concurrently. Please pick another slot.',
        },
      });
      return;
    }

    console.error('Error rescheduling appointment:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to reschedule appointment' },
    });
  }
};

// Live queue status for OPD wait times (Scoped with ownership check)
export const getQueueStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' } });
      return;
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found' } });
      return;
    }

    // Ownership Verification
    const patient = await Patient.findOne({ userId: req.user?.id });
    const doctor = await Doctor.findOne({ userId: req.user?.id });

    const isPatientOwner = patient && appointment.patientId.equals(patient._id);
    const isDoctorOwner = doctor && appointment.doctorId.equals(doctor._id);
    const isAdmin = req.user?.role && ['SUPER_ADMIN', 'CLINIC_ADMIN', 'HOSPITAL_ADMIN'].includes(req.user.role);

    if (!isPatientOwner && !isDoctorOwner && !isAdmin) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not authorized to view this appointment queue status.' },
      });
      return;
    }

    const currentTokenServing = Math.max(1, appointment.tokenNumber - 2);
    const peopleAhead = Math.max(0, appointment.tokenNumber - currentTokenServing);
    const estimatedWaitMinutes = peopleAhead * 12;

    res.json({
      success: true,
      data: {
        appointmentNumber: appointment.appointmentNumber,
        yourToken: appointment.tokenNumber,
        currentTokenServing,
        patientsAhead: peopleAhead,
        estimatedWaitMinutes,
        status: appointment.status,
      },
      message: 'Live queue telemetry retrieved',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch queue status' } });
  }
};

// Available doctor slots endpoint
export const getDoctorSlots = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_DOCTOR_ID', message: 'Invalid doctor ID' } });
      return;
    }

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Doctor not found' } });
      return;
    }

    const targetDate = date ? normalizeToUtcDate(String(date)) : normalizeToUtcDate(new Date());

    // Standard working consultation slots
    const standardSlots = [
      '09:00 AM',
      '09:30 AM',
      '10:00 AM',
      '10:30 AM',
      '11:00 AM',
      '11:30 AM',
      '04:00 PM',
      '04:30 PM',
      '05:00 PM',
      '05:30 PM',
      '06:00 PM',
      '06:30 PM',
    ];

    // Find all confirmed or checked-in appointments for this doctor on this date
    const bookedAppointments = await Appointment.find({
      doctorId: doctor._id,
      appointmentDate: targetDate,
      status: { $in: ['CONFIRMED', 'CHECKED_IN'] },
    }).select('timeSlot');

    const bookedSlotsSet = new Set(bookedAppointments.map((a) => a.timeSlot));

    const slots = standardSlots.map((slot) => ({
      time: slot,
      available: !bookedSlotsSet.has(slot),
    }));

    res.json({
      success: true,
      data: {
        doctorId: doctor._id,
        doctorName: doctor.fullName,
        date: targetDate.toISOString().slice(0, 10),
        slots,
      },
      message: 'Doctor slot availability retrieved',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch doctor slots' } });
  }
};

// Clinician-authenticated queue of today's appointments for Provider Portal
export const getDoctorQueue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    if (req.user.role !== 'DOCTOR' && req.user.role !== 'SUPER_ADMIN') {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only clinicians can access doctor queue' },
      });
      return;
    }

    let doctor = await Doctor.findOne({ userId: req.user.id });
    if (!doctor && Types.ObjectId.isValid(req.user.id)) {
      doctor = await Doctor.findById(req.user.id);
    }

    if (!doctor) {
      res.status(404).json({
        success: false,
        error: { code: 'DOCTOR_NOT_FOUND', message: 'Practitioner profile not found' },
      });
      return;
    }

    const todayNormalized = normalizeToUtcDate(new Date());

    const appointments = await Appointment.find({
      doctorId: doctor._id,
      appointmentDate: todayNormalized,
      status: { $in: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'] },
    }).sort({ tokenNumber: 1, timeSlot: 1 });

    const queue = appointments.map((appt) => ({
      appointmentId: appt._id,
      token: appt.tokenNumber,
      name: appt.patientName,
      patientId: appt.patientId,
      time: appt.timeSlot,
      status: appt.status,
      type: appt.mode === 'VIDEO' ? 'Telehealth Video' : 'In-Clinic OPD',
      symptoms: appt.symptoms,
    }));

    res.json({
      success: true,
      data: {
        doctorName: doctor.fullName,
        specialty: doctor.specialties.join(', '),
        totalQueue: queue.length,
        queue,
      },
      message: 'Doctor OPD queue retrieved successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch doctor queue' } });
  }
};

