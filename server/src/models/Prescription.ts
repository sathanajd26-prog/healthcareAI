import { Schema, model, Document, Types } from 'mongoose';

export interface IPrescription extends Document {
  prescriptionNumber: string;
  patientId: Types.ObjectId;
  patientName: string;
  doctorId: Types.ObjectId;
  doctorName: string;
  doctorSpecialty: string;
  appointmentId?: Types.ObjectId;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>;
  advice: string;
  followUpDate?: Date;
  digitalSignature: string;
  createdAt: Date;
}

const prescriptionSchema = new Schema<IPrescription>(
  {
    prescriptionNumber: { type: String, required: true, unique: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    patientName: { type: String, required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    doctorName: { type: String, required: true },
    doctorSpecialty: { type: String, required: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    medications: [
      {
        name: { type: String, required: true },
        dosage: { type: String, required: true },
        frequency: { type: String, required: true },
        duration: { type: String, required: true },
        instructions: { type: String, default: 'Take after meals' },
      },
    ],
    advice: { type: String, default: 'Drink plenty of water and rest.' },
    followUpDate: { type: Date },
    digitalSignature: { type: String, default: 'VERIFIED_DIGITAL_SIG_MD_9210' },
  },
  { timestamps: true }
);

export const Prescription = model<IPrescription>('Prescription', prescriptionSchema);
