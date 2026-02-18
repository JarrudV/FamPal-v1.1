import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { PetFriendlyFeature, PetFriendlyConfidence, PetFriendlyFeatureValue } from '../types/place';
import { PET_FRIENDLY_FEATURE_LABELS } from '../types/place';

interface PetFriendlyContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  confirmedFeatures?: PetFriendlyFeatureValue[];
  suggestedFeatures?: PetFriendlyFeature[];
  initialScrollTarget?: 'suggested' | 'manual';
  highlightedSuggestedFeatures?: PetFriendlyFeature[];
  onSubmit: (payload: { features: PetFriendlyFeatureValue[]; comment?: string }) => Promise<void> | void;
}

const FEATURE_GROUPS: Array<{ title: string; items: Array<{ feature: PetFriendlyFeature; label: string }> }> = [
  {
    title: 'Dogs',
    items: [
      { feature: 'dogs_allowed', label: 'Dogs allowed' },
      { feature: 'off_leash_area', label: 'Off-leash area' },
      { feature: 'water_bowls', label: 'Water bowls provided' },
    ],
  },
  {
    title: 'Other pets',
    items: [
      { feature: 'cats_allowed', label: 'Cats allowed' },
      { feature: 'pets_inside_allowed', label: 'Pets allowed inside' },
    ],
  },
  {
    title: 'Outdoor areas',
    items: [
      { feature: 'pet_friendly_patio', label: 'Pet-friendly patio' },
      { feature: 'shaded_pet_area', label: 'Shaded pet area' },
      { feature: 'enclosed_garden', label: 'Enclosed garden' },
    ],
  },
  {
    title: 'Amenities',
    items: [
      { feature: 'pet_menu', label: 'Pet menu / treats' },
      { feature: 'pet_waste_stations', label: 'Pet waste stations' },
    ],
  },
];

const PetFriendlyContributionModal: React.FC<PetFriendlyContributionModalProps> = ({
  isOpen,
  onClose,
  confirmedFeatures = [],
  suggestedFeatures = [],
  initialScrollTarget = 'manual',
  highlightedSuggestedFeatures = [],
  onSubmit,
}) => {
  const [selected, setSelected] = useState<Record<PetFriendlyFeature, boolean>>({} as Record<PetFriendlyFeature, boolean>);
  const [confidenceByFeature, setConfidenceByFeature] = useState<Partial<Record<PetFriendlyFeature, PetFriendlyConfidence>>>({});
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const suggestedSectionRef = useRef<HTMLDivElement | null>(null);

  const confirmedTrueFeatures = useMemo(
    () =>
      confirmedFeatures
        .filter((item) => item.value === true && (item.confidence === 'reported' || item.confidence === 'verified'))
        .map((item) => item.feature),
    [confirmedFeatures]
  );
  const suggestedDeduped = useMemo(
    () => suggestedFeatures.filter((feature) => !confirmedTrueFeatures.includes(feature)),
    [suggestedFeatures, confirmedTrueFeatures]
  );
  const selectedFeatures = useMemo(
    () => Object.entries(selected).filter(([, value]) => value).map(([feature]) => feature as PetFriendlyFeature),
    [selected]
  );

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const container = modalRef.current;
      if (!container) return;
      const focusable = container.querySelectorAll<HTMLElement>(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    window.requestAnimationFrame(() => {
      if (initialScrollTarget === 'suggested') {
        suggestedSectionRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    });
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose, initialScrollTarget]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const features: PetFriendlyFeatureValue[] = selectedFeatures.map((feature) => ({
      feature,
      value: true,
      confidence: confidenceByFeature[feature] || 'reported',
      updatedAt: new Date().toISOString(),
    }));
    if (features.length === 0) return;
    setSubmitting(true);
    try {
      await onSubmit({ features, comment: comment.trim() || undefined });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Pet Friendly Features"
        className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-2" />
        <div className="sticky top-0 bg-white px-6 pt-2 pb-4 border-b border-slate-100 z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-800">🐾 Pet Friendly</h3>
              <p className="text-sm text-slate-500 mt-1">Tick only what you personally noticed. This helps other pet owners.</p>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              aria-label="Close pet friendly modal"
              className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div className="border border-slate-100 rounded-2xl p-4">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Confirmed by the FamPal community</p>
            {confirmedTrueFeatures.length === 0 ? (
              <p className="text-sm text-slate-400">No confirmed pet-friendly info yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {confirmedTrueFeatures.map((feature) => (
                  <span key={feature} className="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                    {PET_FRIENDLY_FEATURE_LABELS[feature]}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div ref={suggestedSectionRef} className="border border-slate-100 rounded-2xl p-4">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Help confirm these details</p>
            {suggestedDeduped.length === 0 ? (
              <p className="text-sm text-slate-400">No public hints available for this venue.</p>
            ) : (
              <div className="space-y-3">
                {suggestedDeduped.map((feature) => {
                  const isSelected = !!selected[feature];
                  const isHighlighted = highlightedSuggestedFeatures.includes(feature);
                  return (
                    <label
                      key={feature}
                      className={`flex items-center gap-2 text-sm text-slate-700 rounded-xl px-2 py-1 ${
                        isHighlighted ? 'ring-2 ring-amber-200 bg-amber-50/40' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => setSelected((prev) => ({ ...prev, [feature]: e.target.checked }))}
                      />
                      <span>{PET_FRIENDLY_FEATURE_LABELS[feature]}</span>
                      <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        Suggested by public sources
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {FEATURE_GROUPS.map((group) => (
            <div key={group.title} className="border border-slate-100 rounded-2xl p-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">{group.title}</p>
              <div className="space-y-3">
                {group.items.map(({ feature, label }, idx) => {
                  const isSelected = !!selected[feature];
                  return (
                    <div key={`${feature}-${idx}`} className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => setSelected((prev) => ({ ...prev, [feature]: e.target.checked }))}
                        />
                        <span>{label}</span>
                      </label>
                      {isSelected && (
                        <div className="flex gap-2 pl-6">
                          <button
                            type="button"
                            onClick={() => setConfidenceByFeature((prev) => ({ ...prev, [feature]: 'verified' }))}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                              (confidenceByFeature[feature] || 'reported') === 'verified'
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            I saw this myself
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfidenceByFeature((prev) => ({ ...prev, [feature]: 'reported' }))}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                              confidenceByFeature[feature] === 'reported'
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            Not 100 percent
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 pt-2 pb-6" style={{ paddingBottom: 'max(6rem, calc(env(safe-area-inset-bottom) + 5rem))' }}>
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Optional comment</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="mt-2 w-full min-h-[90px] rounded-2xl border border-slate-200 p-3 text-sm"
            placeholder="Anything else pet owners should know?"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selectedFeatures.length === 0 || submitting}
            className="mt-5 w-full h-14 rounded-2xl bg-amber-500 text-white font-bold text-sm disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Submit pet-friendly report'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PetFriendlyContributionModal;
