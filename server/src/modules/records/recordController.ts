import { Response } from 'express';
import mongoose from 'mongoose';
import { MedicalRecord } from '../../models/MedicalRecord';
import { Prescription } from '../../models/Prescription';
import { Patient } from '../../models/Patient';
import { Doctor } from '../../models/Doctor';
import { Appointment } from '../../models/Appointment';
import { AuthRequest } from '../../middleware/auth';

// Get longitudinal health timeline (Strictly scoped to authorized participants)
export const getHealthTimeline = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    let targetPatientId: mongoose.Types.ObjectId | null = null;

    if (req.user.role === 'PATIENT') {
      const patient = await Patient.findOne({ userId: req.user.id });
      if (!patient) {
        res.json({
          success: true,
          data: { records: [], prescriptions: [] },
          message: 'No medical records found for this profile',
        });
        return;
      }
      targetPatientId = patient._id;
    } else if (req.user.role === 'DOCTOR') {
      const reqPatientId = req.query.patientId;
      if (!reqPatientId || !mongoose.Types.ObjectId.isValid(String(reqPatientId))) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PATIENT_ID', message: 'Clinician view requires a valid patientId query parameter' },
        });
        return;
      }

      const doctor = await Doctor.findOne({ userId: req.user.id }) || await Doctor.findById(req.user.id);
      if (!doctor) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Clinician profile not found' } });
        return;
      }

      // Verify that this doctor has an appointment or consultation encounter with this patient
      const hasEncounter = await Appointment.findOne({
        patientId: new mongoose.Types.ObjectId(String(reqPatientId)),
        doctorId: doctor._id,
      });

      if (!hasEncounter) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN_RECORD_ACCESS',
            message: 'Access Denied: You do not have an active or scheduled clinical encounter with this patient.',
          },
        });
        return;
      }

      targetPatientId = new mongoose.Types.ObjectId(String(reqPatientId));
    } else if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'HOSPITAL_ADMIN') {
      if (req.query.patientId && mongoose.Types.ObjectId.isValid(String(req.query.patientId))) {
        targetPatientId = new mongoose.Types.ObjectId(String(req.query.patientId));
      }
    } else {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized role' } });
      return;
    }

    const filter = targetPatientId ? { patientId: targetPatientId } : {};

    const [records, prescriptions] = await Promise.all([
      MedicalRecord.find(filter).sort({ encounterDate: -1 }),
      Prescription.find(filter).sort({ createdAt: -1 }),
    ]);

    res.json({
      success: true,
      data: {
        records,
        prescriptions,
      },
      message: 'Longitudinal health timeline loaded',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch medical timeline' } });
  }
};

// Upload or create a new medical document / clinical note
export const createMedicalRecord = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    const { title, category, summary, encounterType, vitals, clinicalNotes, biomarkers, aiInsights, patientId } = req.body;

    let targetPatient: any = null;

    if (req.user.role === 'PATIENT') {
      targetPatient = await Patient.findOne({ userId: req.user.id });
    } else if (req.user.role === 'DOCTOR' || req.user.role === 'SUPER_ADMIN') {
      if (patientId && mongoose.Types.ObjectId.isValid(patientId)) {
        targetPatient = await Patient.findById(patientId);
      }
    }

    if (!targetPatient) {
      res.status(404).json({
        success: false,
        error: { code: 'PATIENT_NOT_FOUND', message: 'A verified patient profile is required to upload medical records.' },
      });
      return;
    }

    const record = await MedicalRecord.create({
      patientId: targetPatient._id,
      doctorId: new mongoose.Types.ObjectId(req.user.id),
      doctorName: req.user.role === 'DOCTOR' ? 'Attending Physician' : 'Clinical Diagnostic Vault',
      encounterType: encounterType || 'LAB_REPORT',
      title: title || 'Clinical Diagnostic Report',
      category: category || 'Diagnostics & Pathology',
      summary: summary || 'Uploaded clinical laboratory record.',
      vitals,
      clinicalNotes,
      extractedBiomarkers: Array.isArray(biomarkers) ? biomarkers : [],
      aiInsights: aiInsights || undefined,
    });

    res.status(201).json({
      success: true,
      data: record,
      message: 'Medical record uploaded and analyzed successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create medical record' } });
  }
};
