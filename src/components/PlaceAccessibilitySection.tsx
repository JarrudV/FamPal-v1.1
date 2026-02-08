import React from 'react';
import type { AccessibilityFeature, AccessibilityFeatureValue } from '../types/place';
import { ACCESSIBILITY_FEATURE_LABELS } from '../types/place';

interface PlaceAccessibilitySectionProps {
  accessibility?: AccessibilityFeatureValue[];
  accessibilitySummary?: string;
  suggestedFeatures?: AccessibilityFeature[];
  onAddAccessibilityInfo?: (options?: {
    focusSection?: 'suggested' | 'manual';
    highlightedSuggestedFeatures?: AccessibilityFeature[];
  }) => void;
}

function resolveConfidenceLabel(accessibility?: AccessibilityFeatureValue[]): string {
  const hasVerified = (accessibility || []).some((item) => item.value === true && item.confidence === 'verified');
  if (hasVerified) return 'Verified';
  const hasReported = (accessibility || []).some(
    (item) => item.value === true && (item.confidence === 'reported' || item.confidence === 'verified')
  );
  if (hasReported) return 'Reported by users';
  return 'Not yet confirmed';
}

function resolveHelperLine(accessibility: AccessibilityFeatureValue[], accessibilitySummary?: string): string {
  const confirmedCount = accessibility.filter((item) => item.value === true && item.confidence !== 'unknown').length;
  if (confirmedCount === 0) {
    return 'Accessibility info not yet confirmed. If you visit, add what you notice.';
  }
  if (accessibilitySummary && accessibilitySummary.trim().length > 0) {
    return accessibilitySummary;
  }
  const hasVerified = accessibility.some((item) => item.value === true && item.confidence === 'verified');
  if (hasVerified) return 'Verified accessibility details are available below.';
  return 'Community-reported accessibility details are available below.';
}

const PlaceAccessibilitySection: React.FC<PlaceAccessibilitySectionProps> = ({
  accessibility = [],
  accessibilitySummary,
  suggestedFeatures = [],
  onAddAccessibilityInfo,
}) => {
  const confidenceLabel = resolveConfidenceLabel(accessibility);
  const helperLine = resolveHelperLine(accessibility, accessibilitySummary);
  const confirmedTrue = accessibility
    .filter((item) => item.value === true && item.confidence !== 'unknown')
    .map((item) => item.feature);
  const confirmedSet = new Set(confirmedTrue);
  const dedupedSuggested = suggestedFeatures.filter((feature, index, arr) =>
    !confirmedSet.has(feature) && arr.indexOf(feature) === index
  );
  const shownSuggested = dedupedSuggested.slice(0, 3);
  const hiddenSuggested = Math.max(dedupedSuggested.length - shownSuggested.length, 0);
  const hasConfirmed = confirmedTrue.length > 0;

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-extrabold text-[#1E293B]">Accessibility</h3>
          <span className="text-xs font-semibold text-slate-500">{confidenceLabel}</span>
        </div>
        {hasConfirmed && (
          <div className="flex flex-wrap gap-2">
            {confirmedTrue.slice(0, 4).map((feature) => (
              <span key={feature} className="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                {ACCESSIBILITY_FEATURE_LABELS[feature]}
              </span>
            ))}
          </div>
        )}
        <p className="text-sm text-slate-500">{helperLine}</p>
        {shownSuggested.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500">Suggested by public sources (not yet confirmed)</p>
            <div className="flex flex-wrap gap-2">
              {shownSuggested.map((feature) => (
                <button
                  key={feature}
                  type="button"
                  onClick={() =>
                    onAddAccessibilityInfo?.({
                      focusSection: 'suggested',
                      highlightedSuggestedFeatures: [feature],
                    })
                  }
                  className="px-2 py-1 rounded-full text-[10px] font-semibold border border-slate-200 text-slate-500 bg-white"
                >
                  {ACCESSIBILITY_FEATURE_LABELS[feature]}
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
            onAddAccessibilityInfo?.({
              focusSection: dedupedSuggested.length > 0 ? 'suggested' : 'manual',
              highlightedSuggestedFeatures: dedupedSuggested,
            })
          }
          className="w-full h-11 bg-sky-500 text-white rounded-2xl text-sm font-bold"
        >
          Add accessibility info
        </button>
      </div>
    </section>
  );
};

export default PlaceAccessibilitySection;
