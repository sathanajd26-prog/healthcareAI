import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, 
  Video, 
  MapPin, 
  Calendar, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  HeartPulse, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  Award,
  Stethoscope,
  Pill,
  FlaskConical,
  Activity
} from 'lucide-react';
import { api } from '../services/api';
import { Doctor } from '../types';
import { DoctorAvatar } from '../components/DoctorAvatar';
import { MedicalHeroFallback } from '../components/3d/MedicalHeroFallback';
import { TiltCard } from '../components/motion/TiltCard';
import { LocationSelector, getSavedLocation } from '../components/LocationSelector';
import { LocationItem } from '../data/locations';
import { FeatureCarousel } from '../components/FeatureCarousel';

const MedicalHeroCanvas = React.lazy(() =>
  import('../components/3d/MedicalHeroCanvas').then((m) => ({ default: m.MedicalHeroCanvas }))
);

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(getSavedLocation);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  // AI Matching State
  const [symptomInput, setSymptomInput] = useState('');
  const [aiMatching, setAiMatching] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await api.getDoctors();
        if (res.success && Array.isArray(res.data?.doctors)) {
          const seen = new Set<string>();
          const uniqueDocs = res.data.doctors.filter((d: Doctor) => {
            if (!d._id || seen.has(d._id)) return false;
            seen.add(d._id);
            return true;
          });
          setDoctors(uniqueDocs.slice(0, 4));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const locParam = selectedLocation ? `&location=${encodeURIComponent(selectedLocation.city)}` : '';
    navigate(`/doctors?query=${encodeURIComponent(searchQuery)}&specialty=${encodeURIComponent(selectedSpecialty)}${locParam}`);
  };

  const handleAiMatch = async (text: string) => {
    setSymptomInput(text);
    setAiMatching(true);
    setAiResult(null);
    try {
      const res = await api.aiMatchDoctor(text);
      if (res.success) {
        setAiResult(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiMatching(false);
    }
  };

  const specialties = [
    { name: 'Cardiologist', icon: HeartPulse, category: 'Heart & Cardiovascular' },
    { name: 'Dermatologist', icon: Activity, category: 'Skin & Hair Health' },
    { name: 'Pediatrician', icon: Stethoscope, category: 'Child & Newborn Care' },
    { name: 'Orthopedic Surgeon', icon: Award, category: 'Bones & Joint Care' },
    { name: 'General Physician', icon: CheckCircle2, category: 'Internal Medicine & Wellness' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-16 lg:py-20 clinical-gradient text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column: Heading, Value Props, Search & Badges */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold text-teal-100 border border-white/20 shadow-xs animate-fade-in-up">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Next-Gen Healthcare Super-App • AI-Powered Clinical OS</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                Exceptional Care. <br />
                <span className="text-teal-200">Zero Wait Time.</span>
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-teal-50 max-w-xl leading-relaxed">
                Connect with top verified doctors, schedule instant video visits, view longitudinal health timelines, and access non-diagnostic clinical AI guidance.
              </p>

              {/* Main Search Bar */}
              <form onSubmit={handleSearch} className="pt-2">
                <div className="bg-white p-2 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center gap-2 border border-slate-100">
                  <LocationSelector
                    variant="hero"
                    className="w-full sm:w-1/3 border-b sm:border-b-0 sm:border-r border-slate-200"
                    onLocationChange={(loc) => setSelectedLocation(loc)}
                  />

                  <div className="flex items-center space-x-2 px-3 w-full sm:w-1/2 py-2 sm:py-0">
                    <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search doctors, symptoms, specialties, clinics..."
                      className="w-full text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-3 bg-medical-700 hover:bg-medical-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-medical-900/20"
                  >
                    <span>Search Care</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {/* Quick Service Badges */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2 text-xs font-medium text-teal-100">
                <Link to="/doctors?mode=VIDEO" className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-full border border-white/15 flex items-center space-x-1.5 transition-colors">
                  <Video className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Instant Video Consult (15 min)</span>
                </Link>
                <Link to="/doctors" className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-full border border-white/15 flex items-center space-x-1.5 transition-colors">
                  <Calendar className="w-3.5 h-3.5 text-sky-300" />
                  <span>Book In-Clinic</span>
                </Link>
                <Link to="/ai-assistant" className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-full border border-white/15 flex items-center space-x-1.5 transition-colors">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>AI Assistant</span>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-teal-100/80 border-t border-white/15">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white text-sm">99.8%</span>
                  <span>On-Time Consults</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white text-sm">4.9 / 5</span>
                  <span>Patient Rating</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>HIPAA & ABDM Compliant</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive 3D Medical Hologram Hero */}
            <div className="lg:col-span-5 flex items-center justify-center">
              <React.Suspense fallback={<MedicalHeroFallback />}>
                <MedicalHeroCanvas />
              </React.Suspense>
            </div>

          </div>
        </div>
      </section>

      {/* AI Doctor Match & Triage Sandbox */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2 text-medical-700 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-medical-600" />
                <span>AI Symptom Triage & Specialist Matcher</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                Unsure which specialist you need? Describe your symptoms
              </h2>
            </div>

            {/* Quick symptom prompts */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Try:</span>
              <button
                onClick={() => handleAiMatch('I have chest discomfort and diabetes')}
                className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
              >
                "Chest discomfort & diabetes"
              </button>
              <button
                onClick={() => handleAiMatch('Persistent skin rash and itching on arms')}
                className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
              >
                "Skin rash & itching"
              </button>
              <button
                onClick={() => handleAiMatch('Severe frontal headache with sensitivity to light')}
                className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
              >
                "Frontal headache"
              </button>
            </div>
          </div>

          {/* AI Input Form */}
          <div className="pt-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={symptomInput}
                onChange={(e) => setSymptomInput(e.target.value)}
                placeholder="E.g., I have sharp chest pain radiating to left shoulder and dizziness..."
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 transition-all"
              />
              <button
                onClick={() => handleAiMatch(symptomInput)}
                disabled={aiMatching || !symptomInput.trim()}
                className="px-6 py-3 bg-medical-700 hover:bg-medical-800 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center space-x-1.5 transition-all"
              >
                {aiMatching ? (
                  <span>Analyzing...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Match Doctor</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Results Output Card */}
            {aiResult && (
              <div className="mt-6 p-5 rounded-xl border border-medical-200 bg-medical-50/50 animate-in fade-in slide-in-from-top-2">
                {aiResult.isEmergency && (
                  <div className="mb-4 p-3 bg-rose-100 border border-rose-300 text-rose-800 rounded-lg text-xs font-bold flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                    <span>{aiResult.emergencyNotice}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-medical-200/60">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-medical-800">Recommended Specialty</span>
                    <h3 className="text-lg font-bold text-slate-900">{aiResult.recommendedSpecialty}</h3>
                  </div>
                  <span className="text-xs text-medical-700 bg-white px-3 py-1 rounded-full border border-medical-200 font-medium">
                    Deterministic Clinical Rule Match
                  </span>
                </div>

                {aiResult.matchExplanation && (
                  <p className="text-xs font-semibold text-teal-900 bg-teal-100/60 border border-teal-200/60 rounded-lg p-2.5 mt-3">
                    <strong>Triage Rationale:</strong> {aiResult.matchExplanation}
                  </p>
                )}

                <p className="text-xs text-slate-700 mt-2.5 leading-relaxed">
                  {aiResult.clinicalAdvice}
                </p>

                {/* Matched Doctor Cards */}
                {aiResult.matchingDoctors && aiResult.matchingDoctors.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-medical-200/60">
                    <p className="text-xs font-bold text-slate-700 mb-2">Available {aiResult.recommendedSpecialty}s:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {aiResult.matchingDoctors.map((doc: any) => (
                        <div key={doc._id} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <DoctorAvatar
                              src={doc.avatarUrl}
                              alt={doc.fullName}
                              className="w-10 h-10 rounded-full"
                              iconClassName="w-5 h-5 text-medical-600"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-900">{doc.fullName}</p>
                              <p className="text-[11px] text-slate-500">
                                {doc.experienceYears != null ? `${doc.experienceYears} Y Exp` : 'Verified'}
                                {doc.pricing?.videoFee != null ? ` • ₹${doc.pricing.videoFee}` : ''}
                              </p>
                            </div>
                          </div>
                          <Link
                            to={`/doctors/${doc._id}`}
                            className="px-3 py-1.5 bg-medical-50 text-medical-700 hover:bg-medical-100 rounded text-xs font-bold transition-colors"
                          >
                            Book Slot
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-slate-400 mt-4 italic">
                  * {aiResult.disclaimer}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Top Clinical Specialties */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Consult Top Specialists</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Verified medical professionals across 30+ hospital networks</p>
          </div>
          <Link to="/doctors" className="text-xs sm:text-sm font-bold text-medical-700 hover:text-medical-800 flex items-center space-x-1">
            <span>View All Doctors</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {specialties.map((spec) => {
            const Icon = spec.icon;
            return (
              <TiltCard key={spec.name} maxTilt={8} scale={1.03}>
                <Link
                  to={`/doctors?specialty=${encodeURIComponent(spec.name)}`}
                  className="p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-medical-500 glass-card-hover group text-center flex flex-col items-center h-full"
                >
                  <div className="w-12 h-12 rounded-xl bg-medical-50 text-medical-600 flex items-center justify-center mb-3 group-hover:bg-medical-600 group-hover:text-white transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-medical-700 transition-colors">
                    {spec.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">{spec.category}</p>
                </Link>
              </TiltCard>
            );
          })}
        </div>
      </section>

      {/* Verified Doctors Directory Preview */}
      <section className="bg-slate-50 border-y border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-xs font-bold text-medical-700 uppercase tracking-wider">Board Certified</span>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">Featured Doctors Available Today</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {doctors.map((doc) => (
              <TiltCard key={doc._id} maxTilt={5} scale={1.015} className="h-full">
                <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden glass-card-hover flex flex-col justify-between h-full">
                  <div className="p-5">
                    <div className="flex items-start space-x-3 mb-4">
                      <DoctorAvatar
                        src={doc.avatarUrl}
                        alt={doc.fullName}
                        className="w-16 h-16 rounded-xl"
                        iconClassName="w-7 h-7 text-medical-600"
                      />
                      <div>
                        <div className="flex items-center space-x-1">
                          <h3 className="text-sm font-bold text-slate-900">{doc.fullName}</h3>
                          <span title="Verified License"><ShieldCheck className="w-4 h-4 text-medical-600" /></span>
                        </div>
                        <p className="text-xs text-medical-700 font-medium">
                          {doc.specialties && doc.specialties.length > 0 ? doc.specialties.join(', ') : 'Specialist'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {doc.experienceYears != null ? `${doc.experienceYears} Years Experience` : 'Experience on file'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 pb-3 border-b border-slate-100">
                      <p className="flex items-center text-slate-500 truncate">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 flex-shrink-0" />
                        <span>
                          {doc.clinicAffiliations && doc.clinicAffiliations.length > 0 && doc.clinicAffiliations[0]?.clinicName
                            ? doc.clinicAffiliations[0].clinicName
                            : 'Clinic details on file'}
                        </span>
                      </p>
                      <p className="flex items-center text-emerald-700 font-semibold">
                        <Clock className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                        <span>{doc.nextAvailableSlot || 'Check availability'}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3">
                      <div>
                        <span className="text-[10px] text-slate-400">Consultation Fee</span>
                        <p className="text-sm font-bold text-slate-900">₹{doc.pricing.videoFee}</p>
                      </div>
                      <div className="flex items-center space-x-1 text-amber-500 font-bold text-xs bg-amber-50 px-2 py-0.5 rounded">
                        <span>★</span>
                        <span>{doc.ratingAverage}</span>
                        <span className="text-slate-400 font-normal text-[10px]">({doc.ratingCount})</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                    <Link
                      to={`/doctors/${doc._id}`}
                      className="w-full py-2 bg-medical-700 hover:bg-medical-800 text-white rounded-lg text-xs font-bold text-center transition-colors shadow-xs"
                    >
                      Book Appointment
                    </Link>
                  </div>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Enterprise Pillars Carousel */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 bg-medical-50 text-medical-800 rounded-full text-xs font-bold border border-medical-200/60 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-medical-600" />
            <span>Core Clinical Infrastructure</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Built for Clinical Excellence & Zero Friction
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Explore the three foundational pillars powering patient trust across South India.
          </p>
        </div>

        <FeatureCarousel />
      </section>
    </div>
  );
};
