export interface Doctor {
  _id: string;
  fullName: string;
  title: string;
  avatarUrl: string;
  registrationNumber: string;
  registrationCouncil: string;
  experienceYears: number;
  qualifications: Array<{ degree: string; college: string; year: number }>;
  specialties: string[];
  subSpecialties: string[];
  languagesSpoken: string[];
  bio: string;
  consultationModes: Array<'IN_PERSON' | 'VIDEO' | 'AUDIO' | 'HOME_VISIT'>;
  pricing: {
    inPersonFee: number;
    videoFee: number;
    homeVisitFee: number;
    currency: string;
  };
  clinicAffiliations: Array<{
    clinicName: string;
    address: string;
    city: string;
  }>;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  ratingAverage: number;
  ratingCount: number;
  availableDays: string[];
  nextAvailableSlot: string;
}

export interface Appointment {
  _id: string;
  appointmentNumber: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorAvatar?: string;
  clinicName?: string;
  appointmentDate: string;
  timeSlot: string;
  mode: 'IN_PERSON' | 'VIDEO' | 'AUDIO' | 'HOME_VISIT';
  status: 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED';
  tokenNumber: number;
  consultationFee: number;
  paymentStatus: 'PAID' | 'UNPAID';
  symptoms: string[];
  telemedicineRoomId?: string;
  createdAt: string;
}

export interface MedicalRecord {
  _id: string;
  title: string;
  encounterType: string;
  encounterDate: string;
  doctorName: string;
  category: string;
  summary: string;
  vitals?: {
    systolicBP?: number;
    diastolicBP?: number;
    heartRate?: number;
    spO2?: number;
    glucose?: number;
  };
  extractedBiomarkers?: Array<{
    name: string;
    value: string;
    unit: string;
    referenceRange: string;
    status: 'NORMAL' | 'ELEVATED' | 'LOW';
  }>;
  aiInsights?: string;
}

export interface User {
  id: string;
  phone: string;
  fullName: string;
  role: 'PATIENT' | 'DOCTOR' | 'CLINIC_ADMIN' | 'HOSPITAL_ADMIN' | 'SUPER_ADMIN';
  patientId?: string;
}
