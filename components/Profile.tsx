import React, { useState } from 'react';
import { AppState, Child, PartnerLink } from '../types';

interface ProfileProps {
  state: AppState;
  isGuest: boolean;
  onSignOut: () => void;
  setView: (view: string) => void;
  onUpdateState: (key: keyof AppState, value: any) => void;
}

const Profile: React.FC<ProfileProps> = ({ state, isGuest, onSignOut, setView, onUpdateState }) => {
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [spouseEmail, setSpouseEmail] = useState('');

  const handleAddChild = () => {
    if (!childName || !childAge) return;
    const newChild: Child = { id: Date.now().toString(), name: childName, age: parseInt(childAge) };
    onUpdateState('children', [...state.children, newChild]);
    setChildName('');
    setChildAge('');
  };

  const handleRemoveChild = (id: string) => {
    onUpdateState('children', state.children.filter(c => c.id !== id));
  };

  const handleLinkSpouse = () => {
    if (!spouseEmail) return;
    const partnerLink: PartnerLink = {
      partnerEmail: spouseEmail,
      partnerName: spouseEmail.split('@')[0],
      linkedAt: new Date().toISOString(),
      status: 'pending'
    };
    onUpdateState('partnerLink', partnerLink);
    onUpdateState('spouseName', spouseEmail.split('@')[0]);
    onUpdateState('linkedEmail', spouseEmail);
    setSpouseEmail('');
  };

  const handleUnlinkPartner = () => {
    onUpdateState('partnerLink', undefined);
    onUpdateState('spouseName', undefined);
    onUpdateState('linkedEmail', undefined);
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
        window.open(`https://wa.me/?text=${encodeURIComponent(shareData.text + ' ' + shareData.url)}`, '_blank');
      }
    } catch (err) {
      console.log('Share failed', err);
    }
  };

  const userName = state.user?.displayName || 'Guest User';
  const userPhoto = state.user?.photoURL || 'https://picsum.photos/seed/guest/200';

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 container-safe">
      <header className="px-5 pt-8 pb-4 bg-white/80 backdrop-blur-lg sticky top-0 z-50 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('dashboard')}
            className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500"
          >
            ←
          </button>
          <h1 className="text-lg font-black text-[#1E293B]">Profile</h1>
        </div>
      </header>

      <div className="px-5 py-10 space-y-12 animate-slide-up">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-36 h-36 rounded-[56px] overflow-hidden border-8 border-white shadow-2xl shadow-slate-200">
              <img src={userPhoto} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center text-white border-4 border-[#F8FAFC] shadow-lg">
              📸
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-black text-[#1E293B]">{userName}</h2>
            <p className="text-sky-500 font-extrabold text-xs uppercase tracking-widest mt-1">Adventure Parent</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-[40px] p-8 text-white shadow-xl shadow-sky-200 space-y-4">
          <h3 className="text-lg font-black leading-tight">Spread the Adventure</h3>
          <p className="text-white/80 text-xs font-bold leading-relaxed">Know another parent who needs better weekend plans? Share FamPals with your group chat.</p>
          <button 
            onClick={shareApp}
            className="w-full h-14 bg-white text-sky-600 rounded-2xl font-black text-xs uppercase tracking-widest active-press shadow-lg"
          >
            Share with Friends
          </button>
        </div>

        <div className="space-y-6">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Your Family</h3>
          
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl p-4 border border-purple-100">
            <div className="flex items-start gap-3">
              <span className="text-xl">✨</span>
              <div>
                <p className="text-sm font-bold text-purple-800">Better recommendations for your family</p>
                <p className="text-xs text-purple-600 mt-1">
                  Add your children's ages below to get personalized AI summaries and place recommendations tailored to your family's needs.
                </p>
              </div>
            </div>
          </div>

          {isGuest ? (
            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm">
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-slate-700 mb-2">Sign in to save your family</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                  Create an account to save your children's details and get personalized recommendations.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm space-y-6">
              <div className="space-y-3">
                {state.children.map(child => (
                  <div key={child.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                    <div>
                      <p className="font-black text-sm text-[#1E293B]">{child.name}</p>
                      <p className="text-[9px] text-sky-500 font-black uppercase tracking-widest">Age {child.age}</p>
                    </div>
                    <button onClick={() => handleRemoveChild(child.id)} className="text-slate-300 font-black text-[10px] uppercase hover:text-rose-500 transition-colors">Remove</button>
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
                  type="button"
                  onClick={handleAddChild}
                  className="w-14 h-14 bg-sky-500 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-sky-100 active-press"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>

        {!isGuest && (
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Connections</h3>
            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm space-y-6">
              {state.partnerLink || state.spouseName ? (
                <div className="flex items-center gap-4 p-5 bg-sky-50 rounded-3xl border border-sky-100">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm">💑</div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-sky-900">{state.partnerLink?.partnerName || state.spouseName}</p>
                    <p className="text-[10px] text-sky-400 font-black uppercase tracking-widest">
                      {state.partnerLink?.status === 'accepted' ? 'Connected' : 'Invite Sent'}
                    </p>
                    {state.partnerLink?.partnerEmail && (
                      <p className="text-[9px] text-slate-400 mt-1">{state.partnerLink.partnerEmail}</p>
                    )}
                  </div>
                  <button 
                    onClick={handleUnlinkPartner}
                    className="text-slate-300 hover:text-rose-500 text-xs font-bold transition-colors"
                  >
                    Unlink
                  </button>
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
                    onClick={handleLinkSpouse}
                    className="bg-[#1E293B] text-white px-6 rounded-2xl text-[11px] font-black uppercase tracking-widest active-press"
                  >
                    Link
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <button 
            onClick={onSignOut}
            className="w-full flex items-center justify-between p-6 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-rose-50 hover:text-rose-500 transition-colors"
          >
            <span>Sign Out</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
