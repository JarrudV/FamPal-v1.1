import React from 'react';
import type { FamilyFacility, FamilyFacilityValue } from '../types/place';
import { FAMILY_FACILITY_LABELS } from '../types/place';

interface PlaceFamilyFacilitiesSectionProps {
  familyFacilities?: FamilyFacilityValue[];
  familyFacilitiesSummary?: string;
  suggestedFeatures?: FamilyFacility[];
  onAddFamilyInfo?: (options?: {
    focusSection?: 'suggested' | 'manual';
    highlightedSuggestedFeatures?: FamilyFacility[];
  }) => void;
}

function resolveStatus(familyFacilities?: FamilyFacilityValue[]): string {
  const hasVerified = (familyFacilities || []).some((item) => item.value === true && item.confidence === 'verified');
  if (hasVerified) return 'Verified';
  const hasReported = (familyFacilities || []).some(
    (item) => item.value === true && (item.confidence === 'reported' || item.confidence === 'verified')
  );
  if (!hasReported) return 'Family info not yet confirmed';
  return 'Reported by users';
}

const PlaceFamilyFacilitiesSection: React.FC<PlaceFamilyFacilitiesSectionProps> = ({
  familyFacilities = [],
  familyFacilitiesSummary,
  suggestedFeatures = [],
  onAddFamilyInfo,
}) => {
  const confirmedCount = familyFacilities.filter((item) => item.value === true && item.confidence !== 'unknown').length;
  const status = resolveStatus(familyFacilities);
  const confirmedFeatures = familyFacilities
    .filter((item) => item.value === true && item.confidence !== 'unknown')
    .slice(0, 4);
  const confirmedSet = new Set(
    familyFacilities.filter((item) => item.value === true && item.confidence !== 'unknown').map((item) => item.feature)
  );
  const dedupedSuggested = suggestedFeatures.filter((feature, index, arr) =>
    !confirmedSet.has(feature) && arr.indexOf(feature) === index
  );
  const shownSuggested = dedupedSuggested.slice(0, 3);
  const hiddenSuggested = Math.max(dedupedSuggested.length - shownSuggested.length, 0);

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-extrabold text-[#1E293B]">Family Facilities</h3>
          <span className="text-xs font-semibold text-slate-500">{status}</span>
        </div>
        {confirmedCount === 0 ? (
          <p className="text-sm text-slate-500">No confirmed family facility info yet.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {confirmedFeatures.map((item) => (
                <span key={item.feature} className="px-2 py-1 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700">
                  {FAMILY_FACILITY_LABELS[item.feature]}
                </span>
              ))}
            </div>
            {familyFacilitiesSummary && <p className="text-xs text-slate-500">{familyFacilitiesSummary}</p>}
          </>
        )}
        {shownSuggested.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500">Suggested by public sources (not yet confirmed)</p>
            <div className="flex flex-wrap gap-2">
              {shownSuggested.map((feature) => (
                <button
                  key={feature}
                  type="button"
                  onClick={() =>
                    onAddFamilyInfo?.({
                      focusSection: 'suggested',
                      highlightedSuggestedFeatures: [feature],
                    })
                  }
                  className="px-2 py-1 rounded-full text-[10px] font-semibold border border-slate-200 text-slate-500 bg-white"
                >
                  {FAMILY_FACILITY_LABELS[feature]}
                </button>
              ))}
              {hiddenSuggested > 0 && (
                <span className="px-2 py-1 rounded-full text-[10px] font-semibold border border-slate-200 text-slate-500 bg-white">
                  +{hiddenSuggested} more
                </span>
              )}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() =>
            onAddFamilyInfo?.({
              focusSection: dedupedSuggested.length > 0 ? 'suggested' : 'manual',
              highlightedSuggestedFeatures: dedupedSuggested,
            })
          }
          className="w-full h-11 bg-sky-500 text-white rounded-2xl text-sm font-bold"
        >
          Add family facilities
        </button>
      </div>
    </section>
  );
};

export default PlaceFamilyFacilitiesSection;
