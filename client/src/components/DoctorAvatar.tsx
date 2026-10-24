import React, { useState } from 'react';
import { Stethoscope } from 'lucide-react';

interface DoctorAvatarProps {
  src?: string | null;
  alt: string;
  className?: string;
  iconClassName?: string;
}

export const DoctorAvatar: React.FC<DoctorAvatarProps> = ({
  src,
  alt,
  className = 'w-20 h-20 rounded-2xl',
  iconClassName = 'w-8 h-8 text-medical-600',
}) => {
  const [hasError, setHasError] = useState(false);

  // Extract initials if available (e.g., "Dr. Shalini Swaminathan" -> "SS")
  const getInitials = (name: string): string => {
    const cleaned = name.replace(/^Dr\.\s*/i, '').trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'DR';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const showFallback = !src || hasError;

  if (showFallback) {
    return (
      <div
        role="img"
        aria-label={alt || 'Doctor profile avatar'}
        className={`${className} bg-gradient-to-br from-medical-50 to-teal-100/70 border border-medical-200/80 flex flex-col items-center justify-center text-medical-800 flex-shrink-0 select-none shadow-2xs relative overflow-hidden`}
      >
        <Stethoscope className={iconClassName} aria-hidden="true" />
        <span className="text-[10px] font-extrabold tracking-wider text-medical-900/80 mt-0.5">
          {getInitials(alt)}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={`${className} object-cover border border-slate-200 flex-shrink-0`}
      loading="lazy"
    />
  );
};
