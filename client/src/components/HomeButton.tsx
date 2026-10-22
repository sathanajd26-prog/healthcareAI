import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HomeButtonProps {
  to?: string;
  label?: string;
  showLabel?: boolean;
  className?: string;
  variant?: 'pill' | 'nav' | 'ghost' | 'dark';
}

/**
 * Returns the authorized home/dashboard route based on user role and authentication status.
 */
export const getHomeRouteForUser = (user: { role?: string } | null, token: string | null): { path: string; label: string } => {
  if (!token || !user) {
    return { path: '/', label: 'Home' };
  }

  switch (user.role) {
    case 'DOCTOR':
      return { path: '/provider', label: 'Doctor Portal' };
    case 'CLINIC_ADMIN':
    case 'HOSPITAL_ADMIN':
      return { path: '/provider', label: 'Provider Portal' };
    case 'SUPER_ADMIN':
      return { path: '/provider', label: 'Provider & Admin Portal' };
    case 'PATIENT':
    default:
      return { path: '/dashboard', label: 'Dashboard' };
  }
};

export const HomeButton: React.FC<HomeButtonProps> = ({
  to,
  label,
  showLabel = true,
  className = '',
  variant = 'pill',
}) => {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const defaultHome = getHomeRouteForUser(user, token);
  const targetPath = to || defaultHome.path;
  const displayLabel = label || defaultHome.label;
  const tooltip = `Return to ${displayLabel} (${targetPath})`;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(targetPath);
  };

  if (variant === 'nav') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={tooltip}
        title={tooltip}
        className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-medical-500/30 ${className}`}
      >
        <Home className="w-4 h-4 text-slate-400 group-hover:text-medical-600" />
        {showLabel && <span>{displayLabel}</span>}
      </button>
    );
  }

  if (variant === 'dark') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={tooltip}
        title={tooltip}
        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-700 hover:text-white border border-slate-700 shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-medical-500/30 active:scale-95 ${className}`}
      >
        <Home className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
        {showLabel && <span>{displayLabel}</span>}
      </button>
    );
  }

  if (variant === 'ghost') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={tooltip}
        title={tooltip}
        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all focus:outline-none focus:ring-2 focus:ring-medical-500/30 ${className}`}
      >
        <Home className="w-3.5 h-3.5 text-medical-600 flex-shrink-0" />
        {showLabel && <span>{displayLabel}</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={tooltip}
      title={tooltip}
      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-medical-700 border border-slate-200/90 shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-medical-500/30 focus:border-medical-500 active:scale-95 ${className}`}
    >
      <Home className="w-3.5 h-3.5 text-medical-600 flex-shrink-0" />
      {showLabel && <span>{displayLabel}</span>}
    </button>
  );
};
