
import React from 'react';

const NavButton = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1.5 transition-all">
    <span className={`text-2xl transition-transform ${active ? 'scale-110' : 'opacity-40 grayscale'}`}>{icon}</span>
    <span className={`text-[9px] font-black uppercase tracking-tighter transition-colors ${active ? 'text-sky-600' : 'text-slate-300'}`}>{label}</span>
  </button>
);

export default NavButton;
