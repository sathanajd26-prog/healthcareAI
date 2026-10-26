import { Router } from 'express';
import { requestOTP, verifyOTP, getCurrentUser, logoutUser } from '../modules/auth/authController';
import { getDoctors, getDoctorById, aiMatchDoctor } from '../modules/doctors/doctorController';
import {
  bookAppointment,
  getMyAppointments,
  getQueueStatus,
  cancelAppointment,
  rescheduleAppointment,
  getDoctorSlots,
  getDoctorQueue
} from '../modules/appointments/appointmentController';
import {
  bookAppointmentSchema,
  cancelAppointmentSchema,
  rescheduleAppointmentSchema
} from '../modules/appointments/appointmentSchemas';
import { validateBody } from '../middleware/validation';
import { getHealthTimeline, createMedicalRecord } from '../modules/records/recordController';
import { createMedicalRecordSchema } from '../modules/records/recordSchemas';
import { createPrescription, getMyPrescriptions, getPrescriptionById } from '../modules/prescriptions/prescriptionController';
import { queryHealthAssistant, generateSoapDraft, analyzeReportDocument } from '../modules/ai/aiController';
import {
  chatQuerySchema,
  soapDraftSchema,
  reportAnalysisSchema,
  doctorMatchSchema
} from '../modules/ai/aiSchemas';
import { authenticate, requireRole } from '../middleware/auth';
import {
  authRateLimiter,
  bookingRateLimiter,
  aiPublicMatchLimiter,
  aiChatLimiter,
  aiOcrLimiter,
} from '../middleware/rateLimiter';

import { isDbConnected, getDbState } from '../config/db';

const router = Router();

// Liveness Check (Process running)
router.get('/live', (req, res) => {
  res.json({
    status: 'ALIVE',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Readiness Check (Database and critical dependencies ready)
router.get('/ready', (req, res) => {
  const dbConnected = isDbConnected();
  if (!dbConnected) {
    res.status(503).json({
      ready: false,
      status: 'NOT_READY',
      services: {
        database: getDbState(),
      },
      message: 'Database connection not ready to receive clinical traffic.',
    });
    return;
  }

  res.json({
    ready: true,
    status: 'READY',
    services: {
      database: 'CONNECTED',
    },
    timestamp: new Date().toISOString(),
  });
});

// Accurate Subsystem Health Check
router.get('/health', (req, res) => {
  const dbConnected = isDbConnected();
  const hasLiveAiKey = Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);

  const overallStatus = dbConnected ? (hasLiveAiKey ? 'HEALTHY' : 'DEGRADED_LOCAL_AI') : 'UNHEALTHY';
  const statusCode = dbConnected ? 200 : 503;

  res.status(statusCode).json({
    status: overallStatus,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      api: 'UP',
      database: getDbState(),
      aiEngine: hasLiveAiKey ? 'LIVE_PROVIDER_CONFIGURED' : 'LOCAL_CLINICAL_SYNTHESIZER',
      telehealthGateway: 'OPERATIONAL',
    },
  });
});

// Auth Endpoints (Protected by IP Rate Limiting)
router.post('/auth/request-otp', authRateLimiter, requestOTP);
router.post('/auth/verify-otp', authRateLimiter, verifyOTP);
router.post('/auth/logout', authenticate, logoutUser);
router.get('/auth/me', authenticate, getCurrentUser);

// Doctors Marketplace Endpoints
router.get('/doctors', getDoctors);
router.get('/doctors/:id', getDoctorById);
router.get('/doctors/:id/slots', authenticate, getDoctorSlots);
router.post('/doctors/ai-match', aiPublicMatchLimiter, validateBody(doctorMatchSchema), aiMatchDoctor);

// Appointment Engine Endpoints (Protected by Booking Rate Limiter & Concurrency Guard)
router.post('/appointments/book', bookingRateLimiter, authenticate, validateBody(bookAppointmentSchema), bookAppointment);
router.get('/appointments/my', authenticate, getMyAppointments);
router.patch('/appointments/:id/cancel', authenticate, validateBody(cancelAppointmentSchema), cancelAppointment);
router.patch('/appointments/:id/reschedule', authenticate, validateBody(rescheduleAppointmentSchema), rescheduleAppointment);
router.get('/appointments/queue/:id', authenticate, getQueueStatus);
router.get('/appointments/doctor-queue', authenticate, requireRole('DOCTOR', 'SUPER_ADMIN'), getDoctorQueue);

// Medical Records & Timeline Endpoints
router.get('/records/timeline', authenticate, getHealthTimeline);
router.post('/records/upload', authenticate, validateBody(createMedicalRecordSchema), createMedicalRecord);

// Digital Prescriptions Endpoints
router.post('/prescriptions', authenticate, requireRole('DOCTOR', 'SUPER_ADMIN'), createPrescription);
router.get('/prescriptions/my', authenticate, getMyPrescriptions);
router.get('/prescriptions/:id', authenticate, getPrescriptionById);

// AI Health & Clinical Services
router.post('/ai/chat', authenticate, aiChatLimiter, validateBody(chatQuerySchema), queryHealthAssistant);
router.post('/ai/soap-draft', authenticate, requireRole('DOCTOR', 'SUPER_ADMIN'), validateBody(soapDraftSchema), generateSoapDraft);
router.post('/ai/ocr-analyze', authenticate, aiOcrLimiter, validateBody(reportAnalysisSchema), analyzeReportDocument);

export default router;
