
import React from 'react';
import { ActivityType } from '../types';

interface FiltersProps {
  selected: ActivityType;
  onChange: (type: ActivityType) => void;
  radiusKm?: number;
  onRadiusChange?: (radius: number) => void;
}

const Filters: React.FC<FiltersProps> = ({ selected, onChange, radiusKm = 10, onRadiusChange }) => {
  const categories: {id: ActivityType, label: string, icon: string}[] = [
    { id: 'all', label: 'All', icon: '✨' },
    { id: 'restaurant', label: 'Dine', icon: '🍕' },
    { id: 'outdoor', label: 'Parks', icon: '🌳' },
    { id: 'hike', label: 'Hikes', icon: '⛰️' },
    { id: 'active', label: 'Active', icon: '⚽' },
    { id: 'indoor', label: 'Play', icon: '🎲' },
    { id: 'show', label: 'Shows', icon: '🎬' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-6 overflow-x-auto no-scrollbar py-6 -mx-5 px-5">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className="flex flex-col items-center gap-3 shrink-0"
        >
          <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-2xl transition-all duration-300 ${
            selected === cat.id 
              ? 'bg-[#0EA5E9] text-white shadow-xl shadow-sky-200 -translate-y-1' 
              : 'bg-white text-slate-400 shadow-sm border border-slate-50'
          }`}>
            {cat.icon}
          </div>
          <span className={`text-[11px] font-extrabold tracking-tighter uppercase ${selected === cat.id ? 'text-[#0EA5E9]' : 'text-slate-400'}`}>
            {cat.label}
          </span>
        </button>
      ))}
      </div>

      {/* Distance Radius Filter */}
      <div className="px-5 space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-sm font-bold text-slate-600">Search radius:</label>
          <span className="text-lg font-black text-sky-500">{radiusKm} km</span>
        </div>
        <input 
          type="range" 
          min="5" 
          max="50" 
          step="5" 
          value={radiusKm}
          onChange={(e) => onRadiusChange?.(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
        />
        <div className="flex justify-between text-[11px] font-bold text-slate-400">
          <span>5 km</span>
          <span>50 km</span>
        </div>
      </div>
    </div>
  );
};

export default Filters;