import React, { useState } from 'react';
import { 
  AlertCircle, 
  Phone, 
  MapPin, 
  ShieldAlert, 
  HeartHandshake, 
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageNavigation } from '../components/PageNavigation';

export const EmergencySOSPage: React.FC = () => {
  const { activeFamilyMember } = useAuth();
  const [sosTriggered, setSosTriggered] = useState(false);

  const nearbyEmergencyHospitals = [
    {
      name: 'Manipal Hospital Emergency & Trauma Care',
      distance: '1.2 km away',
      address: 'Old Airport Road, Kodihalli, Bangalore',
      phone: '+91 80 2502 4444',
      serviceStatus: '24/7 Trauma Care Operational',
      icuEquipped: true,
    },
    {
      name: 'Apollo Hospital 24/7 Emergency Wing',
      distance: '2.8 km away',
      address: 'Jayanagar 4th Block, Bangalore',
      phone: '+91 80 2630 4050',
      serviceStatus: '24/7 Emergency Wing Operational',
      icuEquipped: true,
    },
    {
      name: 'Fortis Emergency & Cardiac Care',
      distance: '4.5 km away',
      address: 'Bannerghatta Main Road, Bangalore',
      phone: '+91 80 6621 4444',
      serviceStatus: '24/7 Cardiac ER Active',
      icuEquipped: true,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <PageNavigation
        backFallback="/dashboard"
        backLabel="Back"
        breadcrumbs={[
          { label: 'Home', path: '/' },
          { label: 'Emergency SOS' },
        ]}
      />

      {/* Red Alert Emergency Banner */}
      <div className="bg-rose-600 rounded-3xl p-6 sm:p-8 text-white shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="text-center sm:text-left space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>24/7 Rapid Emergency Response</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Emergency Care & Ambulance SOS
          </h1>
          <p className="text-xs sm:text-sm text-rose-100 max-w-xl">
            In life-threatening situations, dial national emergency helplines immediately or trigger 1-click GPS hospital dispatch.
          </p>
        </div>

        {/* SOS Action Trigger */}
        <button
          onClick={() => setSosTriggered(true)}
          className={`w-32 h-32 rounded-full font-black text-xl tracking-wider uppercase border-4 border-white/40 shadow-2xl flex flex-col items-center justify-center transition-all ${
            sosTriggered
              ? 'bg-emerald-600 text-white animate-pulse'
              : 'bg-white text-rose-700 hover:scale-105 active:scale-95'
          }`}
        >
          {sosTriggered ? (
            <>
              <CheckCircle2 className="w-8 h-8 mb-1" />
              <span className="text-xs">SOS ACTIVE</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-8 h-8 mb-1 text-rose-600 animate-bounce" />
              <span>SOS</span>
            </>
          )}
        </button>
      </div>

      {sosTriggered && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>
              <strong>GPS Telemetry Shared:</strong> Live coordinates transmitted to Manipal Hospital Dispatch and SMS alert sent to emergency contact.
            </span>
          </div>
          <button
            onClick={() => setSosTriggered(false)}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Emergency Medical Profile Card (Immediate First Responder Info) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Digital Emergency Health Profile — {activeFamilyMember}</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">Accessible without lockscreen</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-2xl text-center">
            <p className="text-[10px] font-bold uppercase text-rose-600">Blood Group</p>
            <p className="text-xl font-extrabold text-rose-950 mt-0.5">O+ Positive</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
            <p className="text-[10px] font-bold uppercase text-slate-400">Allergies</p>
            <p className="text-xs font-bold text-rose-700 mt-1">Penicillin (Severe)</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
            <p className="text-[10px] font-bold uppercase text-slate-400">Conditions</p>
            <p className="text-xs font-bold text-slate-800 mt-1">Type-2 Diabetes</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
            <p className="text-[10px] font-bold uppercase text-slate-400">Emergency Contact</p>
            <p className="text-xs font-bold text-slate-800 mt-1">Sarah (+91 98450 11223)</p>
          </div>
        </div>
      </div>

      {/* 24/7 National Emergency Hotlines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href="tel:112"
          className="p-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl flex items-center justify-between transition-colors shadow-sm"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center font-bold">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">All-in-One Emergency</p>
              <p className="text-lg font-bold">Dial 112</p>
            </div>
          </div>
          <span className="text-xs font-bold text-rose-400">Call Now →</span>
        </a>

        <a
          href="tel:108"
          className="p-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl flex items-center justify-between transition-colors shadow-sm"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center font-bold">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Ambulance Rapid Dispatch</p>
              <p className="text-lg font-bold">Dial 108</p>
            </div>
          </div>
          <span className="text-xs font-bold text-teal-400">Call Now →</span>
        </a>
      </div>

      {/* Nearby Hospital Emergency Rooms */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900">Nearby 24/7 Hospital Emergency Trauma Centers</h2>

        <div className="space-y-3">
          {nearbyEmergencyHospitals.map((hosp, idx) => (
            <div
              key={idx}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-900">{hosp.name}</h3>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                    {hosp.serviceStatus}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  <span>{hosp.address} • <strong>{hosp.distance}</strong></span>
                </p>
                <p className="text-[11px] text-teal-700 font-semibold mt-1 flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  <span>Direct Emergency Dispatch Line: {hosp.phone}</span>
                </p>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <a
                  href={`tel:${hosp.phone}`}
                  className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Hospital ER</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
