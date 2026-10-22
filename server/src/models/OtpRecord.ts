import { Schema, model, Document } from 'mongoose';

export interface IOtpRecord extends Document {
  phone: string;
  otpHash: string;
  salt: string;
  attempts: number;
  lastSentAt: Date;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

const otpRecordSchema = new Schema<IOtpRecord>(
  {
    phone: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    salt: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    isUsed: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const OtpRecord = model<IOtpRecord>('OtpRecord', otpRecordSchema);
