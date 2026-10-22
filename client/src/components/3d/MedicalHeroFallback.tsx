import React from 'react';
import { HeartPulse, Sparkles } from 'lucide-react';

export const MedicalHeroFallback: React.FC = () => {
  return (
    <div className="relative w-full h-[360px] sm:h-[440px] lg:h-[500px] flex items-center justify-center p-6">
      <div className="relative flex flex-col items-center justify-center p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl text-white max-w-sm text-center space-y-4">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-teal-500 to-sky-400 flex items-center justify-center shadow-lg animate-float-slow">
          <HeartPulse className="w-10 h-10 text-white stroke-[2.2]" />
        </div>
        <div>
          <h3 className="text-base font-bold tracking-tight">AegisHealth Care Matrix</h3>
          <p className="text-xs text-teal-100/90 mt-1">
            Real-time verified practitioner matchmaking, encrypted clinical records, and immediate care access.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-[11px] text-teal-200 font-semibold bg-white/10 px-3 py-1 rounded-full border border-white/15">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Interactive Clinical Platform</span>
        </div>
      </div>
    </div>
  );
};
