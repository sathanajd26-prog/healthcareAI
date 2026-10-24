import { z } from 'zod';

export const chatQuerySchema = z.object({
  question: z
    .string({ required_error: 'Question is required' })
    .min(1, 'Please enter a health question or topic.')
    .max(1000, 'Question exceeds maximum limit of 1,000 characters.'),
  conversationHistory: z
    .array(
      z.object({
        sender: z.enum(['USER', 'AI', 'PATIENT', 'DOCTOR']),
        text: z.string().max(2000),
      })
    )
    .max(20, 'Conversation history exceeds maximum of 20 messages')
    .optional(),
  activePatientName: z.string().max(100).optional(),
});

export const soapDraftSchema = z.object({
  consultationDialogue: z
    .string({ required_error: 'Consultation dialogue or clinical notes are required' })
    .min(5, 'Consultation dialogue must be at least 5 characters.')
    .max(5000, 'Consultation dialogue cannot exceed 5,000 characters.'),
  patientSymptoms: z.string().max(1000).optional(),
  vitals: z
    .object({
      systolicBP: z.number().optional(),
      diastolicBP: z.number().optional(),
      heartRate: z.number().optional(),
      spO2: z.number().optional(),
      temperature: z.number().optional(),
      glucose: z.number().optional(),
    })
    .optional(),
  encounterType: z
    .enum(['CONSULTATION', 'TELEHEALTH', 'EMERGENCY', 'FOLLOW_UP', 'ROUTINE'])
    .optional(),
});

export const reportAnalysisSchema = z.object({
  documentType: z.string().max(100).optional(),
  fileName: z.string().max(255).optional(),
  mimeType: z.string().max(100).optional(),
  fileSize: z.number().max(10 * 1024 * 1024, 'File size exceeds maximum limit of 10MB').optional(),
  fileContentBase64: z.string().optional(),
  textContent: z.string().max(50000, 'Text content exceeds maximum limit').optional(),
  isDemoRequested: z.boolean().optional(),
});

export const doctorMatchSchema = z.object({
  symptomText: z
    .string({ required_error: 'Symptom description is required' })
    .min(2, 'Symptom description must be at least 2 characters.')
    .max(1000, 'Symptom description exceeds maximum limit of 1,000 characters.'),
});
