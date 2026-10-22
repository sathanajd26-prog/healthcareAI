import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Languages } from 'lucide-react';

interface LanguageToggleProps {
  className?: string;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ className = '' }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={`inline-flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200/80 shadow-2xs ${className}`}
      role="group"
      aria-label="Language selection"
    >
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-200 flex items-center space-x-1 ${
          language === 'en'
            ? 'bg-white text-medical-800 shadow-xs'
            : 'text-slate-500 hover:text-slate-900'
        }`}
        aria-pressed={language === 'en'}
      >
        <span>EN</span>
      </button>

      <button
        type="button"
        onClick={() => setLanguage('ta')}
        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-200 flex items-center space-x-1 ${
          language === 'ta'
            ? 'bg-medical-700 text-white shadow-xs'
            : 'text-slate-500 hover:text-slate-900'
        }`}
        aria-pressed={language === 'ta'}
      >
        <span>தமிழ்</span>
      </button>
    </div>
  );
};
