import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  MapPin, 
  ShieldCheck, 
  Star, 
  Video, 
  Building, 
  Clock, 
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import { PageNavigation } from '../components/PageNavigation';
import { Doctor } from '../types';

export const DoctorSearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [specialty, setSpecialty] = useState(searchParams.get('specialty') || 'All');
  const [mode, setMode] = useState(searchParams.get('mode') || 'ALL');
  const [maxFee, setMaxFee] = useState<number>(1500);
  const [minRating, setMinRating] = useState<number>(4.0);

  const specialtiesList = ['All', 'Cardiologist', 'Dermatologist', 'Orthopedic Surgeon', 'Pediatrician', 'General Physician'];

  useEffect(() => {
    fetchFilteredDoctors();
  }, [searchParams, specialty, mode, maxFee, minRating]);

  const fetchFilteredDoctors = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (query) params.query = query;
      if (specialty && specialty !== 'All') params.specialty = specialty;
      if (mode && mode !== 'ALL') params.mode = mode;
      if (maxFee) params.maxFee = String(maxFee);
      if (minRating) params.minRating = String(minRating);

      const res = await api.getDoctors(params);
      if (res.success) {
        setDoctors(res.data.doctors);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFilteredDoctors();
  };

  const resetFilters = () => {
    setQuery('');
    setSpecialty('All');
    setMode('ALL');
    setMaxFee(1500);
    setMinRating(4.0);
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
      <PageNavigation
        backFallback="/"
        backLabel="Back"
        breadcrumbs={[
          { label: 'Home', path: '/' },
          { label: 'Find Doctors' },
        ]}
      />

      {/* Search Header Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center space-x-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by doctor name, symptom, or hospital..."
              className="w-full text-xs sm:text-sm bg-transparent focus:outline-none text-slate-800"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-medical-700 hover:bg-medical-800 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors"
          >
            Apply Search
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <aside className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm h-fit space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-medical-700" />
              <h3 className="text-sm font-bold text-slate-900">Filters</h3>
            </div>
            <button
              onClick={resetFilters}
              className="text-[11px] font-semibold text-slate-400 hover:text-medical-700 flex items-center space-x-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Specialty Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Specialty</label>
            <div className="space-y-1">
              {specialtiesList.map((spec) => (
                <button
                  key={spec}
                  onClick={() => setSpecialty(spec)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    specialty === spec
                      ? 'bg-medical-50 text-medical-800 font-bold border border-medical-200'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>

          {/* Mode of Consultation */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Consultation Mode</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => setMode('ALL')}
                className={`p-2 rounded-lg border text-center font-medium transition-colors ${
                  mode === 'ALL' ? 'bg-medical-50 border-medical-500 text-medical-800 font-bold' : 'border-slate-200 text-slate-600'
                }`}
              >
                All Modes
              </button>
              <button
                onClick={() => setMode('VIDEO')}
                className={`p-2 rounded-lg border text-center font-medium transition-colors flex items-center justify-center space-x-1 ${
                  mode === 'VIDEO' ? 'bg-medical-50 border-medical-500 text-medical-800 font-bold' : 'border-slate-200 text-slate-600'
                }`}
              >
                <Video className="w-3.5 h-3.5 text-medical-600" />
                <span>Video Visit</span>
              </button>
              <button
                onClick={() => setMode('IN_PERSON')}
                className={`p-2 rounded-lg border text-center font-medium transition-colors flex items-center justify-center space-x-1 ${
                  mode === 'IN_PERSON' ? 'bg-medical-50 border-medical-500 text-medical-800 font-bold' : 'border-slate-200 text-slate-600'
                }`}
              >
                <Building className="w-3.5 h-3.5 text-slate-600" />
                <span>In-Clinic</span>
              </button>
              <button
                onClick={() => setMode('HOME_VISIT')}
                className={`p-2 rounded-lg border text-center font-medium transition-colors ${
                  mode === 'HOME_VISIT' ? 'bg-medical-50 border-medical-500 text-medical-800 font-bold' : 'border-slate-200 text-slate-600'
                }`}
              >
                Home Visit
              </button>
            </div>
          </div>

          {/* Max Consultation Fee Slider */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <label className="font-bold text-slate-700 uppercase tracking-wider">Max Fee</label>
              <span className="font-bold text-medical-700">₹{maxFee}</span>
            </div>
            <input
              type="range"
              min="400"
              max="2500"
              step="100"
              value={maxFee}
              onChange={(e) => setMaxFee(Number(e.target.value))}
              className="w-full accent-medical-600 cursor-pointer"
            />
          </div>

          {/* Minimum Rating */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Minimum Rating</label>
            <div className="flex gap-2">
              {[4.0, 4.5, 4.8].map((r) => (
                <button
                  key={r}
                  onClick={() => setMinRating(r)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-1 ${
                    minRating === r ? 'bg-amber-50 border-amber-400 text-amber-800' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{r}+</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Doctor Listings Grid */}
        <main className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-2">
            <span>Showing <strong className="text-slate-800">{doctors.length}</strong> verified doctors</span>
            <span>Sorted by Clinical Rating & Experience</span>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              Loading verified doctors...
            </div>
          ) : doctors.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <p className="text-sm font-semibold text-slate-700">No doctors match your exact filter criteria</p>
              <button
                onClick={resetFilters}
                className="mt-3 text-xs font-bold text-medical-700 hover:underline"
              >
                Reset filters to view all available specialists
              </button>
            </div>
          ) : (
            doctors.map((doc) => (
              <div
                key={doc._id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 glass-card-hover flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
              >
                {/* Doctor Avatar & Details */}
                <div className="flex items-start space-x-4">
                  <img
                    src={doc.avatarUrl}
                    alt={doc.fullName}
                    className="w-20 h-20 rounded-2xl object-cover border border-slate-200 flex-shrink-0"
                  />
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <h3 className="text-base font-bold text-slate-900">{doc.fullName}</h3>
                      <span title="Verified License"><ShieldCheck className="w-4 h-4 text-medical-600" /></span>
                    </div>

                    <p className="text-xs font-semibold text-medical-700 mt-0.5">
                      {doc.specialties.join(', ')}
                    </p>

                    <p className="text-[11px] text-slate-500 mt-1">
                      {doc.qualifications.map(q => q.degree).join(', ')} • {doc.experienceYears} Years Overall Experience
                    </p>

                    <p className="flex items-center text-xs text-slate-500 mt-2">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      <span>{doc.clinicAffiliations[0]?.clinicName || 'Apollo Clinic'}, {doc.clinicAffiliations[0]?.city || 'Bangalore'}</span>
                    </p>

                    {/* Mode tags */}
                    <div className="flex items-center gap-2 mt-2">
                      {doc.consultationModes.includes('VIDEO') && (
                        <span className="inline-flex items-center text-[10px] font-semibold bg-teal-50 text-teal-800 px-2 py-0.5 rounded border border-teal-200">
                          <Video className="w-3 h-3 mr-1 text-teal-600" /> Video Available
                        </span>
                      )}
                      {doc.consultationModes.includes('IN_PERSON') && (
                        <span className="inline-flex items-center text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          In-Clinic
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side pricing & CTA */}
                <div className="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 space-y-2">
                  <div className="text-left sm:text-right">
                    <div className="flex items-center sm:justify-end space-x-1 text-amber-500 text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{doc.ratingAverage}</span>
                      <span className="text-slate-400 font-normal">({doc.ratingCount} reviews)</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Consultation Fee</p>
                    <p className="text-lg font-bold text-slate-900">₹{doc.pricing.videoFee}</p>
                    <p className="text-[11px] text-emerald-700 font-semibold flex items-center sm:justify-end mt-0.5">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{doc.nextAvailableSlot}</span>
                    </p>
                  </div>

                  <Link
                    to={`/doctors/${doc._id}`}
                    className="px-5 py-2.5 bg-medical-700 hover:bg-medical-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    Select Slot
                  </Link>
                </div>
              </div>
            ))
          )}
        </main>
      </div>
    </div>
  );
};
