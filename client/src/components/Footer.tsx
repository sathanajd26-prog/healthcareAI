import React from 'react';
import { Activity, ShieldCheck, HeartHandshake, Lock, Phone } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 pt-12 pb-8 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-medical-500 flex items-center justify-center text-white font-bold">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Aegis<span className="text-medical-400">Health</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI-Powered Healthcare Super-App & Clinical Operating System connecting patients, doctors, labs, and pharmacies into one unified ecosystem.
            </p>
            <div className="flex items-center space-x-4 pt-1">
              <span className="inline-flex items-center text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" /> ABDM Milestone 1-3
              </span>
              <span className="inline-flex items-center text-[11px] font-semibold text-sky-400 bg-sky-950/60 border border-sky-800/80 px-2 py-0.5 rounded">
                <Lock className="w-3.5 h-3.5 mr-1" /> 256-Bit Encrypted
              </span>
            </div>
          </div>

          {/* Core Services */}
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">Healthcare Services</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="/doctors" className="hover:text-white transition-colors">Find Verified Specialists</a></li>
              <li><a href="/doctors?mode=VIDEO" className="hover:text-white transition-colors">Instant Video Telemedicine</a></li>
              <li><a href="/records" className="hover:text-white transition-colors">Longitudinal EMR Timeline</a></li>
              <li><a href="/ai-assistant" className="hover:text-white transition-colors">AI Health Assistant & RAG</a></li>
              <li><a href="/emergency" className="hover:text-rose-400 transition-colors">Emergency Hospital SOS</a></li>
            </ul>
          </div>

          {/* Providers & Clinics */}
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">For Medical Providers</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="/provider" className="hover:text-white transition-colors">Doctor OPD Workbench</a></li>
              <li><a href="/provider" className="hover:text-white transition-colors">AI SOAP Clinical Note Generator</a></li>
              <li><a href="/provider" className="hover:text-white transition-colors">Clinic Management & Token Queue</a></li>
              <li><a href="/provider" className="hover:text-white transition-colors">Digital Prescription Engine</a></li>
              <li><a href="/docs/ARCHITECTURE.md" className="hover:text-white transition-colors">System Architecture Blueprint</a></li>
            </ul>
          </div>

          {/* Emergency & Support */}
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">24/7 Clinical Helplines</h4>
            <div className="space-y-2 text-xs text-slate-400">
              <p className="flex items-center text-rose-400 font-semibold">
                <Phone className="w-3.5 h-3.5 mr-1.5" /> Emergency SOS: 112 / 108
              </p>
              <p className="flex items-center text-slate-300">
                <Phone className="w-3.5 h-3.5 mr-1.5 text-medical-400" /> Patient Care: 1800-419-8900
              </p>
              <p className="text-[11px] text-slate-500 pt-2">
                All telemedicine sessions are peer-to-peer encrypted. We do not sell or monetize personal medical records.
              </p>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between text-[11px] text-slate-500">
          <p>© 2026 AegisHealth Systems Inc. An independent healthcare technology platform.</p>
          <p className="mt-2 md:mt-0 max-w-xl text-center md:text-right">
            Medical Disclaimer: AegisHealth facilitates doctor-patient connections and record management. AI features provide non-diagnostic synthesis and must never replace clinical judgement.
          </p>
        </div>
      </div>
    </footer>
  );
};
