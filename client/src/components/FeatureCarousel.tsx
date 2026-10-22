import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ShieldCheck, Clock, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { TiltCard } from './motion/TiltCard';
import { prefersReducedMotion } from '../utils/webgl';

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  accentBadge: string;
}

export const FEATURES: FeatureItem[] = [
  {
    id: 'verified',
    title: '100% Medical Council Verified',
    description:
      'Every clinician undergoes multi-step verification including state medical council registration, identity check, and qualification accreditation.',
    icon: ShieldCheck,
    iconBg: 'bg-teal-50 text-teal-700',
    accentBadge: 'NMC & State Registry Certified',
  },
  {
    id: 'telemetry',
    title: 'Real-Time Queue Telemetry',
    description:
      'Never sit in crowded OPD waiting rooms. View live token queues, estimated wait time updates, and check-in directly from your smartphone.',
    icon: Clock,
    iconBg: 'bg-sky-50 text-sky-700',
    accentBadge: 'Live Wait-Time Radar',
  },
  {
    id: 'health-twin',
    title: 'Longitudinal AI Health Twin',
    description:
      'Your comprehensive health timeline aggregates vitals, digital prescriptions, and OCR lab trends into an intelligent non-diagnostic health view.',
    icon: Sparkles,
    iconBg: 'bg-purple-50 text-purple-700',
    accentBadge: 'Smart Timeline Sync',
  },
];

export const FeatureCarousel: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsReducedMotion(prefersReducedMotion());
  }, []);

  const totalSlides = FEATURES.length;

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = (index: number) => {
    setActiveIndex(index);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevSlide();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextSlide();
    }
  };

  // Touch Swipe Handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Minimum swipe threshold (40px) and prioritize horizontal intent over vertical scroll
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }

    setTouchStartX(null);
    setTouchStartY(null);
  };

  return (
    <div
      ref={carouselRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="AegisHealth Clinical Pillars Carousel"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className="relative max-w-3xl mx-auto px-4 sm:px-14 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-medical-500 rounded-3xl"
    >
      {/* Side Arrow Navigation (Desktop & Mobile safe - outside card content) */}
      <button
        type="button"
        onClick={prevSlide}
        aria-label="Previous feature card"
        className="absolute left-0 sm:left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-medical-700 shadow-md hover:shadow-lg border border-slate-200/90 flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-medical-500 active:scale-95"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        type="button"
        onClick={nextSlide}
        aria-label="Next feature card"
        className="absolute right-0 sm:right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-medical-700 shadow-md hover:shadow-lg border border-slate-200/90 flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-medical-500 active:scale-95"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Slide Container / Viewport */}
      <div
        className="overflow-hidden py-4 px-2"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={`flex ${
            isReducedMotion ? '' : 'transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]'
          }`}
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            const isActive = idx === activeIndex;

            return (
              <div
                key={feature.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${idx + 1} of ${totalSlides}: ${feature.title}`}
                aria-hidden={!isActive}
                className="w-full flex-shrink-0 px-2 sm:px-4"
              >
                <TiltCard
                  maxTilt={4}
                  scale={1.01}
                  className="w-full"
                >
                  <div
                    className={`p-6 sm:p-8 rounded-2xl bg-white border transition-all duration-300 text-left ${
                      isActive
                        ? 'border-slate-300 shadow-xl shadow-slate-200/60 ring-1 ring-medical-500/10'
                        : 'border-slate-200 shadow-sm opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-5">
                      <div
                        className={`w-12 h-12 rounded-2xl ${feature.iconBg} flex items-center justify-center font-bold shadow-xs`}
                      >
                        <Icon className="w-6 h-6 stroke-[2.2]" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100/90 px-3 py-1 rounded-full border border-slate-200/60">
                        {feature.accentBadge}
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      {feature.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed">
                      {feature.description}
                    </p>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-medical-700">
                      <span>Enterprise Clinical Grade</span>
                      <span className="text-slate-400 font-normal">
                        Feature {idx + 1} of {totalSlides}
                      </span>
                    </div>
                  </div>
                </TiltCard>
              </div>
            );
          })}
        </div>
      </div>

      {/* Centered Pagination Dots and Navigation Controls */}
      <div className="flex flex-col items-center justify-center space-y-3 mt-4">
        {/* Pagination Dots */}
        <div
          role="tablist"
          aria-label="Carousel slide pagination"
          className="flex items-center space-x-2.5"
        >
          {FEATURES.map((feature, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={feature.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-label={`Go to slide ${idx + 1}: ${feature.title}`}
                onClick={() => goToSlide(idx)}
                className={`transition-all duration-300 rounded-full focus:outline-none focus:ring-2 focus:ring-medical-500 ${
                  isActive
                    ? 'w-7 h-2.5 bg-medical-700 shadow-xs'
                    : 'w-2.5 h-2.5 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            );
          })}
        </div>

        {/* Slide Counter Indicator */}
        <p className="text-[11px] font-medium text-slate-400">
          Showing {activeIndex + 1} of {totalSlides} • Swipe or use arrows
        </p>
      </div>
    </div>
  );
};
