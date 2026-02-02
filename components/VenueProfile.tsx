
import React, { useState } from 'react';
import { Place, FavoriteData } from '../types';

interface VenueProfileProps {
  place: Place;
  isFavorite: boolean;
  favoriteData?: FavoriteData;
  onClose: () => void;
  onToggleFavorite: () => void;
  onUpdateDetails: (data: Partial<FavoriteData>) => void;
}

const VenueProfile: React.FC<VenueProfileProps> = ({ place, isFavorite, favoriteData, onClose, onToggleFavorite, onUpdateDetails }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'parent'>('info');

  return (
    <div className="fixed inset-0 z-[100] bg-[#F8FAFC] overflow-y-auto animate-slide-up">
      {/* Hero Header */}
      <div className="relative h-96">
        <img src={place.imageUrl} className="w-full h-full object-cover" alt={place.name} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F8FAFC] via-transparent to-black/20"></div>
        <button onClick={onClose} className="absolute top-10 left-5 w-12 h-12 bg-white/20 backdrop-blur-xl rounded-2xl text-white flex items-center justify-center border border-white/20">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={onToggleFavorite} className="absolute top-10 right-5 w-12 h-12 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20">
          <span className="text-xl">{isFavorite ? '💙' : '🤍'}</span>
        </button>
        <div className="absolute bottom-10 left-6 right-6">
           <div className="flex gap-2 mb-3">
             {place.tags.map(t => <span key={t} className="px-3 py-1 bg-white/40 backdrop-blur rounded-lg text-[9px] font-bold text-sky-900 uppercase tracking-widest">{t}</span>)}
           </div>
           <h1 className="text-4xl font-black text-[#1E293B] tracking-tight leading-none">{place.name}</h1>
           <p className="text-sm font-bold text-slate-500 mt-2">{place.address}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-5 gap-4">
        <TabBtn active={activeTab === 'info'} onClick={() => setActiveTab('info')} label="Information" />
        <TabBtn active={activeTab === 'parent'} onClick={() => setActiveTab('parent')} label="Parent's Notebook" />
      </div>

      <div className="p-6 space-y-8 pb-32">
        {activeTab === 'info' ? (
          <>
            <section className="space-y-4">
              <h3 className="text-xl font-extrabold text-[#1E293B]">Expert Review</h3>
              <p className="text-slate-500 leading-relaxed text-sm font-medium">
                {place.fullSummary || place.description}
                Our local parents verified this spot for high cleanliness standards, quiet areas for naps, and stroller accessibility.
              </p>
            </section>

            <section className="grid grid-cols-2 gap-4">
              <InfoTile label="Pricing" value={place.priceLevel || '$$'} icon="💰" />
              <InfoTile label="Age Group" value={place.ageAppropriate || 'All ages'} icon="👶" />
              <InfoTile label="Distance" value={place.distance || '0.8 km'} icon="📍" />
              <InfoTile label="Rating" value={`⭐ ${place.rating}`} icon="📈" />
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-extrabold text-[#1E293B]">Contact Details</h3>
              <div className="grid grid-cols-1 gap-3">
                <ContactLink icon="📞" label="Phone" value={place.phone || '+1 555-0199'} />
                <ContactLink icon="🌐" label="Official Site" value={place.website || 'venue.com'} link={place.mapsUrl} />
                <button 
                  onClick={() => window.open(place.mapsUrl, '_blank')} 
                  className="w-full h-16 bg-[#0EA5E9] text-white rounded-3xl font-extrabold mt-4 shadow-xl shadow-sky-100 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  Open in Maps 🚀
                </button>
              </div>
            </section>
          </>
        ) : (
          <div className="animate-slide-up space-y-8">
            {!isFavorite ? (
              <div className="py-16 text-center space-y-4 bg-sky-50 rounded-[40px] p-8 border border-sky-100">
                <div className="w-16 h-16 bg-white rounded-3xl mx-auto flex items-center justify-center text-3xl shadow-sm">📘</div>
                <h3 className="font-black text-sky-900 text-xl">Unlock the Notebook</h3>
                <p className="text-xs text-sky-700/70 font-bold leading-relaxed">Save this location to start keeping track of menu prices, seating preferences, and private family photos.</p>
                <button onClick={onToggleFavorite} className="px-8 h-14 bg-sky-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-sky-200">Add to Favorites</button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <h3 className="text-xl font-extrabold text-sky-900 flex items-center gap-2">
                    <span className="opacity-50 text-base">✏️</span> Private Notes
                  </h3>
                  <textarea 
                    className="w-full p-6 bg-white rounded-3xl border-none text-sm font-bold text-slate-600 shadow-sm focus:ring-2 focus:ring-sky-500 outline-none placeholder:text-slate-300"
                    rows={4}
                    placeholder="Leo loved the blueberry pancakes. Ask for Table 4 near the play area next time..."
                    value={favoriteData?.notes || ''}
                    onChange={(e) => onUpdateDetails({ notes: e.target.value })}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-extrabold text-sky-900">Actual Cost Paid</h3>
                  <div className="flex gap-2 bg-white p-2 rounded-3xl shadow-sm">
                    {['$', '$$', '$$$', '$$$$'].map(price => (
                      <button 
                        key={price}
                        onClick={() => onUpdateDetails({ costEstimate: price })}
                        className={`flex-1 h-12 rounded-2xl font-black text-xs transition-all ${favoriteData?.costEstimate === price ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-50'}`}
                      >
                        {price}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-extrabold text-sky-900">Family Photos</h3>
                    <button className="text-sky-500 font-black text-[10px] uppercase tracking-widest bg-sky-50 px-4 py-2 rounded-xl">Upload +</button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="aspect-square bg-slate-100 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-2xl">📸</div>
                    <div className="aspect-square bg-slate-100 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-2xl">📸</div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const TabBtn = ({ active, onClick, label }: any) => (
  <button 
    onClick={onClick}
    className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
      active ? 'bg-sky-500 text-white shadow-lg shadow-sky-100' : 'text-slate-400 bg-white shadow-sm'
    }`}
  >
    {label}
  </button>
);

const InfoTile = ({ label, value, icon }: any) => (
  <div className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-50">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-xs opacity-60">{icon}</span>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
    <p className="text-sm font-black text-[#1E293B]">{value}</p>
  </div>
);

const ContactLink = ({ icon, label, value, link }: any) => (
  <div onClick={() => link && window.open(link, '_blank')} className="flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-3xl cursor-pointer hover:bg-sky-50/50 transition-colors group">
    <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-xl group-hover:bg-white transition-colors">
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
      <p className="text-sm font-black text-[#1E293B] leading-none">{value}</p>
    </div>
    <span className="text-slate-200 group-hover:text-sky-500 transition-colors">→</span>
  </div>
);

export default VenueProfile;