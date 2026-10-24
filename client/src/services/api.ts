import { Doctor, Appointment, MedicalRecord, User } from '../types';

const API_BASE = '/api/v1';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  // Auth
  requestOTP: async (phone: string) => {
    const res = await fetch(`${API_BASE}/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    return res.json();
  },

  verifyOTP: async (phone: string, otp: string, fullName?: string, role?: string) => {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, fullName, role }),
    });
    return res.json();
  },

  getCurrentUser: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  logout: async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return res.json();
    } catch {
      return { success: true };
    }
  },

  // Doctors
  getDoctors: async (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/doctors?${query}`);
    return res.json();
  },

  getDoctorById: async (id: string) => {
    const res = await fetch(`${API_BASE}/doctors/${id}`);
    return res.json();
  },

  aiMatchDoctor: async (symptomText: string) => {
    const res = await fetch(`${API_BASE}/doctors/ai-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptomText }),
    });
    return res.json();
  },

  // Appointments
  bookAppointment: async (bookingData: any) => {
    const res = await fetch(`${API_BASE}/appointments/book`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(bookingData),
    });
    return res.json();
  },

  getMyAppointments: async () => {
    const res = await fetch(`${API_BASE}/appointments/my`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  getQueueStatus: async (appointmentId: string) => {
    const res = await fetch(`${API_BASE}/appointments/queue/${appointmentId}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  getDoctorQueue: async () => {
    const res = await fetch(`${API_BASE}/appointments/doctor-queue`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  getDoctorSlots: async (doctorId: string, date?: string) => {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    const res = await fetch(`${API_BASE}/doctors/${doctorId}/slots${query}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  cancelAppointment: async (appointmentId: string, reason?: string) => {
    const res = await fetch(`${API_BASE}/appointments/${appointmentId}/cancel`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    return res.json();
  },

  rescheduleAppointment: async (appointmentId: string, newDate: string, newTimeSlot: string, reason?: string) => {
    const res = await fetch(`${API_BASE}/appointments/${appointmentId}/reschedule`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ newDate, newTimeSlot, reason }),
    });
    return res.json();
  },

  // Records & EMR
  getTimeline: async () => {
    const res = await fetch(`${API_BASE}/records/timeline`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  uploadRecord: async (recordData: any) => {
    const res = await fetch(`${API_BASE}/records/upload`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(recordData),
    });
    return res.json();
  },

  // Prescriptions
  createPrescription: async (prescriptionData: any) => {
    const res = await fetch(`${API_BASE}/prescriptions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(prescriptionData),
    });
    return res.json();
  },

  getMyPrescriptions: async () => {
    const res = await fetch(`${API_BASE}/prescriptions/my`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  getPrescriptionById: async (id: string) => {
    const res = await fetch(`${API_BASE}/prescriptions/${id}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  // AI Services
  askHealthAssistant: async (
    question: string,
    conversationHistory?: any[],
    activePatientName?: string,
    signal?: AbortSignal
  ) => {
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ question, conversationHistory, activePatientName }),
      signal,
    });
    return res.json();
  },

  generateSoapDraft: async (dialogue: string, symptoms: string) => {
    const res = await fetch(`${API_BASE}/ai/soap-draft`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ consultationDialogue: dialogue, patientSymptoms: symptoms }),
    });
    return res.json();
  },

  analyzeDocumentOCR: async (
    params: string | {
      documentType?: string;
      fileName?: string;
      mimeType?: string;
      fileSize?: number;
      fileContentBase64?: string;
      textContent?: string;
      isDemoRequested?: boolean;
    }
  ) => {
    const payload = typeof params === 'string' ? { documentType: params } : params;
    const res = await fetch(`${API_BASE}/ai/ocr-analyze`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },
};
