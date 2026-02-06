
import React from 'react';
import { ActivityType } from '../types';

interface FiltersProps {
  selected: ActivityType;
  onChange: (type: ActivityType) => void;
}

const Filters: React.FC<FiltersProps> = ({ selected, onChange }) => {
  const categories: {id: ActivityType, label: string, icon: string}[] = [
    { id: 'all', label: 'All', icon: '✨' },
    { id: 'kids', label: 'Kids', icon: '🧒' },
    { id: 'restaurant', label: 'Dine', icon: '🍕' },
    { id: 'wine', label: 'Wine Farms', icon: '🍷' },
    { id: 'outdoor', label: 'Parks', icon: '🌳' },
    { id: 'hike', label: 'Hikes', icon: '⛰️' },
    { id: 'active', label: 'Active', icon: '⚽' },
    { id: 'indoor', label: 'Indoor', icon: '🏛️' },
    { id: 'golf', label: 'Golf', icon: '⛳' },
  ];

  return (
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
  );
};

export default Filters;