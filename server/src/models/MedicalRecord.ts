import { Schema, model, Document, Types } from 'mongoose';

export interface IMedicalRecord extends Document {
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  doctorName: string;
  encounterType: 'CONSULTATION' | 'LAB_REPORT' | 'PRESCRIPTION' | 'DISCHARGE_SUMMARY' | 'VITAL_CHECK';
  encounterDate: Date;
  title: string;
  category: string;
  summary: string;
  vitals?: {
    systolicBP?: number;
    diastolicBP?: number;
    heartRate?: number;
    spO2?: number;
    glucose?: number;
  };
  clinicalNotes?: string;
  extractedBiomarkers?: Array<{
    name: string;
    value: string;
    unit: string;
    referenceRange: string;
    status: 'NORMAL' | 'ELEVATED' | 'LOW';
  }>;
  aiInsights?: string;
  attachments?: Array<{ name: string; url: string; fileType: string }>;
  createdAt: Date;
}

const medicalRecordSchema = new Schema<IMedicalRecord>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    doctorName: { type: String, required: true },
    encounterType: {
      type: String,
      enum: ['CONSULTATION', 'LAB_REPORT', 'PRESCRIPTION', 'DISCHARGE_SUMMARY', 'VITAL_CHECK'],
      default: 'CONSULTATION',
      index: true,
    },
    encounterDate: { type: Date, default: Date.now, index: true },
    title: { type: String, required: true },
    category: { type: String, default: 'General Medicine' },
    summary: { type: String, required: true },
    vitals: {
      systolicBP: Number,
      diastolicBP: Number,
      heartRate: Number,
      spO2: Number,
      glucose: Number,
    },
    clinicalNotes: String,
    extractedBiomarkers: [
      {
        name: String,
        value: String,
        unit: String,
        referenceRange: String,
        status: { type: String, enum: ['NORMAL', 'ELEVATED', 'LOW'], default: 'NORMAL' },
      },
    ],
    aiInsights: String,
    attachments: [
      {
        name: String,
        url: String,
        fileType: String,
      },
    ],
  },
  { timestamps: true }
);

export const MedicalRecord = model<IMedicalRecord>('MedicalRecord', medicalRecordSchema);
