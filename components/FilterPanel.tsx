import React, { useState, useEffect, useRef } from 'react';
import { ExploreIntent } from '../types';
import Filters from './Filters';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  selectedFilter: ExploreIntent;
  onFilterChange: (filter: ExploreIntent) => void;
  radiusKm: number;
  onRadiusChange: (radius: number) => void;
  prefFilterMode: 'all' | 'family' | 'partner' | 'solo';
  onPrefFilterModeChange: (mode: 'all' | 'family' | 'partner' | 'solo') => void;
  hasLinkedPartner: boolean;
  partnerLabel: string;
  combinedPreferences: {
    allergies: string[];
    accessibility: string[];
    foodPreferences: string[];
  };
  childrenCount: number;
  discoveryMode: boolean;
  onToggleDiscoveryMode: () => void;
  hideSavedPlaces: boolean;
  onToggleHideSavedPlaces: () => void;
  onRefreshLocation: () => void;
  locationError: string | null;
  onOpenMustHaves: () => void;
  mustHavesButtonLabel: string;
  selectedLensChipItems: { lensKey: string; chipId: string; label: string }[];
  onToggleLensChip: (lensKey: string, chipId: string) => void;
  onClearExploreFilters: () => void;
  subtitleText: string;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  onClose,
  onApply,
  selectedFilter,
  onFilterChange,
  radiusKm,
  onRadiusChange,
  prefFilterMode,
  onPrefFilterModeChange,
  hasLinkedPartner,
  partnerLabel,
  combinedPreferences,
  childrenCount,
  discoveryMode,
  onToggleDiscoveryMode,
  hideSavedPlaces,
  onToggleHideSavedPlaces,
  onRefreshLocation,
  locationError,
  onOpenMustHaves,
  mustHavesButtonLabel,
  selectedLensChipItems,
  onToggleLensChip,
  onClearExploreFilters,
  subtitleText,
}) => {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true));
      });
      document.body.style.overflow = 'hidden';
    } else {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), 300);
      document.body.style.overflow = '';
      return () => clearTimeout(timer);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!visible) return null;

  const handleApply = () => {
    onApply();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${animating ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={`relative bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto transition-transform duration-300 ease-out ${
          animating ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="sticky top-0 bg-white z-10 px-5 pt-4 pb-3 border-b border-slate-100 rounded-t-3xl">
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Filters</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>

        <div className="px-5 pb-32">
          <div className="py-2">
            <Filters selected={selectedFilter} onChange={onFilterChange} />
            <p className="text-xs font-semibold text-slate-500">{subtitleText}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 mt-3 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onOpenMustHaves}
                className="h-11 px-4 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold"
              >
                Refine
              </button>
              <p className="flex-1 text-xs font-semibold text-slate-500 truncate">{mustHavesButtonLabel}</p>
              {selectedLensChipItems.length > 0 && (
                <button
                  type="button"
                  onClick={onClearExploreFilters}
                  className="h-8 px-3 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600"
                >
                  Clear all
                </button>
              )}
            </div>
            {selectedLensChipItems.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedLensChipItems.map((chip) => (
                  <button
                    key={`${chip.lensKey}:${chip.chipId}`}
                    type="button"
                    onClick={() => onToggleLensChip(chip.lensKey, chip.chipId)}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-100"
                  >
                    <span>{chip.label}</span>
                    <span className="text-sky-500">x</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-4 mt-4 border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Search Radius</span>
              <span className="text-base font-bold text-sky-500">{radiusKm} km</span>
            </div>
            <input
              type="range"
              min="1"
              max="200"
              value={radiusKm}
              onChange={(e) => onRadiusChange(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-sky-500"
            />
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-slate-400 font-medium">1 km</span>
              <span className="text-[10px] text-slate-400 font-medium">200 km</span>
            </div>
            <button
              onClick={onRefreshLocation}
              className="w-full mt-4 py-3 bg-slate-100 active:bg-slate-200 rounded-xl text-sm font-semibold text-slate-600 transition-colors flex items-center justify-center gap-2 min-h-[48px]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
              <span>Use Current Location</span>
            </button>
            {locationError && (
              <p className="text-xs text-rose-500 mt-2 text-center">{locationError}</p>
            )}
          </div>

          <div className="bg-white rounded-2xl p-4 mt-4 border border-slate-100 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Who's Coming?</span>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => onPrefFilterModeChange('all')}
                className={`px-4 py-3 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                  prefFilterMode === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 active:bg-slate-200'
                }`}
              >
                Everyone
              </button>
              <button
                onClick={() => onPrefFilterModeChange('family')}
                className={`px-4 py-3 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                  prefFilterMode === 'family' ? 'bg-sky-500 text-white' : 'bg-sky-50 text-sky-600 active:bg-sky-100'
                }`}
              >
                Family
              </button>
              {hasLinkedPartner && (
                <button
                  onClick={() => onPrefFilterModeChange('partner')}
                  className={`px-4 py-3 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                    prefFilterMode === 'partner' ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-600 active:bg-rose-100'
                  }`}
                >
                  <svg className="w-4 h-4 inline -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg> Partner
                </button>
              )}
              <button
                onClick={() => onPrefFilterModeChange('solo')}
                className={`px-4 py-3 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                  prefFilterMode === 'solo' ? 'bg-purple-500 text-white' : 'bg-purple-50 text-purple-600 active:bg-purple-100'
                }`}
              >
                Just Me
              </button>
            </div>
            {prefFilterMode !== 'all' && (
              <div className="mt-3 text-xs text-slate-500">
                {prefFilterMode === 'family' && (
                  <span>Considering preferences for you{hasLinkedPartner ? `, ${partnerLabel}` : ''}{childrenCount > 0 ? ` & ${childrenCount} kid${childrenCount > 1 ? 's' : ''}` : ''}</span>
                )}
                {prefFilterMode === 'partner' && (
                  <span>Considering preferences for you & {partnerLabel}</span>
                )}
                {prefFilterMode === 'solo' && (
                  <span>Just your preferences</span>
                )}
              </div>
            )}
            {prefFilterMode !== 'all' && (combinedPreferences.allergies.length > 0 || combinedPreferences.accessibility.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {combinedPreferences.allergies.map(allergy => (
                  <span key={allergy} className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                    <svg className="w-3.5 h-3.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> {allergy}
                  </span>
                ))}
                {combinedPreferences.accessibility.map(access => (
                  <span key={access} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                    <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9 12h6M9 12l2 5M15 12l-2 5M12 7v2" /></svg> {access}
                  </span>
                ))}
              </div>
            )}
            {prefFilterMode !== 'all' && combinedPreferences.foodPreferences.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {combinedPreferences.foodPreferences.map(pref => (
                  <span key={pref} className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                    <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 010 8h-1" /><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></svg> {pref}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 space-y-3">
            <div className="bg-gradient-to-r from-sky-50 to-purple-50 rounded-2xl p-4 border border-sky-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>
                  <div>
                    <span className="font-bold text-slate-700 text-sm">Discovery Mode</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Browse by category</p>
                  </div>
                </div>
                <button
                  onClick={onToggleDiscoveryMode}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${discoveryMode ? 'bg-sky-500' : 'bg-slate-300'}`}
                  aria-label="Toggle Discovery Mode"
                >
                  <span data-toggle-knob className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${discoveryMode ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                  <div>
                    <span className="font-bold text-slate-700 text-sm">Fresh Finds Only</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{hideSavedPlaces ? 'Saved spots hidden' : 'Hide places you already saved'}</p>
                  </div>
                </div>
                <button
                  onClick={onToggleHideSavedPlaces}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${hideSavedPlaces ? 'bg-sky-500' : 'bg-slate-300'}`}
                  aria-label="Toggle Fresh Finds"
                >
                  <span data-toggle-knob className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${hideSavedPlaces ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-5 py-4 pb-safe z-10" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <button
            onClick={handleApply}
            className="w-full py-4 bg-sky-500 active:bg-sky-600 text-white font-bold text-base rounded-2xl transition-colors shadow-lg shadow-sky-200 min-h-[56px]"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
