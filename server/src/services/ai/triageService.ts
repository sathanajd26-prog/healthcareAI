import { Doctor, IDoctor } from '../../models/Doctor';

export interface TriageResult {
  isEmergency: boolean;
  emergencyNotice: string | null;
  recommendedSpecialty: string;
  matchExplanation: string;
  clinicalAdvice: string;
  matchingDoctors: IDoctor[];
  algorithmType: 'DETERMINISTIC_SPECIALTY_RULE_ENGINE';
  urgencyLevel: 'EMERGENCY_CRITICAL' | 'URGENT' | 'ROUTINE_OUTPATIENT';
  disclaimer: string;
}

const EMERGENCY_PATTERNS = [
  { pattern: /\b(chest\s*pain|heart\s*attack|cardiac\s*arrest)\b/i, reason: 'acute cardiovascular symptoms' },
  { pattern: /\b(difficulty\s*breathing|cannot\s*breathe|shortness\s*of\s*breath|suffocating)\b/i, reason: 'severe respiratory distress' },
  { pattern: /\b(stroke|facial\s*droop|arm\s*weakness|slurred\s*speech)\b/i, reason: 'acute neurological/stroke indicators' },
  { pattern: /\b(severe\s*bleeding|uncontrolled\s*bleeding|hemorrhage)\b/i, reason: 'uncontrolled hemorrhage' },
  { pattern: /\b(unconscious|fainted|loss\s*of\s*consciousness)\b/i, reason: 'loss of consciousness' },
  { pattern: /\b(anaphylaxis|throat\s*closing|severe\s*allergic\s*reaction)\b/i, reason: 'potential airway-compromising anaphylaxis' },
  { pattern: /\b(suicid|self\s*harm)\b/i, reason: 'acute crisis' },
];

interface SpecialtyRule {
  specialty: string;
  keywords: string[];
  explanation: string;
  advice: string;
  urgency: 'URGENT' | 'ROUTINE_OUTPATIENT';
}

const SPECIALTY_RULES: SpecialtyRule[] = [
  {
    specialty: 'Cardiologist',
    keywords: ['chest', 'heart', 'palpitation', 'cardiac', 'angina', 'pulse rate', 'high bp', 'hypertension', 'ecg'],
    explanation: 'Matched to Cardiology based on reported cardiovascular symptoms or blood pressure indicators.',
    advice: 'Your reported symptoms involve the cardiovascular system. Please schedule a formal evaluation with a board-certified Cardiologist.',
    urgency: 'URGENT',
  },
  {
    specialty: 'Dermatologist',
    keywords: ['skin', 'rash', 'acne', 'itching', 'eczema', 'dermatitis', 'mole', 'hives', 'scalp', 'psoriasis'],
    explanation: 'Matched to Dermatology based on cutaneous and skin surface descriptions.',
    advice: 'Skin and cutaneous manifestations benefit from visual diagnostic examination by a Dermatologist.',
    urgency: 'ROUTINE_OUTPATIENT',
  },
  {
    specialty: 'Neurologist',
    keywords: ['headache', 'migraine', 'dizziness', 'vertigo', 'seizure', 'numbness', 'tingling', 'tremor', 'memory loss'],
    explanation: 'Matched to Neurology based on cephalic, cranial, or neurological descriptions.',
    advice: 'Persistent cephalic discomfort, vertigo, or sensory changes warrant specialized neurological assessment.',
    urgency: 'URGENT',
  },
  {
    specialty: 'Pediatrician',
    keywords: ['child', 'baby', 'infant', 'toddler', 'pediatric', 'newborn', 'kid', 'teething'],
    explanation: 'Matched to Pediatrics based on patient age indicator (child/infant/pediatric).',
    advice: 'Childhood development and pediatric wellness concerns should be addressed by a board-certified Pediatrician.',
    urgency: 'ROUTINE_OUTPATIENT',
  },
  {
    specialty: 'Orthopedic Surgeon',
    keywords: ['bone', 'joint', 'knee', 'fracture', 'sprain', 'back pain', 'spine', 'shoulder', 'arthritis', 'ligament'],
    explanation: 'Matched to Orthopedics based on musculoskeletal and joint indications.',
    advice: 'Musculoskeletal pain, joint swelling, or suspected bone trauma requires orthopedic evaluation.',
    urgency: 'ROUTINE_OUTPATIENT',
  },
  {
    specialty: 'Dentist',
    keywords: ['tooth', 'teeth', 'gum', 'dental', 'cavity', 'molar', 'jaw pain', 'oral'],
    explanation: 'Matched to Dental Surgery based on oral and odontological symptoms.',
    advice: 'Dental and gingival symptoms require an in-person clinical oral examination by a dental specialist.',
    urgency: 'ROUTINE_OUTPATIENT',
  },
  {
    specialty: 'ENT Specialist',
    keywords: ['ear', 'nose', 'throat', 'sinus', 'tonsil', 'hearing', 'tinnitus', 'nasal'],
    explanation: 'Matched to Otorhinolaryngology (ENT) based on ear, nose, or throat symptoms.',
    advice: 'Upper respiratory and ear/sinus symptoms should be examined by an Ear, Nose, and Throat specialist.',
    urgency: 'ROUTINE_OUTPATIENT',
  },
];

export class TriageService {
  /**
   * Evaluates patient symptoms against deterministic clinical rules.
   * Identifies emergencies, selects specialty, queries real verified doctors,
   * and attaches clear disclaimers.
   */
  public static async evaluateSymptoms(symptomText: string): Promise<TriageResult> {
    const text = symptomText.trim();
    const lower = text.toLowerCase();

    // 1. Immediate Clinical Emergency Interceptor
    let isEmergency = false;
    let emergencyReason = '';

    for (const ep of EMERGENCY_PATTERNS) {
      if (ep.pattern.test(lower)) {
        isEmergency = true;
        emergencyReason = ep.reason;
        break;
      }
    }

    const emergencyNotice = isEmergency
      ? '🚨 IMMEDIATE CLINICAL EMERGENCY ALERT: Your symptoms may indicate an acute, life-threatening condition. Please DIAL 112 / 108 immediately or go to the nearest emergency room trauma center. Do not wait for routine outpatient consultation.'
      : null;

    // 2. Deterministic Specialty Rule Matcher
    let matchedRule: SpecialtyRule | null = null;

    for (const rule of SPECIALTY_RULES) {
      if (rule.keywords.some((kw) => lower.includes(kw))) {
        matchedRule = rule;
        break;
      }
    }

    const recommendedSpecialty = matchedRule ? matchedRule.specialty : 'General Physician';
    const matchExplanation = matchedRule
      ? matchedRule.explanation
      : 'Symptoms evaluated for general clinical triage. A General Physician consultation is recommended for comprehensive examination.';
    const clinicalAdvice = matchedRule
      ? matchedRule.advice
      : 'Based on your symptoms, a comprehensive physical check-up by an internal medicine physician is recommended.';
    const urgencyLevel: TriageResult['urgencyLevel'] = isEmergency
      ? 'EMERGENCY_CRITICAL'
      : matchedRule?.urgency || 'ROUTINE_OUTPATIENT';

    // 3. Query Real Verified Doctors from Database
    const matchingDoctors = await Doctor.find({
      specialties: { $regex: new RegExp(recommendedSpecialty, 'i') },
      verificationStatus: 'VERIFIED',
    })
      .select('_id fullName specialties qualification experienceYears hospitalAffiliation pricing rating avatarUrl nextAvailableSlot')
      .limit(4)
      .lean();

    return {
      isEmergency,
      emergencyNotice,
      recommendedSpecialty,
      matchExplanation,
      clinicalAdvice,
      matchingDoctors: matchingDoctors as any[],
      algorithmType: 'DETERMINISTIC_SPECIALTY_RULE_ENGINE',
      urgencyLevel,
      disclaimer: 'DISCLAIMER: This recommendation is generated via a deterministic clinical keyword matching rule engine. It does not constitute a definitive medical diagnosis or replace professional clinical judgment. If you experience worsening symptoms, contact emergency medical services (112) immediately.',
    };
  }
}
