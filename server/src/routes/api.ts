import { Router } from 'express';
import { requestOTP, verifyOTP, getCurrentUser, logoutUser } from '../modules/auth/authController';
import { getDoctors, getDoctorById, aiMatchDoctor } from '../modules/doctors/doctorController';
import { 
  bookAppointment, 
  getMyAppointments, 
  getQueueStatus,
  cancelAppointment,
  rescheduleAppointment,
  getDoctorSlots
} from '../modules/appointments/appointmentController';
import { 
  bookAppointmentSchema, 
  cancelAppointmentSchema, 
  rescheduleAppointmentSchema 
} from '../modules/appointments/appointmentSchemas';
import { validateBody } from '../middleware/validation';
import { getHealthTimeline, createMedicalRecord } from '../modules/records/recordController';
import { createPrescription, getMyPrescriptions } from '../modules/prescriptions/prescriptionController';
import { queryHealthAssistant, generateSoapDraft, analyzeReportDocument } from '../modules/ai/aiController';
import { authenticate } from '../middleware/auth';
import { authRateLimiter, bookingRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    version: '1.0.0-PROD',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      api: 'UP',
      database: 'CONNECTED',
      aiEngine: 'READY',
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
router.post('/doctors/ai-match', aiMatchDoctor);

// Appointment Engine Endpoints (Protected by Booking Rate Limiter & Concurrency Guard)
router.post('/appointments/book', bookingRateLimiter, authenticate, validateBody(bookAppointmentSchema), bookAppointment);
router.get('/appointments/my', authenticate, getMyAppointments);
router.patch('/appointments/:id/cancel', authenticate, validateBody(cancelAppointmentSchema), cancelAppointment);
router.patch('/appointments/:id/reschedule', authenticate, validateBody(rescheduleAppointmentSchema), rescheduleAppointment);
router.get('/appointments/queue/:id', authenticate, getQueueStatus);

// Medical Records & Timeline Endpoints
router.get('/records/timeline', authenticate, getHealthTimeline);
router.post('/records/upload', authenticate, createMedicalRecord);

// Digital Prescriptions Endpoints
router.post('/prescriptions', authenticate, createPrescription);
router.get('/prescriptions/my', authenticate, getMyPrescriptions);

// AI Health & Clinical Services
router.post('/ai/chat', authenticate, queryHealthAssistant);
router.post('/ai/soap-draft', authenticate, generateSoapDraft);
router.post('/ai/ocr-analyze', authenticate, analyzeReportDocument);

export default router;
