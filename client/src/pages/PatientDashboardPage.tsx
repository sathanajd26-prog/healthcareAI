import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Activity, 
  Calendar, 
  Clock, 
  Pill, 
  FileText, 
  Video, 
  CheckCircle2, 
  AlertCircle, 
  Heart, 
  TrendingUp, 
  Plus, 
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  RotateCcw,
  Check,
  Download
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Appointment } from '../types';
import { PageNavigation } from '../components/PageNavigation';
import { TiltCard } from '../components/motion/TiltCard';

export const PatientDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, activeFamilyMember } = useAuth();
  const { t } = useLanguage();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reschedule Modal State
  const [reschedulingAppt, setReschedulingAppt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('Tomorrow');
  const [rescheduleSlot, setRescheduleSlot] = useState('10:00 AM');
  const [rescheduleSlots, setRescheduleSlots] = useState<Array<{ time: string; available: boolean }>>([]);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // Digital Prescriptions State
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);
  const [newRxNotice, setNewRxNotice] = useState<string | null>(null);

  // Medication tracker state
  const [meds, setMeds] = useState<Array<{
    id: string | number;
    name: string;
    time: string;
    status: 'TAKEN' | 'PENDING';
    instruction: string;
    rxNumber?: string;
  }>>([
    { id: 1, name: 'Metformin 500mg', time: '08:00 AM', status: 'TAKEN', instruction: 'After breakfast' },
    { id: 2, name: 'Telmisartan 20mg', time: '01:00 PM', status: 'TAKEN', instruction: 'With lunch' },
    { id: 3, name: 'Multivitamin B-Complex', time: '08:00 PM', status: 'PENDING', instruction: 'After dinner' },
  ]);

  const fetchPrescriptions = async () => {
    setPrescriptionsLoading(true);
    try {
      const res = await api.getMyPrescriptions();
      let serverRx: any[] = [];
      if (res.success && Array.isArray(res.data)) {
        serverRx = res.data;
      }

      // Merge with locally stored prescriptions if any
      let localRx: any[] = [];
      try {
        localRx = JSON.parse(localStorage.getItem('aegis_prescriptions') || '[]');
      } catch (e) {
        // ignore
      }

      const combinedMap = new Map();
      [...serverRx, ...localRx].forEach((rx: any) => {
        const key = rx.prescriptionNumber || rx._id || JSON.stringify(rx.medications);
        if (!combinedMap.has(key)) {
          combinedMap.set(key, rx);
        }
      });

      const mergedList = Array.from(combinedMap.values());
      setPrescriptions(mergedList);

      // Extract new medications from prescriptions into the daily tracker list
      if (mergedList.length > 0) {
        const derivedMeds: any[] = [];
        mergedList.forEach((rx, rxIdx) => {
          (rx.medications || []).forEach((m: any, mIdx: number) => {
            derivedMeds.push({
              id: `rx-${rxIdx}-${mIdx}-${m.name}`,
              name: `${m.name} ${m.dosage || ''}`.trim(),
              time: m.frequency || m.freq || 'Daily',
              status: 'PENDING',
              instruction: m.instructions || 'As advised by doctor',
              rxNumber: rx.prescriptionNumber || 'RX-VERIFIED'
            });
          });
        });

        // Merge with existing default tracker items
        setMeds(prev => {
          const existingNames = new Set(prev.map(p => p.name.toLowerCase()));
          const novelItems = derivedMeds.filter(d => !existingNames.has(d.name.toLowerCase()));
          return [...novelItems, ...prev];
        });
      }
    } catch (err) {
      console.error('Error fetching prescriptions:', err);
    } finally {
      setPrescriptionsLoading(false);
    }
  };

  const fetchAppts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMyAppointments();
      if (res.success) {
        setAppointments(res.data);
      } else {
        setError(res.error?.message || 'Failed to fetch appointments');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to appointment service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppts();
    fetchPrescriptions();

    // Listen to live prescription broadcasts transmitted by doctor workbench
    const handleLivePrescription = (e: any) => {
      const rx = e.detail;
      if (rx) {
        setPrescriptions(prev => [rx, ...prev.filter(p => p.prescriptionNumber !== rx.prescriptionNumber)]);
        setNewRxNotice(`New prescription ${rx.prescriptionNumber || ''} transmitted by ${rx.doctorName || 'Doctor'}!`);
        
        // Add new medications directly to today's medication list
        if (rx.medications && Array.isArray(rx.medications)) {
          const newMedEntries = rx.medications.map((m: any, idx: number) => ({
            id: `rx-live-${Date.now()}-${idx}`,
            name: `${m.name} ${m.dosage || ''}`.trim(),
            time: m.frequency || 'Daily',
            status: 'PENDING' as const,
            instruction: m.instructions || 'Transmitted from Doctor Workbench',
            rxNumber: rx.prescriptionNumber
          }));
          setMeds(prev => [...newMedEntries, ...prev]);
        }

        setTimeout(() => setNewRxNotice(null), 8000);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'aegis_prescriptions') {
        fetchPrescriptions();
      }
    };

    window.addEventListener('aegis_prescription_transmitted', handleLivePrescription);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('aegis_prescription_transmitted', handleLivePrescription);
      window.removeEventListener('storage', handleStorage);
    };
  }, [activeFamilyMember]);

  const handleCancelAppointment = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment? Your slot will be released.')) return;
    setActionLoading(id);
    try {
      const res = await api.cancelAppointment(id, 'Patient cancelled from dashboard');
      if (res.success) {
        setAppointments((prev) =>
          prev.map((a) => (a._id === id ? { ...a, status: 'CANCELLED' } : a))
        );
      } else {
        alert(res.error?.message || 'Failed to cancel appointment');
      }
    } catch (err: any) {
      alert(err.message || 'Error cancelling appointment');
    } finally {
      setActionLoading(null);
    }
  };

  const openRescheduleModal = async (appt: Appointment) => {
    setReschedulingAppt(appt);
    setRescheduleDate('Tomorrow');
    setRescheduleError(null);
    fetchRescheduleSlots(appt.doctorId, 'Tomorrow');
  };

  const getRescheduleDateIso = (option: string): string => {
    const d = new Date();
    if (option === 'Tomorrow') d.setDate(d.getDate() + 1);
    else if (option === 'Day After') d.setDate(d.getDate() + 2);
    else if (option === 'In 3 Days') d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  };

  const fetchRescheduleSlots = async (doctorId: string, option: string) => {
    setRescheduleSlotsLoading(true);
    try {
      const dateStr = getRescheduleDateIso(option);
      const res = await api.getDoctorSlots(doctorId, dateStr);
      if (res.success && res.data?.slots) {
        setRescheduleSlots(res.data.slots);
        const firstAvail = res.data.slots.find((s: any) => s.available);
        if (firstAvail) setRescheduleSlot(firstAvail.time);
      }
    } catch (err) {
      console.error('Failed to fetch slots for rescheduling:', err);
    } finally {
      setRescheduleSlotsLoading(false);
    }
  };

  const submitReschedule = async () => {
    if (!reschedulingAppt) return;
    setRescheduleSubmitting(true);
    setRescheduleError(null);
    try {
      const newDateIso = getRescheduleDateIso(rescheduleDate);
      const res = await api.rescheduleAppointment(reschedulingAppt._id, newDateIso, rescheduleSlot);
      if (res.success) {
        setAppointments((prev) =>
          prev.map((a) => (a._id === reschedulingAppt._id ? res.data : a))
        );
        setReschedulingAppt(null);
      } else {
        setRescheduleError(res.error?.message || 'Failed to reschedule appointment');
      }
    } catch (err: any) {
      setRescheduleError(err.message || 'Error rescheduling');
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  const toggleMed = (id: string | number) => {
    setMeds(meds.map(m => m.id === id ? { ...m, status: m.status === 'TAKEN' ? 'PENDING' : 'TAKEN' } : m));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Contextual Navigation */}
      <PageNavigation
        backFallback="/"
        backLabel="Back"
        showHome={false}
        breadcrumbs={[
          { label: 'Home', path: '/' },
          { label: 'Patient Dashboard' },
        ]}
      />

      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-medical-800 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-teal-200 mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Active Profile: {activeFamilyMember}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Good morning, {activeFamilyMember.split(' ')[0]}
          </h1>
          <p className="text-xs sm:text-sm text-teal-100/90 mt-1 max-w-xl">
            Your cardiovascular and glycemic telemetry are tracking within acceptable parameters this week.
          </p>
        </div>

        {/* Health Score Circular Badge */}
        <TiltCard maxTilt={5} scale={1.03}>
          <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/15 h-full">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-400 flex items-center justify-center font-bold text-lg text-emerald-300">
              88
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-teal-200">Health Index</p>
              <p className="text-xs font-semibold text-white">Excellent Metabolic Health</p>
            </div>
          </div>
        </TiltCard>
      </div>

      {/* Grid: Health Metrics & Today's Care with 3D Depth */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1: Blood Pressure */}
        <TiltCard maxTilt={6} scale={1.02}>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between h-full">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Blood Pressure</p>
              <p className="text-xl font-bold text-slate-900 mt-1">124 / 82 <span className="text-xs text-slate-400 font-normal">mmHg</span></p>
              <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Optimal Trend
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </div>
          </div>
        </TiltCard>

        {/* Metric 2: Heart Rate */}
        <TiltCard maxTilt={6} scale={1.02}>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between h-full">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Resting Heart Rate</p>
              <p className="text-xl font-bold text-slate-900 mt-1">72 <span className="text-xs text-slate-400 font-normal">bpm</span></p>
              <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Steady Sinus
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </TiltCard>

        {/* Metric 3: Blood Sugar */}
        <TiltCard maxTilt={6} scale={1.02}>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between h-full">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fasting Glucose</p>
              <p className="text-xl font-bold text-slate-900 mt-1">112 <span className="text-xs text-slate-400 font-normal">mg/dL</span></p>
              <span className="inline-block mt-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                Mildly Elevated
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </TiltCard>

        {/* Metric 4: Steps */}
        <TiltCard maxTilt={6} scale={1.02}>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between h-full">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Daily Activity</p>
              <p className="text-xl font-bold text-slate-900 mt-1">4,200 <span className="text-xs text-slate-400 font-normal">/ 7,000 steps</span></p>
              <span className="inline-block mt-1 text-[10px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                60% Completed
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </TiltCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Appointments & Medications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Appointment Widget */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-medical-700" />
                <h2 className="text-base font-bold text-slate-900">Upcoming Consultations</h2>
              </div>
              <Link to="/doctors" className="text-xs font-bold text-medical-700 hover:text-medical-800 flex items-center">
                <span>Book New</span>
                <Plus className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>

            <div className="space-y-4 pt-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 animate-pulse flex items-center justify-between">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-12 h-12 bg-slate-200 rounded-xl" />
                        <div className="space-y-2">
                          <div className="w-32 h-4 bg-slate-200 rounded" />
                          <div className="w-24 h-3 bg-slate-200 rounded" />
                        </div>
                      </div>
                      <div className="w-20 h-8 bg-slate-200 rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
                  <span>{error}</span>
                  <button onClick={fetchAppts} className="font-bold underline hover:text-rose-900">
                    Retry
                  </button>
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-8 px-4 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No scheduled consultations</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm mx-auto">
                    You have no active appointments booked. Choose a doctor to schedule a video or in-clinic visit.
                  </p>
                  <Link
                    to="/doctors"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 mt-3 bg-medical-700 hover:bg-medical-800 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Find a Doctor & Book Slot</span>
                  </Link>
                </div>
              ) : (
                appointments.map((appt) => {
                  const isCancelled = appt.status === 'CANCELLED';
                  const isCompleted = appt.status === 'COMPLETED';
                  const isActionable = !isCancelled && !isCompleted;
                  const formattedDate = new Date(appt.appointmentDate).toLocaleDateString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={appt._id}
                      className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                        isCancelled
                          ? 'border-slate-200 bg-slate-50/40 opacity-75'
                          : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start space-x-3.5">
                        <img
                          src={appt.doctorAvatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500'}
                          alt={appt.doctorName}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-bold text-slate-900">{appt.doctorName}</h3>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                isCancelled
                                  ? 'bg-rose-100 text-rose-800'
                                  : isCompleted
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {appt.status}
                            </span>
                            {!isCancelled && (
                              <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded">
                                Token #{appt.tokenNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-medical-700 font-medium">{appt.doctorSpecialty}</p>
                          <p className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-slate-700">{formattedDate}</span>
                            <span>•</span>
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{appt.timeSlot}</span>
                            <span>•</span>
                            <span>{appt.mode === 'VIDEO' ? 'Encrypted Video' : 'In-Clinic OPD'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                        {isActionable && appt.mode === 'VIDEO' && (
                          <Link
                            to={`/consultation/${appt._id}`}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-2xs transition-colors"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Join Call</span>
                          </Link>
                        )}

                        {isActionable && (
                          <button
                            type="button"
                            onClick={() => openRescheduleModal(appt)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                            <span>Reschedule</span>
                          </button>
                        )}

                        {isActionable && (
                          <button
                            type="button"
                            disabled={actionLoading === appt._id}
                            onClick={() => handleCancelAppointment(appt._id)}
                            className="px-3 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            {actionLoading === appt._id ? 'Cancelling...' : 'Cancel'}
                          </button>
                        )}

                        {isCancelled && (
                          <span className="text-xs text-rose-600 font-medium italic">
                            Cancelled • Slot Released
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Real-time Transmission Notice */}
          {newRxNotice && (
            <div className="p-4 bg-teal-50 border-2 border-teal-500 rounded-2xl flex items-center justify-between text-teal-950 text-xs font-semibold animate-pulse shadow-md">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span>{newRxNotice}</span>
              </div>
              <button 
                onClick={() => setNewRxNotice(null)}
                className="text-teal-700 hover:text-teal-900 font-bold px-2 py-0.5"
              >
                ✕
              </button>
            </div>
          )}

          {/* Transmitted Digital Prescriptions from Doctor */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-medical-700" />
                <h2 className="text-base font-bold text-slate-900">Digital Prescriptions (Doctor Workbench)</h2>
              </div>
              <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
                {prescriptions.length} Active {prescriptions.length === 1 ? 'Rx' : 'Rx Records'}
              </span>
            </div>

            {prescriptionsLoading && (
              <div className="py-6 text-center text-xs text-slate-400">Loading verified prescriptions...</div>
            )}

            {!prescriptionsLoading && prescriptions.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-500 space-y-1">
                <p className="font-semibold">No digital prescriptions transmitted yet.</p>
                <p className="text-slate-400">Prescriptions signed in the Doctor Workbench appear here immediately.</p>
              </div>
            )}

            {!prescriptionsLoading && prescriptions.length > 0 && (
              <div className="space-y-4">
                {prescriptions.map((rx: any, idx: number) => (
                  <div key={rx._id || rx.prescriptionNumber || idx} className="p-4 rounded-xl border border-teal-100 bg-teal-50/30 space-y-3">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-slate-900">{rx.prescriptionNumber || `RX-2026-${idx + 1}`}</span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            FHIR Digital Signature Verified ✓
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Prescribed by <span className="font-semibold text-slate-700">{rx.doctorName || 'Dr. Ananya Deshmukh, MD'}</span> • {rx.doctorSpecialty || 'Cardiology'}
                        </p>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {rx.createdAt ? new Date(rx.createdAt).toLocaleDateString() : 'Today'}
                      </span>
                    </div>

                    {/* Prescribed Drugs list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {(rx.medications || []).map((med: any, mIdx: number) => (
                        <div key={mIdx} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{med.name}</span>
                            <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-1.5 py-0.5 rounded">
                              {med.dosage || 'Standard'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{med.frequency || med.freq || 'Daily'}</p>
                          {med.instructions && (
                            <p className="text-[10px] text-slate-400 italic mt-0.5">Note: {med.instructions}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {rx.advice && (
                      <div className="p-2.5 bg-white/80 rounded-lg border border-teal-100 text-[11px] text-teal-900">
                        <span className="font-bold">Doctor's Advice:</span> {rx.advice}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Prescribed Medications Checklist */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Pill className="w-5 h-5 text-teal-700" />
                <h2 className="text-base font-bold text-slate-900">{t('dashboard.meds')}</h2>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {meds.filter(m => m.status === 'TAKEN').length} of {meds.length} doses taken
              </span>
            </div>

            <div className="divide-y divide-slate-100 pt-2">
              {meds.map((m) => (
                <div key={m.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleMed(m.id)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                        m.status === 'TAKEN'
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 text-transparent hover:border-slate-400'
                      }`}
                      title={m.status === 'TAKEN' ? 'Mark pending' : 'Mark taken'}
                    >
                      <CheckCircle2 className="w-4 h-4 fill-current" />
                    </button>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className={`text-xs font-bold ${m.status === 'TAKEN' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {m.name}
                        </p>
                        {m.rxNumber && (
                          <span className="text-[9px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded">
                            {m.rxNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">{m.time} • {m.instruction}</p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                    m.status === 'TAKEN' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: AI Insights & Quick Links */}
        <div className="space-y-6">
          {/* AI Non-Diagnostic Health Insights Card (Section 6 Example) */}
          <div className="bg-gradient-to-br from-teal-50 to-emerald-50/50 rounded-2xl border border-teal-200 p-6 shadow-sm">
            <div className="flex items-center space-x-2 text-teal-800 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>AI Health Twin Insights</span>
            </div>
            <h3 className="text-base font-bold text-slate-900">Blood Pressure Trend Alert</h3>
            <p className="text-xs text-slate-700 mt-2 leading-relaxed">
              Your recent blood pressure readings (124/82) have increased compared with your previous 30-day baseline (118/78).
            </p>
            <div className="mt-4 p-3 bg-white/80 rounded-xl border border-teal-100 text-xs text-teal-900 font-medium">
              💡 <strong>Action item:</strong> Discuss this trend with Dr. Ananya Deshmukh during today's scheduled check-in.
            </div>
            <Link
              to="/ai-assistant"
              className="mt-4 block text-center py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition-colors"
            >
              Ask AI Health Assistant
            </Link>
          </div>

          {/* Quick Services Navigation */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h3>
            <Link
              to="/records"
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <FileText className="w-4 h-4 text-medical-600" />
                <span>View Longitudinal EMR Timeline</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link
              to="/emergency"
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-rose-50 text-xs font-semibold text-rose-700 transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Emergency Hospital & Ambulance SOS</span>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {reschedulingAppt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-5 h-5 text-medical-700" />
                <h3 className="text-base font-bold text-slate-900">Reschedule Consultation</h3>
              </div>
              <button
                type="button"
                onClick={() => setReschedulingAppt(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-1">
              <p className="font-semibold text-slate-800">
                Doctor: <span className="font-bold text-medical-800">{reschedulingAppt.doctorName}</span>
              </p>
              <p className="text-slate-500">
                Current Time: {new Date(reschedulingAppt.appointmentDate).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {reschedulingAppt.timeSlot}
              </p>
            </div>

            {rescheduleError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{rescheduleError}</span>
              </div>
            )}

            {/* Select Day */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Select New Day</label>
              <div className="grid grid-cols-3 gap-2">
                {['Tomorrow', 'Day After', 'In 3 Days'].map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      setRescheduleDate(day);
                      fetchRescheduleSlots(reschedulingAppt.doctorId, day);
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                      rescheduleDate === day
                        ? 'border-medical-600 bg-medical-50 text-medical-800 font-bold shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Select Slot */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Select New Time Slot</label>
              {rescheduleSlotsLoading ? (
                <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-medical-600 border-t-transparent rounded-full animate-spin" />
                  <span>Loading available slots...</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                  {rescheduleSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setRescheduleSlot(slot.time)}
                      className={`py-2 px-2 text-xs rounded-xl border text-center transition-all ${
                        !slot.available
                          ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed line-through'
                          : rescheduleSlot === slot.time
                          ? 'border-medical-600 bg-medical-600 text-white font-bold shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 font-medium'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReschedulingAppt(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rescheduleSubmitting || !rescheduleSlot}
                onClick={submitReschedule}
                className="px-5 py-2 bg-medical-700 hover:bg-medical-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                {rescheduleSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
