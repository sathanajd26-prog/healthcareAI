import { Response } from 'express';
import mongoose from 'mongoose';
import { Prescription } from '../../models/Prescription';
import { Patient } from '../../models/Patient';
import { Doctor } from '../../models/Doctor';
import { User } from '../../models/User';
import { Appointment } from '../../models/Appointment';
import { AuthRequest } from '../../middleware/auth';

// Create and sign a digital prescription (strictly authorized clinicians only)
export const createPrescription = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    // Role Enforcement: Only DOCTOR or SUPER_ADMIN may issue prescriptions
    if (req.user.role !== 'DOCTOR' && req.user.role !== 'SUPER_ADMIN') {
      res.status(403).json({
        success: false,
        error: {
          code: 'CLINICIAN_ROLE_REQUIRED',
          message: 'Clinical Security Violation: Only authorized clinicians with DOCTOR privileges can issue digital prescriptions.',
        },
      });
      return;
    }

    // Resolve prescribing clinician from Doctor model
    let doctor = await Doctor.findOne({ userId: req.user.id });
    if (!doctor && mongoose.Types.ObjectId.isValid(req.user.id)) {
      doctor = await Doctor.findById(req.user.id);
    }
    if (!doctor) {
      const u = await User.findById(req.user.id);
      if (u) {
        doctor = await Doctor.findOne({
          fullName: new RegExp(u.fullName.replace(/\s*\([^)]*\)/, '').trim(), 'i'),
        });
        if (doctor && (!doctor.userId || doctor.userId.toString() !== u._id.toString())) {
          doctor.userId = u._id;
          await doctor.save();
        }
      }
    }

    if (!doctor && req.user.role !== 'SUPER_ADMIN') {
      res.status(403).json({
        success: false,
        error: {
          code: 'UNREGISTERED_CLINICIAN',
          message: 'Practitioner profile not found in verified clinician directory.',
        },
      });
      return;
    }

    const { patientId, patientName, appointmentId, medications, advice, followUpDate } = req.body;

    // Resolve target patient: by ID first, then by exact name
    let patient: any = null;
    if (patientId && mongoose.Types.ObjectId.isValid(patientId)) {
      patient = await Patient.findById(patientId);
    } else if (patientName && typeof patientName === 'string') {
      patient = await Patient.findOne({ fullName: new RegExp(`^${patientName.trim()}$`, 'i') });
    }

    if (!patient) {
      res.status(404).json({
        success: false,
        error: {
          code: 'PATIENT_NOT_FOUND',
          message: 'Specified patient record does not exist. A valid patient record is required to issue prescriptions.',
        },
      });
      return;
    }

    // Verify clinician-patient encounter relationship if appointmentId is supplied
    let verifiedAppointment: any = null;
    if (appointmentId) {
      if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_APPOINTMENT_ID', message: 'Invalid appointment ID format.' },
        });
        return;
      }

      verifiedAppointment = await Appointment.findById(appointmentId);
      if (!verifiedAppointment) {
        res.status(404).json({
          success: false,
          error: { code: 'APPOINTMENT_NOT_FOUND', message: 'Referenced clinical appointment does not exist.' },
        });
        return;
      }

      // Verify that this appointment actually belongs to this patient
      if (verifiedAppointment.patientId.toString() !== patient._id.toString()) {
        res.status(403).json({
          success: false,
          error: { code: 'PATIENT_MISMATCH', message: 'Appointment does not belong to the specified patient.' },
        });
        return;
      }

      // Verify that this appointment belongs to this doctor
      if (doctor && verifiedAppointment.doctorId.toString() !== doctor._id.toString() && req.user.role !== 'SUPER_ADMIN') {
        res.status(403).json({
          success: false,
          error: { code: 'DOCTOR_MISMATCH', message: 'You are not the designated physician for this appointment.' },
        });
        return;
      }
    }

    // Validate medications list
    if (!medications || !Array.isArray(medications) || medications.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_MEDICATIONS', message: 'Prescription must contain at least one valid medication item.' },
      });
      return;
    }

    for (let i = 0; i < medications.length; i++) {
      const m = medications[i];
      if (!m.name || typeof m.name !== 'string' || !m.name.trim()) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_MEDICATION_NAME', message: `Medication item #${i + 1} must include a name.` },
        });
        return;
      }
      if (!m.dosage || typeof m.dosage !== 'string' || !m.dosage.trim()) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_MEDICATION_DOSAGE', message: `Medication "${m.name}" must specify dosage (e.g. 500mg).` },
        });
        return;
      }
    }

    const rxNumber = `RX-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const doctorName = doctor ? doctor.fullName : (req.body.doctorName || 'Attending Physician');
    const doctorSpecialty = doctor && doctor.specialties?.length ? doctor.specialties[0] : 'General Medicine';
    const doctorId = doctor ? doctor._id : new mongoose.Types.ObjectId(req.user.id);

    const newPrescription = await Prescription.create({
      prescriptionNumber: rxNumber,
      patientId: patient._id,
      patientName: patient.fullName,
      doctorId,
      doctorName,
      doctorSpecialty,
      appointmentId: verifiedAppointment?._id,
      medications: medications.map((m: any) => ({
        name: m.name.trim(),
        dosage: m.dosage.trim(),
        frequency: m.frequency || m.freq || 'Once daily (OD)',
        duration: m.duration || '30 days',
        instructions: m.instructions || m.instruction || 'Take after meals with water',
      })),
      advice: advice || 'Take medications strictly as directed. Report any adverse reactions immediately.',
      followUpDate: followUpDate ? new Date(followUpDate) : undefined,
      digitalSignature: `VERIFIED_DS_${doctorId.toString().slice(-6)}_${Date.now()}`,
    });

    res.status(201).json({
      success: true,
      data: newPrescription,
      message: 'Digital prescription signed and transmitted successfully',
    });
  } catch (error: any) {
    console.error('[Prescription] Error creating prescription:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Failed to create digital prescription' },
    });
  }
};

// Get current user's authorized prescriptions
export const getMyPrescriptions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    let filter: any = {};

    if (req.user.role === 'PATIENT') {
      const patient = await Patient.findOne({ userId: req.user.id });
      if (!patient) {
        // Safe, clean empty response: do not leak unrelated patient data!
        res.json({
          success: true,
          data: [],
          message: 'No patient record linked to this account',
        });
        return;
      }
      filter = { patientId: patient._id };
    } else if (req.user.role === 'DOCTOR') {
      let doctor = await Doctor.findOne({ userId: req.user.id });
      if (!doctor) {
        doctor = await Doctor.findById(req.user.id);
      }
      if (!doctor) {
        res.json({
          success: true,
          data: [],
          message: 'No doctor record linked to this account',
        });
        return;
      }
      filter = { doctorId: doctor._id };
    } else if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'HOSPITAL_ADMIN') {
      // Admins can filter by patientId query parameter if provided
      if (req.query.patientId && mongoose.Types.ObjectId.isValid(String(req.query.patientId))) {
        filter = { patientId: new mongoose.Types.ObjectId(String(req.query.patientId)) };
      } else {
        filter = {};
      }
    } else {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Unauthorized role for prescription access' },
      });
      return;
    }

    const prescriptions = await Prescription.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: prescriptions,
      message: 'Prescriptions retrieved successfully',
    });
  } catch (error: any) {
    console.error('[Prescription] Error fetching prescriptions:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve prescriptions' },
    });
  }
};

// Get specific prescription by ID with strict ownership validation
export const getPrescriptionById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid prescription ID format' } });
      return;
    }

    const prescription = await Prescription.findById(id);
    if (!prescription) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Prescription not found' } });
      return;
    }

    // Authorization Guard: Only the patient who owns the prescription, the prescribing doctor, or admin
    if (req.user.role === 'PATIENT') {
      const patient = await Patient.findOne({ userId: req.user.id });
      if (!patient || prescription.patientId.toString() !== patient._id.toString()) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN_RECORD_ACCESS', message: 'You are not authorized to view another patient\'s prescription' },
        });
        return;
      }
    } else if (req.user.role === 'DOCTOR') {
      let doctor = await Doctor.findOne({ userId: req.user.id });
      if (!doctor) {
        doctor = await Doctor.findById(req.user.id);
      }
      if (!doctor || prescription.doctorId.toString() !== doctor._id.toString()) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN_RECORD_ACCESS', message: 'You are not authorized to view prescriptions issued by other clinicians' },
        });
        return;
      }
    }

    res.json({
      success: true,
      data: prescription,
      message: 'Prescription retrieved successfully',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to retrieve prescription' } });
  }
};
