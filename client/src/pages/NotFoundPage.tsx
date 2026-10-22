import React from 'react';
import { AlertCircle, Search, Bot } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { HomeButton } from '../components/HomeButton';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
      <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200 shadow-xs">
        <AlertCircle className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Error 404 • Resource Not Found</span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          The requested clinical page does not exist
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          The URL you entered could not be found on this healthcare gateway. It may have been moved or you may have entered an outdated link.
        </p>
      </div>

      {/* Navigation Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <BackButton fallback="/dashboard" label="Go to Previous Page" className="!px-4 !py-2 !text-sm" />
        <HomeButton label="Return to Home / Dashboard" className="!px-4 !py-2 !text-sm !bg-medical-700 !text-white !border-medical-700 hover:!bg-medical-800" />
      </div>

      {/* Popular quick links */}
      <div className="pt-8 border-t border-slate-200/80 max-w-md mx-auto">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Popular Clinical Destinations</p>
        <div className="flex flex-wrap justify-center gap-2 text-xs">
          <Link
            to="/doctors"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-medium"
          >
            <Search className="w-3.5 h-3.5 text-medical-600" />
            <span>Find Doctors</span>
          </Link>
          <Link
            to="/ai-assistant"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-medium"
          >
            <Bot className="w-3.5 h-3.5 text-medical-600" />
            <span>AI Health Assistant</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
