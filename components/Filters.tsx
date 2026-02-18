import React from 'react';
import { ExploreIntent } from '../types';

interface FiltersProps {
  selected: ExploreIntent;
  onChange: (type: ExploreIntent) => void;
}

const FilterIcon: React.FC<{ type: string; active: boolean }> = ({ type, active }) => {
  const cls = `w-6 h-6 transition-colors ${active ? 'text-white' : 'text-slate-400'}`;
  switch (type) {
    case 'all':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
    case 'eat_drink':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 010 8h-1" /><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></svg>;
    case 'play_kids':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>;
    case 'outdoors':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-4a2 2 0 00-2-2H5" /><path d="M21 12l-9-9-9 9" /><path d="M12 3C8 3 4 5 2 8" /><circle cx="12" cy="12" r="3" /><path d="M12 22c4 0 8-2 10-5" /></svg>;
    case 'things_to_do':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 7V5a4 4 0 00-8 0v2" /></svg>;
    case 'sport_active':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2l-6 6-6-6" /><path d="M6 22l6-6 6 6" /><circle cx="12" cy="12" r="4" /></svg>;
    case 'indoor':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
    default:
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>;
  }
};

const Filters: React.FC<FiltersProps> = ({ selected, onChange }) => {
  const categories: { id: ExploreIntent; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'eat_drink', label: 'Eat and drink' },
    { id: 'play_kids', label: 'Play and kids' },
    { id: 'outdoors', label: 'Outdoors' },
    { id: 'things_to_do', label: 'Things to do' },
    { id: 'sport_active', label: 'Sport and active' },
    { id: 'indoor', label: 'Indoor' },
  ];

  return (
    <div className="flex gap-6 overflow-x-auto no-scrollbar py-6 -mx-5 px-5">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className="flex flex-col items-center gap-3 shrink-0"
        >
          <div
            className={`w-16 h-16 rounded-[24px] flex items-center justify-center transition-all duration-300 ${
              selected === cat.id
                ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-xl shadow-purple-200 -translate-y-1'
                : 'bg-white text-slate-400 shadow-sm border border-slate-50'
            }`}
          >
            <FilterIcon type={cat.id} active={selected === cat.id} />
          </div>
          <span
            className={`text-[11px] font-extrabold tracking-tighter uppercase ${
              selected === cat.id ? 'text-purple-500' : 'text-slate-400'
            }`}
          >
            {cat.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default Filters;
