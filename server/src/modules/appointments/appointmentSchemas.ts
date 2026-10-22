import { z } from 'zod';

export const bookAppointmentSchema = z.object({
  doctorId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid doctor ID format'),
  appointmentDate: z.string().refine((val) => {
    const d = new Date(val);
    if (isNaN(d.getTime())) return false;
    // Allow today or future dates (with 1 day buffer for timezones)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return d >= yesterday;
  }, {
    message: 'Appointment date must be today or in the future',
  }),
  timeSlot: z.string().min(3).max(20, 'Time slot format must be valid (e.g. 04:30 PM)'),
  mode: z.enum(['IN_PERSON', 'VIDEO', 'AUDIO', 'HOME_VISIT']).default('VIDEO'),
  patientName: z.string().min(1).max(100).optional(),
  symptoms: z.union([z.string(), z.array(z.string())]).optional(),
});

export const rescheduleAppointmentSchema = z.object({
  newDate: z.string().optional(),
  appointmentDate: z.string().optional(),
  newTimeSlot: z.string().min(3).max(20).optional(),
  timeSlot: z.string().min(3).max(20).optional(),
  reason: z.string().max(300).optional(),
}).refine((data) => {
  const dateVal = data.newDate || data.appointmentDate;
  const slotVal = data.newTimeSlot || data.timeSlot;
  if (!dateVal || !slotVal) return false;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d >= yesterday;
}, {
  message: 'Rescheduled date must be valid and in the future, and slot must be specified',
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().max(300).optional(),
});
