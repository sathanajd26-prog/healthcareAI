import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  User, 
  Stethoscope, 
  ShieldCheck, 
  Lock, 
  Phone, 
  KeyRound, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Building2,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { PageNavigation } from '../components/PageNavigation';

type LoginRole = 'PATIENT' | 'DOCTOR' | 'SUPER_ADMIN';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, switchRole } = useAuth();
  const { t } = useLanguage();

  const initialRole = (searchParams.get('role')?.toUpperCase() as LoginRole) || 'PATIENT';
  const [activeRole, setActiveRole] = useState<LoginRole>(
    ['PATIENT', 'DOCTOR', 'SUPER_ADMIN'].includes(initialRole) ? initialRole : 'PATIENT'
  );

  const [phone, setPhone] = useState('+91 98765 43210');
  const [otp, setOtp] = useState('123456');
  const [otpSent, setOtpSent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync role defaults when changing tab
  const handleRoleChange = (role: LoginRole) => {
    setActiveRole(role);
    setError(null);
    if (role === 'PATIENT') {
      setPhone('+91 98765 43210');
    } else if (role === 'DOCTOR') {
      setPhone('+91 98765 43211');
    } else {
      setPhone('+91 98765 43212');
    }
    setOtp('123456');
    setOtpSent(true);
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const cleanPhone = phone.replace(/\s+/g, '');
      const res = await api.requestOTP(cleanPhone);
      if (res.success) {
        setOtpSent(true);
      } else {
        setError(res.error?.message || 'Failed to send verification code');
      }
    } catch (err: any) {
      setError(err.message || 'Network error requesting OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const cleanPhone = phone.replace(/\s+/g, '');
      let fullName = 'John Doe (Patient)';
      if (activeRole === 'DOCTOR') fullName = 'Dr. Ananya Deshmukh (Cardiologist)';
      if (activeRole === 'SUPER_ADMIN') fullName = 'Dr. Rajesh Kumar (Enterprise Admin)';

      const success = await login(cleanPhone, otp.trim(), fullName, activeRole);
      if (success) {
        if (activeRole === 'DOCTOR' || activeRole === 'SUPER_ADMIN') {
          navigate('/provider');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError('Invalid verification code or unauthorized role credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setLoading(true);
    setError(null);
    try {
      await switchRole(activeRole);
      if (activeRole === 'DOCTOR' || activeRole === 'SUPER_ADMIN') {
        navigate('/provider');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageNavigation
        backFallback="/"
        backLabel="Home"
        breadcrumbs={[
          { label: 'Home', path: '/' },
          { label: 'Authentication Portal' },
        ]}
      />

      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-teal-900 via-medical-800 to-slate-900 p-6 sm:p-8 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-teal-200 border border-white/15 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>ABDM & HIPAA Verified Secure Auth</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t('login.title', 'AegisHealth Access Portal')}
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/90 mt-1.5 max-w-sm mx-auto">
              {t('login.subtitle', 'Select your role to access encrypted healthcare services')}
            </p>
          </div>

          {/* Role Tabs */}
          <div className="p-3 bg-slate-50/80 border-b border-slate-200">
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/60 rounded-2xl" role="tablist">
              {/* Patient Tab */}
              <button
                type="button"
                role="tab"
                aria-selected={activeRole === 'PATIENT'}
                onClick={() => handleRoleChange('PATIENT')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 ${
                  activeRole === 'PATIENT'
                    ? 'bg-white text-medical-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-4 h-4 text-medical-600" />
                <span className="truncate">{t('login.patientTab', 'Patient')}</span>
              </button>

              {/* Doctor Tab */}
              <button
                type="button"
                role="tab"
                aria-selected={activeRole === 'DOCTOR'}
                onClick={() => handleRoleChange('DOCTOR')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 ${
                  activeRole === 'DOCTOR'
                    ? 'bg-white text-medical-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Stethoscope className="w-4 h-4 text-medical-600" />
                <span className="truncate">{t('login.doctorTab', 'Doctor')}</span>
              </button>

              {/* Admin Tab */}
              <button
                type="button"
                role="tab"
                aria-selected={activeRole === 'SUPER_ADMIN'}
                onClick={() => handleRoleChange('SUPER_ADMIN')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 ${
                  activeRole === 'SUPER_ADMIN'
                    ? 'bg-white text-medical-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-4 h-4 text-medical-600" />
                <span className="truncate">{t('login.adminTab', 'Admin')}</span>
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-8 space-y-6">
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start space-x-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed">{error}</div>
              </div>
            )}

            {/* Role Header Description */}
            <div className="p-4 rounded-2xl bg-medical-50/60 border border-medical-200/60 text-xs text-medical-900 flex items-center justify-between">
              <div>
                <p className="font-bold">
                  {activeRole === 'PATIENT' && 'Patient Portal Access'}
                  {activeRole === 'DOCTOR' && 'Clinician & OPD Workbench'}
                  {activeRole === 'SUPER_ADMIN' && 'Enterprise Hospital Administration'}
                </p>
                <p className="text-[11px] text-medical-700 mt-0.5">
                  {activeRole === 'PATIENT' && 'Access personal EMR, appointments, prescriptions, and AI guidance.'}
                  {activeRole === 'DOCTOR' && 'Manage appointments, compose digital prescriptions, and view queue.'}
                  {activeRole === 'SUPER_ADMIN' && 'Hospital verification, compliance audit, and system oversight.'}
                </p>
              </div>
              <span className="px-2.5 py-1 bg-medical-700 text-white font-bold rounded-lg text-[10px]">
                {activeRole}
              </span>
            </div>

            <form onSubmit={handleVerifyLogin} className="space-y-4">
              {/* Phone Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>{t('login.phoneLabel', 'Registered Mobile Number')}</span>
                  {activeRole === 'DOCTOR' && <span className="text-[10px] text-teal-700 font-semibold">Council Registered</span>}
                  {activeRole === 'SUPER_ADMIN' && <span className="text-[10px] text-purple-700 font-semibold">Admin Authorization</span>}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
                    required
                  />
                </div>
              </div>

              {/* OTP Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    {t('login.otpLabel', 'Verification Code (OTP)')}
                  </label>
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={loading}
                    className="text-[11px] font-bold text-medical-700 hover:text-medical-800 transition-colors"
                  >
                    Resend Code
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP (e.g. 123456)"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !phone || !otp}
                className="w-full py-3 bg-medical-700 hover:bg-medical-800 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all shadow-md shadow-medical-900/20"
              >
                <span>{loading ? 'Authenticating...' : t('login.verifyLogin', 'Authenticate & Enter')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick 1-Click Demo Shortcut */}
            <div className="pt-4 border-t border-slate-100 text-center space-y-3">
              <p className="text-[11px] font-semibold text-slate-400">
                Development & Testing Shortcut
              </p>
              <button
                type="button"
                onClick={handleQuickDemo}
                disabled={loading}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors border border-slate-200/80"
              >
                <Sparkles className="w-3.5 h-3.5 text-medical-600" />
                <span>
                  {activeRole === 'PATIENT' && '1-Click Demo Patient (John Doe)'}
                  {activeRole === 'DOCTOR' && '1-Click Demo Doctor (Dr. Ananya Deshmukh)'}
                  {activeRole === 'SUPER_ADMIN' && '1-Click Demo Admin (Dr. Rajesh Kumar)'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
