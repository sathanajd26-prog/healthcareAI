import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, Search, ChevronDown, X, Check, Building2 } from 'lucide-react';
import { SOUTH_INDIAN_LOCATIONS, DEFAULT_LOCATION, LocationItem } from '../data/locations';

const STORAGE_KEY = 'aegis_selected_location';

export const getSavedLocation = (): LocationItem | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LOCATION;
    const parsed = JSON.parse(raw);
    return SOUTH_INDIAN_LOCATIONS.find((l) => l.id === parsed.id) || DEFAULT_LOCATION;
  } catch {
    return DEFAULT_LOCATION;
  }
};

export const saveLocation = (location: LocationItem | null) => {
  try {
    if (location) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent('aegis_location_change', { detail: location }));
  } catch (err) {
    console.error('Failed to save location', err);
  }
};

interface LocationSelectorProps {
  variant?: 'hero' | 'navbar';
  onLocationChange?: (location: LocationItem | null) => void;
  className?: string;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  variant = 'hero',
  onLocationChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(getSavedLocation);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync across tabs & components
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<LocationItem | null>;
      const loc = customEvent.detail !== undefined ? customEvent.detail : getSavedLocation();
      setSelectedLocation(loc);
      if (onLocationChange) onLocationChange(loc);
    };

    window.addEventListener('aegis_location_change', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('aegis_location_change', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [onLocationChange]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      // Auto-focus search input when opened
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Filter locations
  const filteredLocations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return SOUTH_INDIAN_LOCATIONS;

    return SOUTH_INDIAN_LOCATIONS.filter((item) => {
      return (
        item.city.toLowerCase().includes(query) ||
        item.state.toLowerCase().includes(query) ||
        item.stateCode.toLowerCase().includes(query)
      );
    });
  }, [searchQuery]);

  // Group filtered locations by state
  const groupedLocations = useMemo(() => {
    const groups: Record<string, LocationItem[]> = {};
    filteredLocations.forEach((item) => {
      if (!groups[item.state]) {
        groups[item.state] = [];
      }
      groups[item.state].push(item);
    });
    return groups;
  }, [filteredLocations]);

  // Reset highlight index when query changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Scroll active item into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-index="${highlightedIndex}"]`) as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (item: LocationItem | null) => {
    setSelectedLocation(item);
    saveLocation(item);
    if (onLocationChange) onLocationChange(item);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleSelect(null);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredLocations.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % filteredLocations.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredLocations.length > 0) {
        setHighlightedIndex((prev) => (prev - 1 + filteredLocations.length) % filteredLocations.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredLocations.length > 0 && filteredLocations[highlightedIndex]) {
        handleSelect(filteredLocations[highlightedIndex]);
      }
    }
  };

  let globalIndexCounter = 0;

  if (variant === 'navbar') {
    return (
      <div ref={containerRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label="Select healthcare location"
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-medical-500"
        >
          <MapPin className="w-3.5 h-3.5 text-medical-600 flex-shrink-0" />
          <span className="truncate max-w-[120px]">
            {selectedLocation ? `${selectedLocation.city}, ${selectedLocation.stateCode}` : 'All Regions'}
          </span>
          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-2 w-80 max-h-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
            {/* Search Header */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center space-x-2">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search city, state (e.g. Chennai, Kochi)..."
                className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* List */}
            <div ref={listRef} className="max-h-64 overflow-y-auto p-2 divide-y divide-slate-100">
              {/* Option to clear / all regions */}
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>All South Indian Hubs</span>
                </div>
                {!selectedLocation && <Check className="w-3.5 h-3.5 text-medical-600" />}
              </button>

              {Object.keys(groupedLocations).length === 0 ? (
                <div className="py-6 px-4 text-center">
                  <p className="text-xs font-semibold text-slate-600">No matching location found</p>
                  <p className="text-[11px] text-slate-400 mt-1">Try searching for Tamil Nadu, Karnataka, Kerala, Telangana or Andhra Pradesh cities.</p>
                </div>
              ) : (
                Object.entries(groupedLocations).map(([state, items]) => (
                  <div key={state} className="pt-2 pb-1">
                    <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      {state}
                    </div>
                    {items.map((item) => {
                      const itemIndex = filteredLocations.findIndex((loc) => loc.id === item.id);
                      const isHighlighted = itemIndex === highlightedIndex;
                      const isSelected = selectedLocation?.id === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          data-index={itemIndex}
                          onClick={() => handleSelect(item)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                            isHighlighted ? 'bg-medical-50 text-medical-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-medical-600' : 'text-slate-400'}`} />
                            <span>
                              {item.city}{' '}
                              <span className="text-[11px] text-slate-400 font-normal">({item.stateCode})</span>
                            </span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-medical-600 font-bold" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Hero Variant (Rendered in Main Search Bar)
  return (
    <div ref={containerRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Location selector"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between space-x-2 px-3 py-2 cursor-pointer rounded-xl hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-medical-500"
      >
        <div className="flex items-center space-x-2 overflow-hidden">
          <MapPin className="w-4 h-4 text-medical-600 flex-shrink-0" />
          <div className="text-left truncate">
            <span className="text-xs font-bold text-slate-800 block truncate">
              {selectedLocation ? `${selectedLocation.city}, ${selectedLocation.stateCode}` : 'All South India'}
            </span>
            <span className="text-[10px] text-slate-400 block -mt-0.5 truncate">
              {selectedLocation ? selectedLocation.state : 'Select city / hub'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1 flex-shrink-0">
          {selectedLocation && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
              title="Clear location"
              aria-label="Clear location"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute left-0 top-full mt-2 w-80 sm:w-96 max-h-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 text-slate-800"
          role="listbox"
        >
          {/* Search Header */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center space-x-2">
            <Search className="w-4 h-4 text-medical-600 flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 29 South Indian medical hubs..."
              className="w-full text-xs font-medium text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-600"
                aria-label="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Location Groups */}
          <div ref={listRef} className="max-h-72 overflow-y-auto p-2 divide-y divide-slate-100">
            {/* All Regions Option */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <Building2 className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="font-semibold block">All South Indian Care Networks</span>
                  <span className="text-[10px] text-slate-400">Search hospitals across all 6 southern regions</span>
                </div>
              </div>
              {!selectedLocation && <Check className="w-4 h-4 text-medical-600" />}
            </button>

            {Object.keys(groupedLocations).length === 0 ? (
              <div className="py-8 px-4 text-center space-y-1">
                <MapPin className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No medical hubs match "{searchQuery}"</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Available in Tamil Nadu, Karnataka, Kerala, Telangana, Andhra Pradesh, and Puducherry.
                </p>
              </div>
            ) : (
              Object.entries(groupedLocations).map(([state, items]) => (
                <div key={state} className="pt-2.5 pb-1">
                  <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-medical-700 uppercase flex items-center justify-between">
                    <span>{state}</span>
                    <span className="text-[9px] text-slate-400 font-normal">{items.length} hubs</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
                    {items.map((item) => {
                      const itemIndex = globalIndexCounter++;
                      const isHighlighted = itemIndex === highlightedIndex;
                      const isSelected = selectedLocation?.id === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          data-index={itemIndex}
                          onClick={() => handleSelect(item)}
                          className={`text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-medical-50 text-medical-900 font-bold border border-medical-200'
                              : isHighlighted
                              ? 'bg-slate-100 text-slate-900 font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-medical-600' : 'bg-slate-300'}`} />
                            <span className="truncate">{item.city}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-medical-600 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="bg-slate-50 px-3 py-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
            <span>29 Verified Regional Hubs</span>
            <span>Use ↑↓ to navigate, Enter to pick</span>
          </div>
        </div>
      )}
    </div>
  );
};
