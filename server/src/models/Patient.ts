import { Schema, model, Document, Types } from 'mongoose';

export interface IPatient extends Document {
  userId: Types.ObjectId;
  fullName: string;
  dob: Date;
  gender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER';
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  allergies: Array<{ allergen: string; severity: string; reaction: string }>;
  chronicConditions: string[];
  currentMedications: string[];
  emergencyContact: { name: string; relationship: string; phone: string };
  abhaId?: string;
  abhaNumber?: string;
  address: {
    city: string;
    state: string;
    postalCode: string;
    coordinates?: [number, number]; // [lng, lat]
  };
  vitalsLatest?: {
    systolicBP: number;
    diastolicBP: number;
    heartRate: number;
    spO2: number;
    glucose: number;
    updatedAt: Date;
  };
  healthScore: number;
  familyMembers: Array<{
    name: string;
    relationship: 'SPOUSE' | 'CHILD' | 'PARENT' | 'OTHER';
    dob: Date;
    gender: string;
    bloodGroup: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const patientSchema = new Schema<IPatient>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fullName: { type: String, required: true },
    dob: { type: Date, required: true },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'NON_BINARY', 'OTHER'], required: true },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], required: true },
    allergies: [
      {
        allergen: { type: String, required: true },
        severity: { type: String, default: 'MODERATE' },
        reaction: { type: String },
      },
    ],
    chronicConditions: [{ type: String }],
    currentMedications: [{ type: String }],
    emergencyContact: {
      name: { type: String, default: 'Primary Contact' },
      relationship: { type: String, default: 'Family' },
      phone: { type: String, default: '+91 98765 43210' },
    },
    abhaId: { type: String, sparse: true },
    abhaNumber: { type: String, sparse: true },
    address: {
      city: { type: String, default: 'Bangalore' },
      state: { type: String, default: 'Karnataka' },
      postalCode: { type: String, default: '560001' },
      coordinates: { type: [Number], index: '2dsphere' },
    },
    vitalsLatest: {
      systolicBP: { type: Number, default: 120 },
      diastolicBP: { type: Number, default: 80 },
      heartRate: { type: Number, default: 72 },
      spO2: { type: Number, default: 98 },
      glucose: { type: Number, default: 95 },
      updatedAt: { type: Date, default: Date.now },
    },
    healthScore: { type: Number, default: 88 },
    familyMembers: [
      {
        name: { type: String, required: true },
        relationship: { type: String, required: true },
        dob: { type: Date },
        gender: { type: String },
        bloodGroup: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export const Patient = model<IPatient>('Patient', patientSchema);
