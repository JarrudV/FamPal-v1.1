
import React from 'react';
import Logo from './Logo';

const Header: React.FC<{ setView: any }> = ({ setView }) => {
  return (
    <header className="px-5 pt-8 pb-4 bg-white/80 backdrop-blur-lg sticky top-0 z-50 border-b border-slate-100">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Logo size={42} className="shadow-lg shadow-sky-100" />
            <div>
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Local Guide</p>
              <h1 className="text-lg font-black text-[#1E293B] flex items-center gap-1 leading-none">
                San Francisco <span className="text-sky-400 text-xs">●</span>
              </h1>
            </div>
          </div>
          <button 
            onClick={() => setView('profile')}
            className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-white shadow-xl"
          >
            <img src="https://picsum.photos/seed/mom/100" alt="Profile" className="w-full h-full object-cover" />
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input 
            type="text" 
            placeholder="Find your next family spot..." 
            className="w-full h-14 bg-slate-50 border border-slate-100 rounded-3xl pl-14 pr-6 font-bold text-sm shadow-inner focus:ring-2 focus:ring-sky-500/20 focus:bg-white transition-all outline-none"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
