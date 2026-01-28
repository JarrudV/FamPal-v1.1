
import React from 'react';
import { Place } from '../types';

interface PlaceCardProps {
  place: Place;
  variant: 'hero' | 'list';
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}

const PlaceCard: React.FC<PlaceCardProps> = ({ place, variant, isFavorite, onToggleFavorite, onClick }) => {
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
            <span className="flex items-center gap-1 text-sky-300">⭐ {place.rating}</span>
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
      className="bg-white p-4 rounded-[32px] shadow-sm border border-slate-100 flex gap-4 animate-slide-up cursor-pointer hover:border-sky-200 hover:shadow-lg hover:shadow-sky-50 transition-all group"
    >
      <div className="w-24 h-24 rounded-[24px] overflow-hidden shrink-0 shadow-sm">
        <img src={place.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
      </div>
      <div className="flex-1 flex flex-col justify-center gap-1">
        <h3 className="font-extrabold text-[#1E293B] group-hover:text-sky-600 transition-colors">{place.name}</h3>
        <p className="text-slate-400 text-xs font-medium line-clamp-1">{place.description}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-tighter">
            <span className="text-sky-500">⭐ {place.rating}</span>
            <span>{place.priceLevel}</span>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${isFavorite ? 'text-sky-500 bg-sky-50' : 'text-slate-200 bg-slate-50'}`}
          >
            {isFavorite ? '💙' : '🤍'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaceCard;