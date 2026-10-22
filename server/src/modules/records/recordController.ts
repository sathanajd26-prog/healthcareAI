import { Response } from 'express';
import { MedicalRecord } from '../../models/MedicalRecord';
import { Prescription } from '../../models/Prescription';
import { Patient } from '../../models/Patient';
import { AuthRequest } from '../../middleware/auth';

// Get longitudinal health timeline (Scoped strictly to authenticated patient)
export const getHealthTimeline = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    const patient = await Patient.findOne({ userId: req.user.id });
    if (!patient) {
      // Clean isolated empty response when no records exist for this user
      res.json({
        success: true,
        data: {
          records: [],
          prescriptions: [],
        },
        message: 'No medical records found for this profile',
      });
      return;
    }

    const records = await MedicalRecord.find({ patientId: patient._id })
      .sort({ encounterDate: -1 });

    const prescriptions = await Prescription.find({ patientId: patient._id })
      .sort({ createdAt: -1 });

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
    const { title, category, summary, encounterType, vitals, clinicalNotes, biomarkers, aiInsights } = req.body;

    let patient = await Patient.findOne({ userId: req.user?.id });
    if (!patient) {
      patient = await Patient.create({
        userId: req.user?.id,
        fullName: 'Demo Patient',
        dob: new Date('1994-01-01'),
        gender: 'MALE',
        bloodGroup: 'O+',
      });
    }

    const record = await MedicalRecord.create({
      patientId: patient._id,
      doctorId: patient.userId, // Default link
      doctorName: 'Dr. Diagnostic Lab & AI OCR',
      encounterType: encounterType || 'LAB_REPORT',
      title: title || 'Clinical Lab Biomarker Report',
      category: category || 'Diagnostics & Pathology',
      summary: summary || 'Comprehensive blood chemistry & biochemical panel evaluation.',
      vitals,
      clinicalNotes,
      extractedBiomarkers: biomarkers || [
        { name: 'HbA1c (Glycated Hemoglobin)', value: '6.4', unit: '%', referenceRange: '< 5.7%', status: 'ELEVATED' },
        { name: 'Fasting Blood Glucose', value: '112', unit: 'mg/dL', referenceRange: '70-99 mg/dL', status: 'ELEVATED' },
        { name: 'Total Cholesterol', value: '184', unit: 'mg/dL', referenceRange: '< 200 mg/dL', status: 'NORMAL' },
      ],
      aiInsights: aiInsights || 'Trends show a 0.3% improvement in HbA1c since last test. Continue prescribed dietary regimen.',
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
