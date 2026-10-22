import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  fallback?: string;
  label?: string;
  className?: string;
  variant?: 'pill' | 'dark' | 'ghost';
}

export const BackButton: React.FC<BackButtonProps> = ({
  fallback = '/dashboard',
  label = 'Go back',
  className = '',
  variant = 'pill',
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    // If user has browser history, go back; otherwise fallback to sensible route
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  const variantStyles = {
    pill: 'text-slate-600 bg-white/90 hover:bg-slate-100 hover:text-slate-900 border-slate-200/80 shadow-xs',
    dark: 'text-slate-200 bg-slate-800/90 hover:bg-slate-700 hover:text-white border-slate-700 shadow-xs',
    ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent',
  }[variant];

  const iconColor = variant === 'dark' ? 'text-slate-400' : 'text-slate-500';

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label={label}
      title={label}
      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all focus:outline-none focus:ring-2 focus:ring-medical-500/30 ${variantStyles} ${className}`}
    >
      <ArrowLeft className={`w-3.5 h-3.5 ${iconColor}`} />
      <span>{label}</span>
    </button>
  );
};
