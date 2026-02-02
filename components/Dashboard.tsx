
import React, { useState } from 'react';
import { Place, Memory, UserReview } from '../types';

interface DashboardProps {
  favorites: Place[];
  visitedPlaces: Place[];
  memories: Memory[];
  reviews: UserReview[];
  onAddMemory: (m: Memory) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ favorites, visitedPlaces, memories, reviews, onAddMemory }) => {
  const [activeTab, setActiveTab] = useState<'favorites' | 'memories' | 'reviews'>('favorites');
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [caption, setCaption] = useState('');

  const captureMemory = () => {
    if (!caption) return;
    onAddMemory({
      id: Date.now().toString(),
      placeId: 'manual',
      placeName: 'Current Location',
      photoUrl: `https://picsum.photos/seed/${Date.now()}/600/600`,
      caption,
      taggedFriends: [],
      date: new Date().toLocaleDateString()
    });
    setCaption('');
    setShowAddMemory(false);
  };

  return (
    <div className="px-5 py-6 space-y-6 animate-slide-up">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-[#1E293B]">My Safe</h1>
          <p className="text-slate-400 text-sm font-bold">Saved spots & memories</p>
        </div>
        <button 
          onClick={() => setShowAddMemory(!showAddMemory)}
          className="bg-sky-500 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-sky-100 transition-all active:scale-95"
        >
          {showAddMemory ? 'Close' : 'Add Photo'}
        </button>
      </div>

      {showAddMemory && (
        <div className="bg-white p-6 rounded-[40px] shadow-2xl border border-sky-50 space-y-4 animate-slide-up">
           <h3 className="font-black text-sky-900">Tag a Memory</h3>
           <textarea 
             placeholder="What happened today?..."
             className="w-full p-5 bg-slate-50 border-none rounded-3xl text-sm font-bold text-slate-600 outline-none"
             rows={3}
             value={caption}
             onChange={e => setCaption(e.target.value)}
           />
           <div className="flex gap-4">
             <button className="flex-1 h-14 bg-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400">Add Image</button>
             <button 
              onClick={captureMemory}
              className="flex-1 h-14 bg-sky-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-sky-100"
             >
              Save Now
             </button>
           </div>
        </div>
      )}

      <div className="flex gap-4 border-b border-slate-100 overflow-x-auto no-scrollbar">
        <TabButton label="Saved" count={favorites.length} active={activeTab === 'favorites'} onClick={() => setActiveTab('favorites')} />
        <TabButton label="Gallery" count={memories.length} active={activeTab === 'memories'} onClick={() => setActiveTab('memories')} />
        <TabButton label="Log" count={reviews.length} active={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')} />
      </div>

      {activeTab === 'favorites' && (
        <div className="grid grid-cols-1 gap-4">
          {favorites.map(place => (
            <div key={place.id} className="bg-white p-4 rounded-[32px] border border-slate-50 shadow-sm flex items-center gap-4 group">
              <img src={place.imageUrl} className="w-16 h-16 rounded-2xl object-cover" alt="" />
              <div className="flex-1">
                <h3 className="font-black text-sm text-[#1E293B] group-hover:text-sky-500 transition-colors">{place.name}</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">{place.address}</p>
              </div>
              <button className="w-10 h-10 bg-sky-50 rounded-full flex items-center justify-center text-sky-500">
                💙
              </button>
            </div>
          ))}
          {favorites.length === 0 && (
            <div className="py-24 text-center text-slate-300 font-black text-xs uppercase tracking-widest bg-white rounded-[40px] border border-slate-50">No saved spots yet.</div>
          )}
        </div>
      )}

      {activeTab === 'memories' && (
        <div className="grid grid-cols-2 gap-4">
          {memories.map(memory => (
            <div key={memory.id} className="bg-white rounded-[32px] overflow-hidden shadow-sm relative group aspect-square">
              <img src={memory.photoUrl} className="w-full h-full object-cover" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-sky-950/80 via-transparent flex flex-col justify-end p-5 text-white">
                <p className="text-[10px] font-black leading-tight mb-1">{memory.caption}</p>
                <p className="text-[8px] font-bold opacity-60 uppercase tracking-widest">@{memory.placeName}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TabButton = ({ label, count, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`pb-4 px-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap ${
      active ? 'text-sky-500 border-sky-500' : 'text-slate-300 border-transparent'
    }`}
  >
    {label} <span className="opacity-30 ml-1">[{count}]</span>
  </button>
);

export default Dashboard;
