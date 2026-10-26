import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  phone: string;
  email?: string;
  passwordHash?: string;
  fullName: string;
  role: 'PATIENT' | 'DOCTOR' | 'CLINIC_ADMIN' | 'HOSPITAL_ADMIN' | 'SUPER_ADMIN';
  permissions: string[];
  isVerified: boolean;
  avatarUrl?: string;
  tokenVersion: number;
  lastLogoutAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true, index: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    fullName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['PATIENT', 'DOCTOR', 'CLINIC_ADMIN', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'],
      default: 'PATIENT',
      index: true,
    },
    permissions: [{ type: String }],
    isVerified: { type: Boolean, default: false },
    avatarUrl: { type: String },
    tokenVersion: { type: Number, default: 0 },
    lastLogoutAt: { type: Date },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);
