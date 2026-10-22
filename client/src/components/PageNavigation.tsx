import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { BackButton } from './BackButton';
import { HomeButton } from './HomeButton';

interface PageNavigationProps {
  backFallback?: string;
  backLabel?: string;
  homeFallback?: string;
  homeLabel?: string;
  showHome?: boolean;
  showBack?: boolean;
  breadcrumbs?: Array<{ label: string; path?: string }>;
  rightContent?: React.ReactNode;
  className?: string;
}

export const PageNavigation: React.FC<PageNavigationProps> = ({
  backFallback = '/dashboard',
  backLabel = 'Back',
  homeFallback,
  homeLabel,
  showHome = true,
  showBack = true,
  breadcrumbs,
  rightContent,
  className = '',
}) => {
  return (
    <nav aria-label="Page navigation" className={`flex flex-wrap items-center justify-between gap-3 py-1 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {showBack && (
          <BackButton fallback={backFallback} label={backLabel} />
        )}
        {showHome && (
          <HomeButton to={homeFallback} label={homeLabel} />
        )}

        {breadcrumbs && breadcrumbs.length > 0 && (
          <ol className="hidden sm:flex items-center space-x-1.5 ml-2 text-xs text-slate-500 font-medium">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <li key={idx} className="flex items-center space-x-1.5">
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
                  {crumb.path && !isLast ? (
                    <Link to={crumb.path} className="hover:text-medical-700 transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={isLast ? 'font-semibold text-slate-800' : ''}>
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {rightContent && (
        <div className="flex items-center space-x-2">
          {rightContent}
        </div>
      )}
    </nav>
  );
};
