import React, { useEffect, useRef } from 'react';
import { ExploreFilters, LensDefinition, ExploreLensKey, getSelectedChipSummary } from '../lib/exploreFilters';

interface MustHavesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  filters: ExploreFilters;
  lensDefinitions: LensDefinition[];
  onToggleChip: (lensKey: ExploreLensKey, chipId: string) => void;
  onToggleStrict: (lensKey: ExploreLensKey) => void;
  onClear: () => void;
}

function getGroupSelectedCount(filters: ExploreFilters, lensKey: ExploreLensKey): number {
  return (filters[lensKey] || []).length;
}

export default function MustHavesSheet({
  isOpen,
  onClose,
  title = 'Must haves',
  filters,
  lensDefinitions,
  onToggleChip,
  onToggleStrict,
  onClear,
}: MustHavesSheetProps) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const selectedSummary = getSelectedChipSummary(filters, lensDefinitions);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-2" />
        <div className="sticky top-0 bg-white px-6 pt-2 pb-4 border-b border-slate-100 z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-800">{title}</h3>
              <p className="text-sm text-slate-500 mt-1">Layer filters to rank results without dead ends.</p>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label="Close must haves"
              className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"
            >
              x
            </button>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Selected</p>
              {(selectedSummary.length > 0 || lensDefinitions.some((lens) => filters.strict[lens.key])) && (
                <button type="button" onClick={onClear} className="text-xs font-semibold text-sky-600">
                  Clear all
                </button>
              )}
            </div>
            {selectedSummary.length === 0 ? (
              <p className="mt-1 text-xs text-slate-400">No chips selected yet.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedSummary.slice(0, 6).map((label) => (
                  <span key={label} className="px-2 py-1 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-100">
                    {label}
                  </span>
                ))}
                {selectedSummary.length > 6 && (
                  <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                    +{selectedSummary.length - 6}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 pb-32 space-y-5">
          {lensDefinitions.map((lens) => {
            const selectedCount = getGroupSelectedCount(filters, lens.key);
            const strictEnabled = filters.strict[lens.key];
            return (
              <section key={lens.key} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{lens.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{lens.helperText}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleStrict(lens.key)}
                    className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      strictEnabled
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    <span>Only show</span>
                    <span
                      className={`relative inline-block w-7 h-4 rounded-full transition-colors ${
                        strictEnabled ? 'bg-emerald-400' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`absolute top-[2px] h-3 w-3 rounded-full bg-white transition-transform ${
                          strictEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                        }`}
                      />
                    </span>
                  </button>
                </div>
                {selectedCount > 0 && (
                  <p className="mt-2 text-[11px] font-semibold text-slate-500">{selectedCount} selected</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {lens.chips.map((chip) => {
                    const selected = (filters[lens.key] || []).includes(chip.id);
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => onToggleChip(lens.key, chip.id)}
                        className={`px-3 py-2 rounded-full text-xs font-semibold min-h-[36px] transition-all ${
                          selected ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
