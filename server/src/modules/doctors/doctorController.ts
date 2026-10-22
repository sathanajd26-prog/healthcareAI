import { Request, Response } from 'express';
import { Doctor } from '../../models/Doctor';

// Search & list doctors with multi-faceted filtering
export const getDoctors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { specialty, query, mode, maxFee, minRating } = req.query;

    const filter: any = { verificationStatus: 'VERIFIED' };

    if (specialty && specialty !== 'All') {
      filter.specialties = { $regex: new RegExp(String(specialty), 'i') };
    }

    if (query) {
      filter.$or = [
        { fullName: { $regex: new RegExp(String(query), 'i') } },
        { specialties: { $regex: new RegExp(String(query), 'i') } },
        { 'clinicAffiliations.clinicName': { $regex: new RegExp(String(query), 'i') } },
      ];
    }

    if (mode && mode !== 'ALL') {
      filter.consultationModes = mode;
    }

    if (maxFee) {
      filter['pricing.videoFee'] = { $lte: Number(maxFee) };
    }

    if (minRating) {
      filter.ratingAverage = { $gte: Number(minRating) };
    }

    const doctors = await Doctor.find(filter).sort({ ratingAverage: -1, experienceYears: -1 });

    res.json({
      success: true,
      data: {
        total: doctors.length,
        doctors,
      },
      message: 'Doctors retrieved successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to retrieve doctors' } });
  }
};

// Get single doctor profile
export const getDoctorById = async (req: Request, res: Response): Promise<void> => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Doctor not found' } });
      return;
    }

    res.json({
      success: true,
      data: doctor,
      message: 'Doctor details retrieved',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch doctor' } });
  }
};

// AI Doctor Match & Smart Triage
export const aiMatchDoctor = async (req: Request, res: Response): Promise<void> => {
  const { symptomText } = req.body;

  if (!symptomText) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Symptom description required' } });
    return;
  }

  const lower = symptomText.toLowerCase();

  // Safety emergency check
  const isEmergency = lower.includes('chest pain') || lower.includes('breathing') || lower.includes('unconscious') || lower.includes('severe bleeding');

  let matchedSpecialty = 'General Physician';
  let clinicalAdvice = 'Based on your symptoms, a comprehensive physical check-up is recommended.';

  if (lower.includes('chest') || lower.includes('heart') || lower.includes('palpitations')) {
    matchedSpecialty = 'Cardiologist';
    clinicalAdvice = 'Your symptoms relate to cardiovascular health. Please consult a board-certified Cardiologist.';
  } else if (lower.includes('skin') || lower.includes('rash') || lower.includes('acne') || lower.includes('itching')) {
    matchedSpecialty = 'Dermatologist';
    clinicalAdvice = 'Cutaneous symptoms typically require clinical visual examination by a Dermatologist.';
  } else if (lower.includes('headache') || lower.includes('migraine') || lower.includes('dizziness')) {
    matchedSpecialty = 'Neurologist';
    clinicalAdvice = 'Recurring cephalic discomfort or vertigo should be evaluated by a Neurologist.';
  } else if (lower.includes('child') || lower.includes('baby') || lower.includes('pediatric')) {
    matchedSpecialty = 'Pediatrician';
    clinicalAdvice = 'Child wellness and developmental questions require a Pediatric specialist.';
  } else if (lower.includes('tooth') || lower.includes('teeth') || lower.includes('gum') || lower.includes('dental')) {
    matchedSpecialty = 'Dentist';
    clinicalAdvice = 'Dental or oral hygiene issues should be examined by an oral surgeon or dentist.';
  }

  const matchingDoctors = await Doctor.find({
    specialties: { $regex: new RegExp(matchedSpecialty, 'i') },
  }).limit(4);

  res.json({
    success: true,
    data: {
      isEmergency,
      emergencyNotice: isEmergency
        ? 'WARNING: Symptoms may indicate an urgent medical situation. Please call 112 / 108 or go to the nearest hospital Emergency Room immediately.'
        : null,
      recommendedSpecialty: matchedSpecialty,
      clinicalAdvice,
      matchingDoctors,
      disclaimer: 'AI guidance is for informational matching only and does not constitute a definitive medical diagnosis.',
    },
    message: 'AI Doctor Matching complete',
  });
};
