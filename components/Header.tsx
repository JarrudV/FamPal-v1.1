import React, { useState } from 'react';
import Logo from './Logo';
import { User } from '../types';

interface HeaderProps {
  setView: (view: string) => void;
  user: User | null;
  locationName: string;
  onSearch?: (query: string) => void;
  onLocationChange?: (postcode: string) => void;
}

const Header: React.FC<HeaderProps> = ({ setView, user, locationName, onSearch, onLocationChange }) => {
  const userPhoto = user?.photoURL || 'https://picsum.photos/seed/guest/100';
  const [searchQuery, setSearchQuery] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [postcodeInput, setPostcodeInput] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  
  const handleSearch = () => {
    if (onSearch) {
      onSearch(searchQuery.trim());
    }
  };
  
  const handleClearSearch = () => {
    setSearchQuery('');
    if (onSearch) {
      onSearch('');
    }
  };
  
  const handleLocationSubmit = async () => {
    if (onLocationChange && postcodeInput.trim()) {
      setLocationLoading(true);
      await onLocationChange(postcodeInput.trim());
      setLocationLoading(false);
      setShowLocationInput(false);
      setPostcodeInput('');
    }
  };
  
  return (
    <header className="px-5 pt-8 pb-4 bg-white/80 backdrop-blur-lg sticky top-0 z-50 border-b border-slate-100">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Logo size={42} className="shadow-lg shadow-purple-200/50 rounded-xl" />
            <div>
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Local Guide</p>
              <button 
                onClick={() => setShowLocationInput(!showLocationInput)}
                className="text-lg font-black text-[#1E293B] flex items-center gap-1 leading-none hover:text-sky-500 transition-colors"
              >
                {locationName} <span className="text-sky-400 text-xs">●</span>
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
          <button 
            onClick={() => setView('profile')}
            className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-white shadow-xl"
          >
            <img src={userPhoto} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </button>
        </div>
        
        {showLocationInput && (
          <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100 animate-slide-up">
            <p className="text-xs font-bold text-sky-700 mb-2">Enter postcode or address:</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="e.g. SW1A 1AA or London" 
                value={postcodeInput}
                onChange={e => setPostcodeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLocationSubmit()}
                className="flex-1 h-12 bg-white border border-sky-200 rounded-xl px-4 font-bold text-sm outline-none focus:ring-2 focus:ring-sky-300"
              />
              <button 
                onClick={handleLocationSubmit}
                disabled={locationLoading}
                className="px-5 h-12 bg-sky-500 text-white rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50"
              >
                {locationLoading ? '...' : 'Set'}
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input 
              type="text" 
              placeholder="Search places..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full h-14 bg-slate-50 border border-slate-100 rounded-3xl pl-14 pr-12 font-bold text-sm shadow-inner focus:ring-2 focus:ring-sky-500/20 focus:bg-white transition-all outline-none"
            />
            {searchQuery && (
              <button 
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button 
            onClick={handleSearch}
            className="w-14 h-14 bg-sky-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-100 active:scale-95 transition-transform"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
