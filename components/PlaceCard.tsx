import React from 'react';
import { Place } from '../types';
import AccessibilityBadges from '../src/components/AccessibilityBadges';
import { formatPriceLevel } from '../src/utils/priceLevel';

interface PlaceCardProps {
  place: Place;
  variant: 'hero' | 'list';
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
  onAddToGroup?: () => void;
  showAddToGroup?: boolean;
  hasNotes?: boolean;
  isVisited?: boolean;
}

const PlaceCard: React.FC<PlaceCardProps> = ({ place, variant, isFavorite, onToggleFavorite, onClick, onAddToGroup, showAddToGroup, hasNotes, isVisited }) => {
  if (variant === 'hero') {
    return (
      <div
        onClick={onClick}
        className="min-w-[280px] h-[380px] bg-white rounded-[40px] overflow-hidden shadow-[0_20px_40px_rgba(168,85,247,0.1)] relative group shrink-0 cursor-pointer border border-white/20"
      >
        <img src={place.imageUrl} alt={place.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent"></div>

        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className="absolute top-6 right-6 w-11 h-11 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20"
        >
          <svg className={`w-5 h-5 transition-colors ${isFavorite ? 'fill-pink-400 stroke-pink-400' : 'stroke-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>

        <div className="absolute bottom-8 left-8 right-8 text-white space-y-2">
          <div className="flex gap-2">
            {place.tags.slice(0, 1).map((t) => (
              <span key={t} className="px-2 py-0.5 bg-purple-500/40 backdrop-blur-sm rounded-lg text-[8px] font-extrabold uppercase tracking-widest">{t}</span>
            ))}
          </div>
          <h3 className="text-xl font-extrabold leading-tight">{place.name}</h3>
          <div className="flex items-center gap-3 text-[10px] font-bold text-white/70">
            <span className="flex items-center gap-1 text-purple-300"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg> {place.rating ?? '—'}</span>
            <span>•</span>
            <span>{place.distance}</span>
          </div>
          <div className="flex flex-wrap gap-1 pt-1">
            <AccessibilityBadges accessibility={place.accessibility} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex gap-3 cursor-pointer active:scale-[0.98] transition-transform"
    >
      <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-100">
        <img src={place.imageUrl} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
        <div className="flex items-center gap-1.5">
          <h3 className="font-bold text-[15px] text-slate-800 truncate">{place.name}</h3>
          {isVisited && <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" title="Visited" />}
          {hasNotes && <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>}
        </div>
        <p className="text-slate-400 text-xs font-medium truncate">{place.description}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-amber-500 text-xs font-bold flex items-center gap-0.5"><svg className="w-3 h-3 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg> {place.rating ?? '—'}</span>
          <span className="text-slate-300 text-xs">{formatPriceLevel(place.priceLevel)}</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          <AccessibilityBadges accessibility={place.accessibility} />
        </div>
      </div>
      <div className="flex flex-col justify-center gap-1 shrink-0">
        {showAddToGroup && onAddToGroup && (
          <button
            onClick={(e) => { e.stopPropagation(); onAddToGroup(); }}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-purple-500 bg-purple-50 active:bg-purple-100"
            aria-label="Add to circle"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${isFavorite ? 'text-pink-500 bg-pink-50' : 'text-slate-300 bg-slate-50'}`}
          aria-label={isFavorite ? 'Remove from saved' : 'Save place'}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
        </button>
      </div>
    </div>
  );
};

export default PlaceCard;
