import { z } from 'zod';

export const createMedicalRecordSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(200, 'Title cannot exceed 200 characters').optional(),
  category: z.string().min(1).max(100).optional(),
  summary: z.string().min(1).max(2000).optional(),
  encounterType: z.enum(['CONSULTATION', 'LAB_REPORT', 'PRESCRIPTION', 'DISCHARGE_SUMMARY', 'VITAL_CHECK']).optional(),
  vitals: z
    .object({
      systolicBP: z.number().min(30).max(300).optional(),
      diastolicBP: z.number().min(20).max(200).optional(),
      heartRate: z.number().min(20).max(300).optional(),
      spO2: z.number().min(50).max(100).optional(),
      glucose: z.number().min(20).max(1000).optional(),
    })
    .optional(),
  clinicalNotes: z.string().max(5000).optional(),
  biomarkers: z
    .array(
      z.object({
        name: z.string().min(1),
        value: z.string().min(1),
        unit: z.string().optional(),
        referenceRange: z.string().optional(),
        status: z.enum(['NORMAL', 'ELEVATED', 'LOW']).optional(),
      })
    )
    .optional(),
  aiInsights: z.string().max(2000).optional(),
  patientId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid patient ID format').optional(),
  attachments: z
    .array(
      z.object({
        name: z.string().min(1),
        url: z.string().min(1),
        fileType: z.string().optional(),
      })
    )
    .optional(),
});
