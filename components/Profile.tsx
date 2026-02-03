import React, { useState } from 'react';
import { AppState, Child, PartnerLink, Preferences, FOOD_PREFERENCES, ALLERGY_OPTIONS, ACCESSIBILITY_OPTIONS, ACTIVITY_PREFERENCES, PLAN_LIMITS } from '../types';
import PlanBilling from './PlanBilling';
import { getLimits, getPlanDisplayName, canUseAI, isPaidTier } from '../lib/entitlements';

interface ProfileProps {
  state: AppState;
  isGuest: boolean;
  onSignOut: () => void;
  setView: (view: string) => void;
  onUpdateState: (key: keyof AppState, value: any) => void;
}

const generateInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const Profile: React.FC<ProfileProps> = ({ state, isGuest, onSignOut, setView, onUpdateState }) => {
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [spouseEmail, setSpouseEmail] = useState('');
  const [partnerCode, setPartnerCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [showPlanBilling, setShowPlanBilling] = useState(false);

  const userPrefs = state.preferences || { foodPreferences: [], allergies: [], accessibility: [], activityPreferences: [] };
  const limits = getLimits(state.entitlement);
  const isPaid = isPaidTier(state.entitlement);
  const aiInfo = canUseAI(state.entitlement);
  const planTier = state.entitlement?.plan_tier || 'free';

  const FREE_PREF_LIMIT = limits.preferencesPerCategory;
  
  const toggleUserPref = (category: keyof Preferences, value: string) => {
    const current = userPrefs[category] as string[] || [];
    const isRemoving = current.includes(value);
    
    // Check if free user is at limit when adding
    if (!isRemoving && !state.isPro && current.length >= FREE_PREF_LIMIT) {
      return; // Don't add more if at limit for free users
    }
    
    const updated = isRemoving 
      ? current.filter(v => v !== value)
      : [...current, value];
    onUpdateState('preferences', { ...userPrefs, [category]: updated });
  };

  const toggleChildPref = (childId: string, category: keyof Preferences, value: string) => {
    const children = state.children.map(c => {
      if (c.id !== childId) return c;
      const prefs = c.preferences || { foodPreferences: [], allergies: [], accessibility: [], activityPreferences: [] };
      const current = prefs[category] as string[] || [];
      const isRemoving = current.includes(value);
      
      // Check if free user is at limit when adding
      if (!isRemoving && !state.isPro && current.length >= FREE_PREF_LIMIT) {
        return c; // Don't modify if at limit for free users
      }
      
      const updated = isRemoving ? current.filter(v => v !== value) : [...current, value];
      return { ...c, preferences: { ...prefs, [category]: updated } };
    });
    onUpdateState('children', children);
  };

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

  const handleGenerateCode = () => {
    const code = generateInviteCode();
    const partnerLink: PartnerLink = {
      inviteCode: code,
      linkedAt: new Date().toISOString(),
      status: 'pending'
    };
    onUpdateState('partnerLink', partnerLink);
  };

  const handleCopyCode = async () => {
    if (state.partnerLink?.inviteCode) {
      await navigator.clipboard.writeText(state.partnerLink.inviteCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleShareCode = () => {
    if (state.partnerLink?.inviteCode) {
      const message = `Join me on FamPals! Use my partner code: ${state.partnerLink.inviteCode}\n\nDownload the app: ${window.location.origin}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const handleJoinWithCode = () => {
    if (!partnerCode || partnerCode.length !== 6) return;
    const partnerLink: PartnerLink = {
      inviteCode: partnerCode.toUpperCase(),
      linkedAt: new Date().toISOString(),
      status: 'accepted',
      partnerName: 'Partner'
    };
    onUpdateState('partnerLink', partnerLink);
    setPartnerCode('');
    setShowCodeInput(false);
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
                {state.children.map(child => {
                  const childPrefs = child.preferences || { foodPreferences: [], allergies: [], accessibility: [], activityPreferences: [] };
                  const prefsCount = childPrefs.foodPreferences.length + childPrefs.allergies.length + childPrefs.accessibility.length + childPrefs.activityPreferences.length;
                  return (
                    <div key={child.id} className="bg-slate-50 rounded-2xl border border-slate-100/50 overflow-hidden">
                      <div className="flex justify-between items-center p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg">👶</div>
                          <div>
                            <p className="font-black text-sm text-[#1E293B]">{child.name}</p>
                            <p className="text-[9px] text-sky-500 font-black uppercase tracking-widest">Age {child.age}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setEditingChildId(editingChildId === child.id ? null : child.id)}
                            className={`px-3 py-1.5 rounded-xl text-[9px] font-bold ${prefsCount > 0 ? 'bg-violet-100 text-violet-600' : 'bg-slate-200 text-slate-500'}`}
                          >
                            {prefsCount || '+'} prefs
                          </button>
                          <button onClick={() => handleRemoveChild(child.id)} className="text-slate-300 font-black text-[10px] uppercase hover:text-rose-500 transition-colors">×</button>
                        </div>
                      </div>

                      {editingChildId === child.id && (
                        <div className="px-4 pb-4 space-y-4 border-t border-slate-200 pt-3 bg-white">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Food</p>
                            <div className="flex flex-wrap gap-1.5">
                              {FOOD_PREFERENCES.map(pref => (
                                <button
                                  key={pref}
                                  onClick={() => toggleChildPref(child.id, 'foodPreferences', pref)}
                                  className={`px-2 py-1 rounded-lg text-[9px] font-bold ${
                                    childPrefs.foodPreferences.includes(pref) ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'
                                  }`}
                                >
                                  {pref}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Allergies</p>
                            <div className="flex flex-wrap gap-1.5">
                              {ALLERGY_OPTIONS.map(pref => (
                                <button
                                  key={pref}
                                  onClick={() => toggleChildPref(child.id, 'allergies', pref)}
                                  className={`px-2 py-1 rounded-lg text-[9px] font-bold ${
                                    childPrefs.allergies.includes(pref) ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'
                                  }`}
                                >
                                  {pref}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Accessibility</p>
                            <div className="flex flex-wrap gap-1.5">
                              {ACCESSIBILITY_OPTIONS.map(pref => (
                                <button
                                  key={pref}
                                  onClick={() => toggleChildPref(child.id, 'accessibility', pref)}
                                  className={`px-2 py-1 rounded-lg text-[9px] font-bold ${
                                    childPrefs.accessibility.includes(pref) ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'
                                  }`}
                                >
                                  {pref}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Activities</p>
                            <div className="flex flex-wrap gap-1.5">
                              {ACTIVITY_PREFERENCES.map(pref => (
                                <button
                                  key={pref}
                                  onClick={() => toggleChildPref(child.id, 'activityPreferences', pref)}
                                  className={`px-2 py-1 rounded-lg text-[9px] font-bold ${
                                    childPrefs.activityPreferences.includes(pref) ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-400'
                                  }`}
                                >
                                  {pref}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Your Preferences</h3>
            <div className="bg-white rounded-[40px] p-6 border border-slate-100 shadow-sm space-y-4">
              <button 
                onClick={() => setShowPreferences(!showPreferences)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center text-lg">⚙️</div>
                  <div className="text-left">
                    <p className="font-bold text-sm text-slate-800">Food, Activities & Accessibility</p>
                    <p className="text-[10px] text-slate-400">
                      {(userPrefs.foodPreferences.length + userPrefs.allergies.length + userPrefs.accessibility.length + userPrefs.activityPreferences.length) || 'No'} preferences set
                    </p>
                  </div>
                </div>
                <span className={`text-slate-300 transition-transform ${showPreferences ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {showPreferences && (
                <>
                  {!state.isPro && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-100 mb-4 mt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">✨</span>
                        <div>
                          <p className="font-bold text-xs text-amber-800">Free: 3 preferences per category</p>
                          <p className="text-[10px] text-amber-600">Upgrade to Pro for unlimited preferences</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-5 pt-4 border-t border-slate-100">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Food Preferences</p>
                      {!state.isPro && <span className="text-[9px] font-bold text-slate-400">{userPrefs.foodPreferences.length}/{FREE_PREF_LIMIT}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {FOOD_PREFERENCES.map(pref => {
                        const isSelected = userPrefs.foodPreferences.includes(pref);
                        const isDisabled = !isSelected && !state.isPro && userPrefs.foodPreferences.length >= FREE_PREF_LIMIT;
                        return (
                          <button
                            key={pref}
                            onClick={() => toggleUserPref('foodPreferences', pref)}
                            disabled={isDisabled}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                              isSelected 
                                ? 'bg-green-500 text-white' 
                                : isDisabled ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {pref}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Allergies</p>
                    <div className="flex flex-wrap gap-2">
                      {ALLERGY_OPTIONS.map(pref => (
                        <button
                          key={pref}
                          onClick={() => toggleUserPref('allergies', pref)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                            userPrefs.allergies.includes(pref) 
                              ? 'bg-rose-500 text-white' 
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {pref}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Accessibility Needs</p>
                    <div className="flex flex-wrap gap-2">
                      {ACCESSIBILITY_OPTIONS.map(pref => (
                        <button
                          key={pref}
                          onClick={() => toggleUserPref('accessibility', pref)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                            userPrefs.accessibility.includes(pref) 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {pref}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Activity Preferences</p>
                    <div className="flex flex-wrap gap-2">
                      {ACTIVITY_PREFERENCES.map(pref => (
                        <button
                          key={pref}
                          onClick={() => toggleUserPref('activityPreferences', pref)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                            userPrefs.activityPreferences.includes(pref) 
                              ? 'bg-violet-500 text-white' 
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {pref}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                </>
              )}
            </div>
          </div>
        )}

        {!isGuest && (
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Connections</h3>
            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm space-y-6">
              {state.partnerLink ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-5 bg-sky-50 rounded-3xl border border-sky-100">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm">💑</div>
                    <div className="flex-1">
                      {state.partnerLink.status === 'accepted' ? (
                        <>
                          <p className="text-sm font-black text-sky-900">{state.partnerLink.partnerName || 'Partner'}</p>
                          <p className="text-[10px] text-green-500 font-black uppercase tracking-widest">Connected</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-black text-sky-900">Your Invite Code</p>
                          <p className="text-2xl font-black text-sky-500 tracking-[0.3em] mt-1">{state.partnerLink.inviteCode}</p>
                          <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mt-1">Waiting for partner</p>
                        </>
                      )}
                    </div>
                    <button 
                      onClick={handleUnlinkPartner}
                      className="text-slate-300 hover:text-rose-500 text-xs font-bold transition-colors"
                    >
                      Unlink
                    </button>
                  </div>
                  
                  {state.partnerLink.status === 'pending' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={handleCopyCode}
                        className="flex-1 h-12 bg-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-600 active-press"
                      >
                        {codeCopied ? '✓ Copied!' : 'Copy Code'}
                      </button>
                      <button 
                        onClick={handleShareCode}
                        className="flex-1 h-12 bg-green-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest active-press"
                      >
                        Share via WhatsApp
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500 text-center">Link with your partner to share saved places and plan adventures together.</p>
                  
                  {showCodeInput ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input 
                          placeholder="Enter 6-digit code" 
                          className="flex-1 h-14 bg-slate-50 border-none rounded-2xl px-5 text-lg font-black text-center uppercase tracking-[0.2em] outline-none"
                          maxLength={6}
                          value={partnerCode}
                          onChange={e => setPartnerCode(e.target.value.toUpperCase())}
                        />
                        <button 
                          onClick={handleJoinWithCode}
                          disabled={partnerCode.length !== 6}
                          className="bg-sky-500 text-white px-6 rounded-2xl text-[11px] font-black uppercase tracking-widest active-press disabled:opacity-50"
                        >
                          Join
                        </button>
                      </div>
                      <button 
                        onClick={() => setShowCodeInput(false)}
                        className="w-full text-slate-400 text-xs font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        onClick={handleGenerateCode}
                        className="flex-1 h-14 bg-sky-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest active-press"
                      >
                        Generate Invite Code
                      </button>
                      <button 
                        onClick={() => setShowCodeInput(true)}
                        className="flex-1 h-14 bg-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-600 active-press"
                      >
                        I Have a Code
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {!isGuest && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Plan & Billing</h3>
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
              <button 
                onClick={() => setShowPlanBilling(true)}
                className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-xl">
                    {planTier === 'lifetime' ? '👑' : planTier === 'pro' ? '⭐' : '🌱'}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800">{getPlanDisplayName(planTier)} Plan</p>
                    <p className="text-xs text-slate-400">
                      {planTier === 'lifetime' ? 'Lifetime access' : 
                       planTier === 'pro' ? 'Annual subscription' : 
                       'Upgrade for unlimited features'}
                    </p>
                  </div>
                </div>
                <span className="text-slate-400">→</span>
              </button>
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

      {showPlanBilling && (
        <PlanBilling 
          state={state} 
          onClose={() => setShowPlanBilling(false)} 
          onUpdateState={onUpdateState}
        />
      )}
    </div>
  );
};

export default Profile;
