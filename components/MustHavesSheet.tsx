import React, { useEffect, useRef } from 'react';

interface MustHavesSheetProps<T extends string> {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  selected: T[];
  labels: Record<T, string>;
  options: T[];
  onToggle: (item: T) => void;
  onClear: () => void;
}

export default function MustHavesSheet<T extends string>({
  isOpen,
  onClose,
  title = 'Must haves',
  selected,
  labels,
  options,
  onToggle,
  onClear,
}: MustHavesSheetProps<T>) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

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
        className="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-2" />
        <div className="sticky top-0 bg-white px-6 pt-2 pb-4 border-b border-slate-100 z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-800">{title}</h3>
              <p className="text-sm text-slate-500 mt-1">Choose what matters most right now.</p>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label="Close must haves"
              className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Requirements</p>
            {selected.length > 0 && (
              <button type="button" onClick={onClear} className="text-xs font-semibold text-sky-600">
                Clear all
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {options.map((option) => {
              const isActive = selected.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onToggle(option)}
                  className={`px-3 py-2 rounded-full text-xs font-semibold min-h-[36px] transition-all ${
                    isActive ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {labels[option]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

