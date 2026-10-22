import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Star, 
  MapPin, 
  Clock, 
  Video, 
  Building, 
  Calendar, 
  CheckCircle, 
  CreditCard,
  Phone,
  FileCheck2,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PageNavigation } from '../components/PageNavigation';
import { Doctor } from '../types';

export const DoctorDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, activeFamilyMember } = useAuth();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);

  // Booking Flow State
  const [selectedMode, setSelectedMode] = useState<'VIDEO' | 'IN_PERSON'>('VIDEO');
  const [selectedDate, setSelectedDate] = useState('Today');
  const [selectedSlot, setSelectedSlot] = useState('04:30 PM');
  const [symptoms, setSymptoms] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<any>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Live Slots Availability State
  const [slots, setSlots] = useState<Array<{ time: string; available: boolean }>>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const getDateForOption = (option: string): string => {
    const d = new Date();
    if (option === 'Tomorrow') {
      d.setDate(d.getDate() + 1);
    } else if (option === 'Day After') {
      d.setDate(d.getDate() + 2);
    }
    return d.toISOString().slice(0, 10);
  };

  useEffect(() => {
    const fetchDoc = async () => {
      if (!id) return;
      try {
        const res = await api.getDoctorById(id);
        if (res.success) {
          setDoctor(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [id]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!doctor?._id) return;
      setSlotsLoading(true);
      try {
        const dateStr = getDateForOption(selectedDate);
        const res = await api.getDoctorSlots(doctor._id, dateStr);
        if (res.success && res.data?.slots) {
          setSlots(res.data.slots);
          const firstAvailable = res.data.slots.find((s: any) => s.available);
          if (firstAvailable) {
            setSelectedSlot(firstAvailable.time);
          }
        }
      } catch (err) {
        console.error('Failed to load slots:', err);
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [doctor?._id, selectedDate]);

  const handleBooking = async () => {
    if (!doctor) return;
    setBookingLoading(true);
    setBookingError(null);
    try {
      const dateStr = getDateForOption(selectedDate);
      const res = await api.bookAppointment({
        doctorId: doctor._id,
        mode: selectedMode,
        appointmentDate: dateStr,
        timeSlot: selectedSlot,
        symptoms: symptoms ? [symptoms] : ['General Wellness Review'],
        patientName: activeFamilyMember,
      });

      if (res.success) {
        setBookingSuccess(res.data);
      } else {
        setBookingError(res.error?.message || 'Appointment booking failed');
      }
    } catch (err: any) {
      setBookingError(err.message || 'Unable to connect to the booking service');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">Loading doctor profile...</div>;
  }

  if (!doctor) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-600">Doctor not found.</div>;
  }

  const timeSlots = ['04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
      <PageNavigation
        backFallback="/doctors"
        backLabel="Back to Doctors"
        breadcrumbs={[
          { label: 'Doctors', path: '/doctors' },
          { label: doctor.fullName },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Doctor Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 md:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6">
              <img
                src={doctor.avatarUrl}
                alt={doctor.fullName}
                className="w-28 h-28 rounded-2xl object-cover border-2 border-slate-100 shadow-sm flex-shrink-0"
              />
              <div className="space-y-2 flex-1">
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold text-slate-900">{doctor.fullName}</h1>
                  <span className="inline-flex items-center text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-0.5 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1 text-teal-600" /> Council Verified
                  </span>
                </div>

                <p className="text-sm font-semibold text-medical-700">{doctor.specialties.join(', ')}</p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                  <span>{doctor.experienceYears} Years Clinical Experience</span>
                  <span>•</span>
                  <div className="flex items-center text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 mr-1" />
                    <span>{doctor.ratingAverage}</span>
                    <span className="text-slate-400 font-normal ml-0.5">({doctor.ratingCount} reviews)</span>
                  </div>
                </div>

                <div className="pt-2 text-xs text-slate-600 flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 bg-slate-100 rounded-md font-medium">
                    Reg No: {doctor.registrationNumber} ({doctor.registrationCouncil})
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 rounded-md font-medium">
                    Speaks: {doctor.languagesSpoken.join(', ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Biography */}
            <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">About Doctor</h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{doctor.bio}</p>
            </div>

            {/* Qualifications & Degrees */}
            <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Medical Education & Accreditation</h2>
              <div className="space-y-2">
                {doctor.qualifications.map((q, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-xs text-slate-700">
                    <FileCheck2 className="w-4 h-4 text-medical-600 flex-shrink-0" />
                    <span><strong className="text-slate-900">{q.degree}</strong> — {q.college} ({q.year})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hospital & Clinic Location */}
            <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Clinic & Hospital Affiliations</h2>
              {doctor.clinicAffiliations.map((c, idx) => (
                <div key={idx} className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <MapPin className="w-4 h-4 text-medical-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-slate-900">{c.clinicName}</p>
                    <p className="text-slate-500">{c.address}, {c.city}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Slot Booking Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm sticky top-24">
            <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
              Book Consultation Slot
            </h2>

            {bookingSuccess ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Appointment Confirmed!</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Booking #{bookingSuccess.appointmentNumber} has been verified and registered.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl text-left text-xs space-y-1 text-slate-700 border border-slate-200">
                  <p><strong>Patient:</strong> {bookingSuccess.patientName}</p>
                  <p><strong>Doctor:</strong> {bookingSuccess.doctorName}</p>
                  <p><strong>Slot:</strong> {bookingSuccess.timeSlot}</p>
                  <p><strong>OPD Token:</strong> #{bookingSuccess.tokenNumber}</p>
                </div>
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full py-2.5 bg-medical-700 hover:bg-medical-800 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Go to Patient Dashboard
                  </button>
                  {bookingSuccess.mode === 'VIDEO' && (
                    <button
                      onClick={() => navigate(`/consultation/${bookingSuccess._id}`)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Launch Video Room</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-5 pt-4">
                {/* Mode Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Select Consultation Mode</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => setSelectedMode('VIDEO')}
                      className={`p-2.5 rounded-xl border text-center font-medium transition-colors flex flex-col items-center space-y-1 ${
                        selectedMode === 'VIDEO'
                          ? 'bg-medical-50 border-medical-600 text-medical-800 font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Video className="w-4 h-4 text-medical-600" />
                      <span>Video Consult</span>
                      <span className="text-[10px] text-slate-500 font-normal">₹{doctor.pricing.videoFee}</span>
                    </button>
                    <button
                      onClick={() => setSelectedMode('IN_PERSON')}
                      className={`p-2.5 rounded-xl border text-center font-medium transition-colors flex flex-col items-center space-y-1 ${
                        selectedMode === 'IN_PERSON'
                          ? 'bg-medical-50 border-medical-600 text-medical-800 font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Building className="w-4 h-4 text-slate-600" />
                      <span>In-Clinic Visit</span>
                      <span className="text-[10px] text-slate-500 font-normal">₹{doctor.pricing.inPersonFee}</span>
                    </button>
                  </div>
                </div>

                {/* Date Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Select Date</label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {['Today', 'Tomorrow', 'Day After'].map((d) => (
                      <button
                        key={d}
                        onClick={() => setSelectedDate(d)}
                        className={`py-2 rounded-lg border text-center font-medium transition-colors ${
                          selectedDate === d
                            ? 'bg-slate-900 border-slate-900 text-white font-bold'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Slot Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700">Available Slots ({selectedDate})</label>
                    {slotsLoading && <span className="text-[10px] text-medical-600 font-semibold animate-pulse">Checking availability...</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {slots.length === 0 && !slotsLoading ? (
                      <div className="col-span-3 py-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No available slots for this date.
                      </div>
                    ) : (
                      slots.map((slot) => {
                        const isSelected = selectedSlot === slot.time;
                        const isAvailable = slot.available;
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => setSelectedSlot(slot.time)}
                            className={`py-2 px-1 text-xs font-semibold rounded-lg border text-center transition-all ${
                              !isAvailable
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed line-through'
                                : isSelected
                                ? 'bg-medical-600 border-medical-600 text-white shadow-xs'
                                : 'border-slate-200 text-slate-700 hover:border-medical-500 bg-white'
                            }`}
                          >
                            <span>{slot.time}</span>
                            {!isAvailable && <span className="block text-[9px] no-underline font-normal text-rose-500">Booked</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Symptom Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Visit / Symptoms</label>
                  <textarea
                    rows={2}
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="E.g. Follow-up for blood pressure check, mild headache..."
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 text-slate-800"
                  />
                </div>

                {/* Patient Information Note */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600">
                  <span>Booking for: <strong>{activeFamilyMember}</strong></span>
                </div>

                {/* Booking Error Banner */}
                {bookingError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-700 text-xs animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <p className="font-medium">{bookingError}</p>
                  </div>
                )}

                {/* Confirm & Pay Button */}
                <button
                  onClick={handleBooking}
                  disabled={bookingLoading}
                  className="w-full py-3 bg-medical-700 hover:bg-medical-800 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 shadow-md shadow-medical-900/20 transition-all"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {bookingLoading
                      ? 'Confirming Slot...'
                      : `Pay ₹${selectedMode === 'VIDEO' ? doctor.pricing.videoFee : doctor.pricing.inPersonFee} & Book Slot`}
                  </span>
                </button>
                <p className="text-[10px] text-center text-slate-400">
                  Instant confirmation • Reschedule free up to 2 hours prior
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
