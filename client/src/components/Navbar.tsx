import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Activity, 
  MapPin, 
  Search, 
  FileText, 
  Bot, 
  AlertCircle, 
  Users, 
  Stethoscope, 
  ChevronDown, 
  ShieldCheck, 
  Menu, 
  X, 
  Home,
  Video,
  LogOut,
  LogIn,
  UserCheck,
  Shield,
  Key
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getHomeRouteForUser } from './HomeButton';
import { LocationSelector } from './LocationSelector';
import { LanguageToggle } from './LanguageToggle';

export const Navbar: React.FC = () => {
  const { user, token, activeFamilyMember, setActiveFamilyMember, logout, switchRole } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [showFamilyDropdown, setShowFamilyDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const familyList = [
    { name: 'Self (John Doe)', relationship: 'Primary Account', age: '32 Y' },
    { name: 'Sarah Doe', relationship: 'Spouse', age: '30 Y' },
    { name: 'Liam Doe', relationship: 'Child', age: '5 Y' },
  ];

  // Dynamic role-based home destination
  const roleHome = getHomeRouteForUser(user, token);

  const isDoctor = user?.role === 'DOCTOR' || user?.role === 'CLINIC_ADMIN' || user?.role === 'HOSPITAL_ADMIN' || user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'HOSPITAL_ADMIN' || user?.role === 'CLINIC_ADMIN';
  const isGuest = !token || !user;

  const navLinks: Array<{ label: string; path: string; icon: any; isAIBadge?: boolean }> = isGuest
    ? [
        { label: t('nav.home'), path: '/', icon: Home },
        { label: t('nav.findDoctors'), path: '/doctors', icon: Search },
        { label: t('nav.emergency'), path: '/emergency', icon: AlertCircle },
      ]
    : isDoctor
    ? [
        { label: roleHome.label, path: roleHome.path, icon: Home },
        { label: t('nav.findDoctors'), path: '/doctors', icon: Search },
        { label: 'Telehealth Room', path: '/consultation/room-cardio-99', icon: Video },
      ]
    : [
        { label: roleHome.label, path: roleHome.path, icon: Home },
        { label: t('nav.findDoctors'), path: '/doctors', icon: Search },
        { label: t('nav.records'), path: '/records', icon: FileText },
      ];

  // Close mobile menu whenever route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowFamilyDropdown(false);
  }, [location.pathname]);

  // Handle Escape key to close mobile menu & family dropdown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setShowFamilyDropdown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Tag (links to role home) */}
          <div className="flex items-center space-x-3 sm:space-x-6">
            <Link 
              to={roleHome.path} 
              className="flex items-center space-x-2.5 group"
              aria-label={`AegisHealth - Return to ${roleHome.label}`}
              title={`Return to ${roleHome.label}`}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-medical-700 to-medical-500 flex items-center justify-center text-white shadow-md shadow-medical-500/20 group-hover:scale-105 transition-transform">
                <Activity className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-medical-700 transition-colors">
                  Aegis<span className="text-medical-600">Health</span>
                </span>
                <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 -mt-1">
                  Healthcare Super-App
                </span>
              </div>
            </Link>

            {/* Location Selector (Tablet & Desktop) */}
            <div className="hidden md:block">
              <LocationSelector variant="navbar" />
            </div>
          </div>

          {/* Desktop Primary Nav Links */}
          <nav aria-label="Main Navigation" className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-medical-50 text-medical-700 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-medical-600' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                  {link.isAIBadge && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-medical-600 to-clinical-blue text-white rounded-full shadow-xs">
                      AI
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Actions & Profile (Desktop) */}
          <div className="hidden lg:flex items-center space-x-3">
            {/* Language Switcher Toggle */}
            <LanguageToggle />

            {/* Emergency SOS Button */}
            <Link
              to="/emergency"
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition-all animate-pulse"
              title="Immediate Emergency Hospital & Ambulance Support"
            >
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>SOS Emergency</span>
            </Link>

            {/* User Profile & Role Persona Controls (Desktop) */}
            <div className="relative">
              {isGuest ? (
                <div className="flex items-center space-x-1">
                  <Link
                    to="/login"
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-medical-700 hover:bg-medical-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{t('auth.signIn')}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowFamilyDropdown(!showFamilyDropdown)}
                    aria-expanded={showFamilyDropdown}
                    aria-label="Select Role Login"
                    className="p-1.5 bg-medical-800 hover:bg-medical-900 text-white rounded-xl text-xs transition-colors"
                    title="Select Role (Doctor / Patient / Admin)"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowFamilyDropdown(!showFamilyDropdown)}
                  aria-expanded={showFamilyDropdown}
                  aria-haspopup="true"
                  aria-label="User profile & role menu"
                  className="flex items-center space-x-2 p-1.5 pl-2.5 bg-medical-50/80 hover:bg-medical-100/80 border border-medical-200/60 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-medical-500/20"
                >
                  {isAdmin ? (
                    <Shield className="w-3.5 h-3.5 text-indigo-700" />
                  ) : isDoctor ? (
                    <Stethoscope className="w-3.5 h-3.5 text-medical-700" />
                  ) : (
                    <Users className="w-3.5 h-3.5 text-medical-700" />
                  )}
                  <span className="text-xs font-semibold text-medical-900 max-w-[100px] truncate">
                    {isAdmin ? 'Admin' : isDoctor ? 'Dr. Ananya' : activeFamilyMember.split(' ')[0]}
                  </span>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider bg-medical-200/80 text-medical-800">
                    {user?.role === 'PATIENT' ? 'Patient' : user?.role === 'SUPER_ADMIN' ? 'Admin' : 'Doctor'}
                  </span>
                </button>
              )}

              {showFamilyDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  {isGuest ? (
                    <div className="p-2 space-y-1">
                      <div className="px-2 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Select Login Module
                      </div>
                      <Link
                        to="/login?role=patient"
                        onClick={() => setShowFamilyDropdown(false)}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-left rounded-lg text-xs hover:bg-teal-50 text-slate-800 font-medium"
                      >
                        <Users className="w-4 h-4 text-teal-600" />
                        <div>
                          <p className="font-bold text-slate-900">{t('auth.patientLogin')}</p>
                          <p className="text-[10px] text-slate-500">Dashboard, appointments, prescriptions</p>
                        </div>
                      </Link>
                      <Link
                        to="/login?role=doctor"
                        onClick={() => setShowFamilyDropdown(false)}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-left rounded-lg text-xs hover:bg-medical-50 text-slate-800 font-medium"
                      >
                        <Stethoscope className="w-4 h-4 text-medical-600" />
                        <div>
                          <p className="font-bold text-slate-900">{t('auth.doctorLogin')}</p>
                          <p className="text-[10px] text-slate-500">OPD queue, digital Rx, clinical workbench</p>
                        </div>
                      </Link>
                      <Link
                        to="/login?role=admin"
                        onClick={() => setShowFamilyDropdown(false)}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-left rounded-lg text-xs hover:bg-indigo-50 text-slate-800 font-medium"
                      >
                        <Shield className="w-4 h-4 text-indigo-600" />
                        <div>
                          <p className="font-bold text-slate-900">{t('auth.adminLogin')}</p>
                          <p className="text-[10px] text-slate-500">System audits, clinic security & compliance</p>
                        </div>
                      </Link>

                      <div className="pt-2 mt-1 border-t border-slate-100 px-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Instant Demo Access
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            onClick={async () => {
                              setShowFamilyDropdown(false);
                              await switchRole('PATIENT');
                              navigate('/dashboard');
                            }}
                            className="px-2 py-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold"
                          >
                            Demo Patient
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              setShowFamilyDropdown(false);
                              await switchRole('DOCTOR');
                              navigate('/provider');
                            }}
                            className="px-2 py-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold"
                          >
                            Demo Doctor
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="px-3 py-2 border-b border-slate-100">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Persona</p>
                        <p className="text-xs font-semibold text-slate-800 mt-0.5">
                          {user?.fullName} ({user?.role})
                        </p>
                      </div>

                      {/* Family members only for Patient */}
                      {!isDoctor && !isAdmin && (
                        <div className="p-1 space-y-0.5 border-b border-slate-100">
                          <p className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase">Family Records</p>
                          {familyList.map((mem) => (
                            <button
                              key={mem.name}
                              type="button"
                              onClick={() => {
                                setActiveFamilyMember(mem.name);
                                setShowFamilyDropdown(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left rounded-lg text-xs ${
                                activeFamilyMember === mem.name
                                  ? 'bg-medical-50 text-medical-800 font-semibold'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <span>{mem.name}</span>
                              {activeFamilyMember === mem.name && <ShieldCheck className="w-3.5 h-3.5 text-medical-600" />}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Switch Role Options */}
                      <div className="p-1 space-y-0.5">
                        <p className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase">Switch Role</p>
                        <button
                          type="button"
                          onClick={async () => {
                            setShowFamilyDropdown(false);
                            await switchRole('PATIENT');
                            navigate('/dashboard');
                          }}
                          className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-left rounded-lg text-xs text-slate-700 hover:bg-slate-100"
                        >
                          <Users className="w-3.5 h-3.5 text-teal-600" />
                          <span>Patient Dashboard (John Doe)</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            setShowFamilyDropdown(false);
                            await switchRole('DOCTOR');
                            navigate('/provider');
                          }}
                          className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-left rounded-lg text-xs text-slate-700 hover:bg-slate-100"
                        >
                          <Stethoscope className="w-3.5 h-3.5 text-medical-600" />
                          <span>Doctor Workbench (Dr. Ananya)</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            setShowFamilyDropdown(false);
                            await switchRole('SUPER_ADMIN');
                            navigate('/admin');
                          }}
                          className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-left rounded-lg text-xs text-slate-700 hover:bg-slate-100"
                        >
                          <Shield className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Admin Console (Dr. Rajesh)</span>
                        </button>

                        <Link
                          to="/login"
                          onClick={() => setShowFamilyDropdown(false)}
                          className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-left rounded-lg text-xs text-slate-700 hover:bg-slate-100"
                        >
                          <Key className="w-3.5 h-3.5 text-slate-500" />
                          <span>Login Page (All Roles)</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setShowFamilyDropdown(false);
                            logout();
                            navigate('/');
                          }}
                          className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-left rounded-lg text-xs text-rose-600 hover:bg-rose-50 font-medium"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Log Out (Browse as Guest)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Right Controls: SOS + Hamburger */}
          <div className="flex lg:hidden items-center space-x-2">
            <Link
              to="/emergency"
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition-all"
              aria-label="Emergency SOS"
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span className="text-[11px]">SOS</span>
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-menu"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-medical-500/30 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-slate-700" />
              ) : (
                <Menu className="w-5 h-5 text-slate-700" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Slide-down / Dropdown Navigation Menu */}
      {mobileMenuOpen && (
        <div 
          id="mobile-navigation-menu"
          ref={mobileMenuRef}
          className="lg:hidden border-t border-slate-200 bg-white/98 backdrop-blur-lg shadow-2xl animate-in fade-in slide-in-from-top-2 overflow-y-auto max-h-[calc(100vh-4rem)]"
        >
          <div className="px-4 py-4 space-y-4">
            {/* Language Switcher Bar in Mobile Drawer */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-600">Language / மொழி:</span>
              <LanguageToggle />
            </div>

            {/* Active Persona Banner (Mobile) */}
            <div className="p-3 bg-medical-50/80 rounded-xl border border-medical-200/80 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Account</p>
                <p className="text-xs font-bold text-slate-900">
                  {isGuest ? 'Guest (Unauthenticated)' : user?.fullName}
                </p>
                <span className="text-[10px] font-semibold text-medical-700">
                  Role: {isGuest ? 'Guest' : user?.role}
                </span>
              </div>

              {/* Persona toggle in mobile */}
              <div className="flex flex-col space-y-1">
                {isGuest ? (
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-2.5 py-1 bg-medical-700 text-white rounded-lg text-[10px] font-bold text-center"
                  >
                    {t('auth.signIn')}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      if (isDoctor) {
                        await switchRole('PATIENT');
                        navigate('/dashboard');
                      } else {
                        await switchRole('DOCTOR');
                        navigate('/provider');
                      }
                    }}
                    className="px-2 py-1 bg-medical-100 text-medical-800 border border-medical-200 rounded-lg text-[10px] font-bold"
                  >
                    {isDoctor ? 'Switch to Patient' : 'Switch to Doctor'}
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Location Selector */}
            <div className="pb-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
                Regional Care Hub
              </div>
              <LocationSelector variant="navbar" className="w-full" />
            </div>

            {/* Mobile Nav Links (Role-specific) */}
            <nav aria-label="Mobile Navigation" className="space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-medical-50 text-medical-800 border border-medical-200'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-medical-600' : 'text-slate-400'}`} />
                      <span>{link.label}</span>
                    </div>
                    {link.isAIBadge && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-medical-600 to-clinical-blue text-white rounded-full shadow-xs">
                        AI
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Secondary Mobile Actions */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <Link
                to="/emergency"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2.5 px-4 py-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors"
              >
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Emergency 24/7 Helpline & Dispatch</span>
              </Link>

              {isGuest && (
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Dedicated Logins</p>
                  <Link
                    to="/login?role=patient"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    <Users className="w-3.5 h-3.5 text-teal-600" />
                    <span>{t('auth.patientLogin')}</span>
                  </Link>
                  <Link
                    to="/login?role=doctor"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    <Stethoscope className="w-3.5 h-3.5 text-medical-600" />
                    <span>{t('auth.doctorLogin')}</span>
                  </Link>
                  <Link
                    to="/login?role=admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{t('auth.adminLogin')}</span>
                  </Link>
                </div>
              )}

              {!isGuest && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                    navigate('/');
                  }}
                  className="w-full flex items-center space-x-2.5 px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out to Guest Mode</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
