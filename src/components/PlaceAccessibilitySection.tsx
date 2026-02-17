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

function resolveConfidenceLabel(accessibility?: AccessibilityFeatureValue[]): { label: string; color: string } {
  const hasVerified = (accessibility || []).some((item) => item.value === true && item.confidence === 'verified');
  if (hasVerified) return { label: 'Verified', color: 'text-emerald-600' };
  const hasReported = (accessibility || []).some(
    (item) => item.value === true && (item.confidence === 'reported' || item.confidence === 'verified')
  );
  if (hasReported) return { label: 'Community reported', color: 'text-sky-600' };
  return { label: 'Needs info', color: 'text-amber-600' };
}

const PlaceAccessibilitySection: React.FC<PlaceAccessibilitySectionProps> = ({
  accessibility = [],
  accessibilitySummary,
  suggestedFeatures = [],
  onAddAccessibilityInfo,
}) => {
  const { label: confidenceLabel, color: confidenceColor } = resolveConfidenceLabel(accessibility);
  const confirmedTrue = accessibility
    .filter((item) => item.value === true && item.confidence !== 'unknown')
    .map((item) => item.feature);
  const confirmedSet = new Set(confirmedTrue);
  const dedupedSuggested = suggestedFeatures.filter((feature, index, arr) =>
    !confirmedSet.has(feature) && arr.indexOf(feature) === index
  );
  const hasConfirmed = confirmedTrue.length > 0;

  return (
    <section>
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-sky-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9 12h6M9 12l2 5M15 12l-2 5M12 7v2" /></svg>
          <h3 className="text-base font-bold text-[#1E293B] flex-1">Accessibility</h3>
          <span className={`text-[10px] font-bold uppercase tracking-wide ${confidenceColor}`}>{confidenceLabel}</span>
        </div>
        {hasConfirmed ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              {confirmedTrue.slice(0, 5).map((feature) => (
                <span key={feature} className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                  {ACCESSIBILITY_FEATURE_LABELS[feature]}
                </span>
              ))}
            </div>
            {accessibilitySummary && <p className="text-xs text-slate-500">{accessibilitySummary}</p>}
          </>
        ) : (
          <p className="text-xs text-slate-500">No accessibility info confirmed yet. Visit and share what you notice to help other families.</p>
        )}
        {dedupedSuggested.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Suggested (unconfirmed)</p>
            <div className="flex flex-wrap gap-1.5">
              {dedupedSuggested.slice(0, 4).map((feature) => (
                <button
                  key={feature}
                  type="button"
                  onClick={() =>
                    onAddAccessibilityInfo?.({
                      focusSection: 'suggested',
                      highlightedSuggestedFeatures: [feature],
                    })
                  }
                  className="px-2.5 py-1 rounded-full text-[10px] font-semibold border border-dashed border-slate-300 text-slate-500 bg-slate-50 active:bg-slate-100"
                >
                  {ACCESSIBILITY_FEATURE_LABELS[feature]}
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
            onAddAccessibilityInfo?.({
              focusSection: dedupedSuggested.length > 0 ? 'suggested' : 'manual',
              highlightedSuggestedFeatures: dedupedSuggested,
            })
          }
          className="w-full h-10 border-2 border-dashed border-sky-200 text-sky-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:bg-sky-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          {hasConfirmed ? 'Update accessibility info' : 'Been here? Add what you noticed'}
        </button>
      </div>
    </section>
  );
};

export default PlaceAccessibilitySection;
