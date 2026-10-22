import { Schema, model, Document, Types } from 'mongoose';

export interface IAppointment extends Document {
  appointmentNumber: string;
  patientId: Types.ObjectId;
  patientName: string;
  doctorId: Types.ObjectId;
  doctorName: string;
  doctorSpecialty: string;
  doctorAvatar?: string;
  clinicName?: string;
  appointmentDate: Date;
  timeSlot: string;
  mode: 'IN_PERSON' | 'VIDEO' | 'AUDIO' | 'HOME_VISIT';
  status: 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED';
  tokenNumber: number;
  consultationFee: number;
  paymentStatus: 'PAID' | 'UNPAID';
  symptoms: string[];
  telemedicineRoomId?: string;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    appointmentNumber: { type: String, required: true, unique: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    patientName: { type: String, required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    doctorName: { type: String, required: true },
    doctorSpecialty: { type: String, required: true },
    doctorAvatar: { type: String },
    clinicName: { type: String },
    appointmentDate: { type: Date, required: true, index: true },
    timeSlot: { type: String, required: true },
    mode: { type: String, enum: ['IN_PERSON', 'VIDEO', 'AUDIO', 'HOME_VISIT'], default: 'VIDEO' },
    status: {
      type: String,
      enum: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED'],
      default: 'CONFIRMED',
      index: true,
    },
    tokenNumber: { type: Number, default: 1 },
    consultationFee: { type: Number, default: 800 },
    paymentStatus: { type: String, enum: ['PAID', 'UNPAID'], default: 'PAID' },
    symptoms: [{ type: String }],
    telemedicineRoomId: { type: String },
    cancellationReason: { type: String },
  },
  { timestamps: true }
);

// Concurrency Control: Prevent double-booking for the same doctor, date and slot
appointmentSchema.index(
  { doctorId: 1, appointmentDate: 1, timeSlot: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['CONFIRMED', 'CHECKED_IN'] } },
  }
);

export const Appointment = model<IAppointment>('Appointment', appointmentSchema);
