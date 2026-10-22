import { Schema, model, Document, Types } from 'mongoose';

export interface IDoctor extends Document {
  userId: Types.ObjectId;
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
    coordinates: [number, number];
  }>;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  ratingAverage: number;
  ratingCount: number;
  slotDurationMinutes: number;
  availableDays: string[];
  nextAvailableSlot: string;
  createdAt: Date;
  updatedAt: Date;
}

const doctorSchema = new Schema<IDoctor>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fullName: { type: String, required: true, index: true },
    title: { type: String, default: 'Dr.' },
    avatarUrl: { type: String, default: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300' },
    registrationNumber: { type: String, required: true, unique: true },
    registrationCouncil: { type: String, default: 'Medical Council of India' },
    experienceYears: { type: Number, required: true, index: true },
    qualifications: [
      {
        degree: { type: String, required: true },
        college: { type: String },
        year: { type: Number },
      },
    ],
    specialties: [{ type: String, index: true }],
    subSpecialties: [{ type: String }],
    languagesSpoken: [{ type: String }],
    bio: { type: String },
    consultationModes: [{ type: String, enum: ['IN_PERSON', 'VIDEO', 'AUDIO', 'HOME_VISIT'] }],
    pricing: {
      inPersonFee: { type: Number, default: 800 },
      videoFee: { type: Number, default: 600 },
      homeVisitFee: { type: Number, default: 1500 },
      currency: { type: String, default: 'INR' },
    },
    clinicAffiliations: [
      {
        clinicName: { type: String, required: true },
        address: { type: String },
        city: { type: String },
        coordinates: { type: [Number], index: '2dsphere' },
      },
    ],
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'VERIFIED',
      index: true,
    },
    ratingAverage: { type: Number, default: 4.8, index: true },
    ratingCount: { type: Number, default: 124 },
    slotDurationMinutes: { type: Number, default: 15 },
    availableDays: [{ type: String, default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }],
    nextAvailableSlot: { type: String, default: 'Today, 04:30 PM' },
  },
  { timestamps: true }
);

export const Doctor = model<IDoctor>('Doctor', doctorSchema);
