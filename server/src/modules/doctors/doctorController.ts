import { Request, Response } from 'express';
import { Doctor } from '../../models/Doctor';
import { Appointment } from '../../models/Appointment';

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
      const feeNum = Number(maxFee);
      if (mode === 'IN_PERSON') {
        filter['pricing.inPersonFee'] = { $lte: feeNum };
      } else if (mode === 'HOME_VISIT') {
        filter['pricing.homeVisitFee'] = { $lte: feeNum };
      } else {
        filter['pricing.videoFee'] = { $lte: feeNum };
      }
    }

    if (minRating) {
      filter.ratingAverage = { $gte: Number(minRating) };
    }

    const doctors = await Doctor.find(filter).sort({ ratingAverage: -1, experienceYears: -1 });

    // Compute real availability for today aligned with the slots endpoint
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

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

    const doctorIds = doctors.map((d) => d._id);
    const bookedToday = await Appointment.find({
      doctorId: { $in: doctorIds },
      appointmentDate: today,
      status: { $in: ['CONFIRMED', 'CHECKED_IN'] },
    }).select('doctorId timeSlot');

    const bookedByDoctor: Record<string, Set<string>> = {};
    for (const b of bookedToday) {
      const docIdStr = b.doctorId.toString();
      if (!bookedByDoctor[docIdStr]) bookedByDoctor[docIdStr] = new Set();
      bookedByDoctor[docIdStr].add(b.timeSlot);
    }

    const doctorsWithComputedSlots = doctors.map((doc) => {
      const docObj = doc.toObject();
      const booked = bookedByDoctor[doc._id.toString()] || new Set();
      const firstAvailableSlot = standardSlots.find((slot) => !booked.has(slot));
      if (firstAvailableSlot) {
        docObj.nextAvailableSlot = `Today, ${firstAvailableSlot}`;
      } else {
        docObj.nextAvailableSlot = 'No slots available today';
      }
      return docObj;
    });

    res.json({
      success: true,
      data: {
        total: doctorsWithComputedSlots.length,
        doctors: doctorsWithComputedSlots,
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

import { TriageService } from '../../services/ai/triageService';

// AI Doctor Match & Smart Triage (Deterministic Clinical Specialty Rule Engine)
export const aiMatchDoctor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { symptomText } = req.body;

    if (!symptomText || typeof symptomText !== 'string' || !symptomText.trim()) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Symptom description is required.' },
      });
      return;
    }

    if (symptomText.trim().length > 1000) {
      res.status(400).json({
        success: false,
        error: { code: 'QUERY_TOO_LONG', message: 'Symptom description exceeds 1,000 characters limit.' },
      });
      return;
    }

    const triageResult = await TriageService.evaluateSymptoms(symptomText);

    res.json({
      success: true,
      data: triageResult,
      message: 'AI Doctor Matching complete',
    });
  } catch (error: any) {
    console.error('[Doctor Match Error]', error);
    res.status(500).json({
      success: false,
      error: { code: 'TRIAGE_ERROR', message: 'Failed to complete symptom-specialist triage.' },
    });
  }
};
