
import React from 'react';
import { Place } from '../types';

interface PlaceCardProps {
  place: Place;
  variant: 'hero' | 'list';
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
  onAddToGroup?: () => void;
  showAddToGroup?: boolean;
}

  const PlaceCard: React.FC<PlaceCardProps> = ({ place, variant, isFavorite, onToggleFavorite, onClick, onAddToGroup, showAddToGroup }) => {
  if (variant === 'hero') {
    return (
      <div 
        onClick={onClick}
        className="min-w-[280px] h-[380px] bg-white rounded-[40px] overflow-hidden shadow-[0_20px_40px_rgba(14,165,233,0.1)] relative group shrink-0 cursor-pointer border border-white/20"
      >
        <img src={place.imageUrl} alt={place.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-sky-950/90 via-sky-950/20 to-transparent"></div>
        
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className="absolute top-6 right-6 w-10 h-10 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20"
        >
          <svg className={`w-5 h-5 transition-colors ${isFavorite ? 'fill-sky-400 stroke-sky-400' : 'stroke-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>

        <div className="absolute bottom-8 left-8 right-8 text-white space-y-2">
          <div className="flex gap-2">
            {place.tags.slice(0, 1).map(t => (
               <span key={t} className="px-2 py-0.5 bg-sky-500/40 backdrop-blur-sm rounded-lg text-[8px] font-extrabold uppercase tracking-widest">{t}</span>
            ))}
          </div>
          <h3 className="text-xl font-extrabold leading-tight">{place.name}</h3>
          <div className="flex items-center gap-3 text-[10px] font-bold text-white/70">
            <span className="flex items-center gap-1 text-sky-300">⭐ {place.rating ?? '—'}</span>
            <span>•</span>
            <span>{place.distance}</span>
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
        <h3 className="font-bold text-[15px] text-slate-800 truncate">{place.name}</h3>
        <p className="text-slate-400 text-xs font-medium truncate">{place.description}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-amber-500 text-xs font-bold">⭐ {place.rating ?? '—'}</span>
          <span className="text-slate-300 text-xs">{place.priceLevel || ''}</span>
        </div>
      </div>
      <div className="flex flex-col justify-center gap-1 shrink-0">
        {showAddToGroup && onAddToGroup && (
          <button 
            onClick={(e) => { e.stopPropagation(); onAddToGroup(); }}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-purple-500 bg-purple-50 active:bg-purple-100"
            aria-label="Add to circle"
          >
            👥
          </button>
        )}
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isFavorite ? 'text-sky-500 bg-sky-50' : 'text-slate-300 bg-slate-50'}`}
          aria-label={isFavorite ? 'Remove from saved' : 'Save place'}
        >
          {isFavorite ? '💙' : '🤍'}
        </button>
      </div>
    </div>
  );
};

export default PlaceCard;
