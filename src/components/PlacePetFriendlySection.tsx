import React from 'react';
import type { PetFriendlyFeature, PetFriendlyFeatureValue } from '../types/place';
import { PET_FRIENDLY_FEATURE_LABELS } from '../types/place';

interface PlacePetFriendlySectionProps {
  petFriendly?: PetFriendlyFeatureValue[];
  petFriendlySummary?: string;
  suggestedFeatures?: PetFriendlyFeature[];
  onAddPetFriendlyInfo?: (options?: {
    focusSection?: 'suggested' | 'manual';
    highlightedSuggestedFeatures?: PetFriendlyFeature[];
  }) => void;
}

function resolveStatus(petFriendly?: PetFriendlyFeatureValue[]): { label: string; color: string } {
  const hasVerified = (petFriendly || []).some((item) => item.value === true && item.confidence === 'verified');
  if (hasVerified) return { label: 'Verified', color: 'text-emerald-600' };
  const hasReported = (petFriendly || []).some(
    (item) => item.value === true && (item.confidence === 'reported' || item.confidence === 'verified')
  );
  if (hasReported) return { label: 'Community reported', color: 'text-sky-600' };
  return { label: 'Needs info', color: 'text-amber-600' };
}

const PlacePetFriendlySection: React.FC<PlacePetFriendlySectionProps> = ({
  petFriendly = [],
  petFriendlySummary,
  suggestedFeatures = [],
  onAddPetFriendlyInfo,
}) => {
  const confirmedFeatures = petFriendly.filter((item) => item.value === true && item.confidence !== 'unknown');
  const confirmedSet = new Set(confirmedFeatures.map((item) => item.feature));
  const dedupedSuggested = suggestedFeatures.filter((feature, index, arr) =>
    !confirmedSet.has(feature) && arr.indexOf(feature) === index
  );
  const hasConfirmed = confirmedFeatures.length > 0;
  const { label: statusLabel, color: statusColor } = resolveStatus(petFriendly);

  return (
    <section>
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg shrink-0">🐾</span>
          <h3 className="text-base font-bold text-[#1E293B] flex-1">Pet Friendly</h3>
          <span className={`text-[10px] font-bold uppercase tracking-wide ${statusColor}`}>{statusLabel}</span>
        </div>
        {hasConfirmed ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              {confirmedFeatures.slice(0, 5).map((item) => (
                <span key={item.feature} className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                  {PET_FRIENDLY_FEATURE_LABELS[item.feature]}
                </span>
              ))}
            </div>
            {petFriendlySummary && <p className="text-xs text-slate-500">{petFriendlySummary}</p>}
          </>
        ) : (
          <p className="text-xs text-slate-500">No pet-friendly info yet. Been here with your pet? Let others know what to expect.</p>
        )}
        {dedupedSuggested.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              <p className="text-[10px] font-semibold text-amber-600">Possibly available — tap to confirm if you've been here</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {dedupedSuggested.slice(0, 4).map((feature) => (
                <button
                  key={feature}
                  type="button"
                  onClick={() =>
                    onAddPetFriendlyInfo?.({
                      focusSection: 'suggested',
                      highlightedSuggestedFeatures: [feature],
                    })
                  }
                  className="px-2.5 py-1 rounded-full text-[10px] font-semibold border border-amber-200 text-amber-700 bg-amber-50 active:bg-amber-100"
                >
                  <span className="mr-1">?</span>{PET_FRIENDLY_FEATURE_LABELS[feature]}
                </button>
              ))}
              {dedupedSuggested.length > 4 && (
                <span className="px-2 py-1 rounded-full text-[10px] font-semibold text-slate-400">
                  +{dedupedSuggested.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() =>
            onAddPetFriendlyInfo?.({
              focusSection: dedupedSuggested.length > 0 ? 'suggested' : 'manual',
              highlightedSuggestedFeatures: dedupedSuggested,
            })
          }
          className="w-full h-10 bg-amber-50 border border-amber-200 text-amber-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:bg-amber-100 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          {hasConfirmed ? 'Been here? Add what you noticed' : 'Been here with your pet? Add what you noticed'}
        </button>
      </div>
    </section>
  );
};

export default PlacePetFriendlySection;
