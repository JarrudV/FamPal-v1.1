
import React, { useState } from 'react';
import { AppState, Child } from '../types';

interface ProfileProps {
  userState: AppState;
  onLogout: () => void;
  onAddChild: (child: Child) => void;
  onRemoveChild: (id: string) => void;
  onLinkSpouse: (email: string) => void;
}

const Profile: React.FC<ProfileProps> = ({ userState, onLogout, onAddChild, onRemoveChild, onLinkSpouse }) => {
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [spouseEmail, setSpouseEmail] = useState('');

  const handleAddChild = () => {
    if (!childName || !childAge) return;
    onAddChild({ id: Date.now().toString(), name: childName, age: parseInt(childAge) });
    setChildName('');
    setChildAge('');
  };

  const shareApp = async () => {
    const shareData = {
      title: 'FamPals',
      text: 'Check out FamPals for finding the best kid and pet-friendly spots!',
      url: window.location.origin,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback for desktop/unsupported browsers
        window.open(`https://wa.me/?text=${encodeURIComponent(shareData.text + ' ' + shareData.url)}`, '_blank');
      }
    } catch (err) {
      console.log('Share failed', err);
    }
  };

  return (
    <div className="px-5 py-10 space-y-12 animate-slide-up pb-32">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-36 h-36 rounded-[56px] overflow-hidden border-8 border-white shadow-2xl shadow-slate-200">
            <img src="https://picsum.photos/seed/mom/200" className="w-full h-full object-cover" alt="" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center text-white border-4 border-[#F8FAFC] shadow-lg">
            📸
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-black text-[#1E293B]">Sarah Miller</h2>
          <p className="text-sky-500 font-extrabold text-xs uppercase tracking-widest mt-1">Adventure Mom • Lvl 12</p>
        </div>
      </div>

      {/* Growth Action */}
      <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-[40px] p-8 text-white shadow-xl shadow-sky-200 space-y-4">
        <h3 className="text-lg font-black leading-tight">Spread the Adventure</h3>
        <p className="text-white/80 text-xs font-bold leading-relaxed">Know another parent who needs better weekend plans? Share FamPals with your group chat.</p>
        <button 
          onClick={shareApp}
          className="w-full h-14 bg-white text-sky-600 rounded-2xl font-black text-xs uppercase tracking-widest active-press shadow-lg"
        >
          Share with Friends 🚀
        </button>
      </div>

      <div className="space-y-6">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Your Family</h3>
        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="space-y-3">
            {userState.children.map(child => (
              <div key={child.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                <div>
                  <p className="font-black text-sm text-[#1E293B]">{child.name}</p>
                  <p className="text-[9px] text-sky-500 font-black uppercase tracking-widest">Age {child.age}</p>
                </div>
                <button onClick={() => onRemoveChild(child.id)} className="text-slate-300 font-black text-[10px] uppercase hover:text-rose-500 transition-colors">Remove</button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input 
              placeholder="Child's Name" 
              className="flex-1 h-14 bg-slate-50 border-none rounded-2xl px-5 text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-sky-100"
              value={childName}
              onChange={e => setChildName(e.target.value)}
            />
            <input 
              placeholder="Age" 
              type="number"
              className="w-20 h-14 bg-slate-50 border-none rounded-2xl px-4 text-sm font-bold text-center outline-none focus:bg-white focus:ring-2 focus:ring-sky-100"
              value={childAge}
              onChange={e => setChildAge(e.target.value)}
            />
            <button 
              onClick={handleAddChild}
              className="w-14 h-14 bg-sky-500 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-sky-100 active-press"
            >
              ＋
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Connections</h3>
        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm space-y-6">
          {userState.spouseName ? (
            <div className="flex items-center gap-4 p-5 bg-sky-50 rounded-3xl border border-sky-100">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm">👤</div>
              <div>
                <p className="text-sm font-black text-sky-900">Partner Linked</p>
                <p className="text-[10px] text-sky-400 font-black uppercase tracking-widest">Syncing Adventures...</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <input 
                placeholder="Partner's Email" 
                className="flex-1 h-14 bg-slate-50 border-none rounded-2xl px-5 text-sm font-bold outline-none"
                value={spouseEmail}
                onChange={e => setSpouseEmail(e.target.value)}
              />
              <button 
                onClick={() => onLinkSpouse(spouseEmail)}
                className="bg-[#1E293B] text-white px-6 rounded-2xl text-[11px] font-black uppercase tracking-widest active-press"
              >
                Link
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-between p-6 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-rose-50 hover:text-rose-500 transition-colors"
        >
          <span>Sign Out</span>
          <span>🚪</span>
        </button>
      </div>
    </div>
  );
};

export default Profile;