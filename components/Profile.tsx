import React, { useState, useEffect } from 'react';
import { AppState, Child, PartnerLink, Preferences, FOOD_PREFERENCES, ALLERGY_OPTIONS, ACCESSIBILITY_OPTIONS, ACTIVITY_PREFERENCES, PLAN_LIMITS } from '../types';
import PlanBilling from './PlanBilling';
import { getLimits, getPlanDisplayName, canUseAI, isPaidTier } from '../lib/entitlements';
import { storage, auth, db, collection, query, where, getDocs, doc, setDoc, ref, uploadBytes, getDownloadURL, writeBatch, deleteField, serverTimestamp } from '../lib/firebase';
import { ensurePartnerThread, getPartnerThreadId } from '../lib/partnerThreads';

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
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [adminTapCount, setAdminTapCount] = useState(0);
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
  const profilePicInputRef = React.useRef<HTMLInputElement>(null);
  const [profileDisplayName, setProfileDisplayName] = useState(state.profileInfo?.displayName || state.user?.displayName || '');
  const [profileAgeInput, setProfileAgeInput] = useState(
    state.profileInfo?.age ? String(state.profileInfo.age) : ''
  );

  useEffect(() => {
    setProfileDisplayName(state.profileInfo?.displayName || state.user?.displayName || '');
    setProfileAgeInput(state.profileInfo?.age ? String(state.profileInfo.age) : '');
  }, [state.profileInfo, state.user?.displayName]);

  const userPrefs = state.preferences || { foodPreferences: [], allergies: [], accessibility: [], activityPreferences: [] };
  const limits = getLimits(state.entitlement);
  const isPaid = isPaidTier(state.entitlement);
  const partnerLinkRequiresPro = import.meta.env.VITE_PARTNER_LINK_REQUIRES_PRO === 'true';
  const canLinkPartner = !partnerLinkRequiresPro || isPaidTier(state.entitlement);
  const aiInfo = canUseAI(state.entitlement, state.familyPool);
  const planTier = state.entitlement?.plan_tier || 'free';

  const FREE_PREF_LIMIT = limits.preferencesPerCategory;
  
  const toggleUserPref = (category: keyof Preferences, value: string) => {
    const current = userPrefs[category] as string[] || [];
    const isRemoving = current.includes(value);
    
    // Check if free user is at limit when adding
    if (!isRemoving && !isPaid && current.length >= FREE_PREF_LIMIT) {
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
      if (!isRemoving && !isPaid && current.length >= FREE_PREF_LIMIT) {
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
    if (!canLinkPartner) {
      setShowPlanBilling(true);
      return;
    }
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

  const handleAdminCode = async () => {
    const ADMIN_CODE = 'FAMPRO2026';
    if (adminCode.toUpperCase() === ADMIN_CODE) {
      if (!db || !auth?.currentUser) {
        alert('Please sign in first.');
        return;
      }
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const now = new Date();
        const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const proEntitlement = {
          plan_tier: 'pro',
          plan_status: 'active',
          entitlement_source: 'admin',
          entitlement_start_date: now.toISOString(),
          entitlement_end_date: null,
          ai_requests_this_month: 0,
          ai_requests_reset_date: resetDate.toISOString(),
        };
        await setDoc(userRef, { entitlement: proEntitlement }, { merge: true });
        onUpdateState('entitlement', proEntitlement);
        setAdminCode('');
        setShowAdminCode(false);
        alert('Pro features activated! You now have full access to test all features.');
      } catch (err) {
        console.error('Failed to apply admin code', err);
        alert('Failed to apply code. Please try again.');
      }
    } else {
      alert('Invalid code. Please try again.');
    }
  };

  const handleVersionTap = () => {
    setAdminTapCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 5) {
        setShowAdminCode(true);
        return 0;
      }
      return newCount;
    });
  };

  const handleJoinWithCode = async () => {
    if (!canLinkPartner) {
      alert('Partner linking is available on Pro or Family plans.');
      setShowPlanBilling(true);
      return;
    }
    if (!partnerCode || partnerCode.length !== 6) {
      alert('Please enter a valid 6-character code.');
      return;
    }
    if (!db || !auth?.currentUser) {
      alert('Please sign in to link with a partner.');
      return;
    }

    const normalizedCode = partnerCode.toUpperCase();
    console.log('[FamPals] Searching for partner with code:', normalizedCode);
    
    try {
      // Query for users who have this invite code in their partnerLink
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('partnerLink.inviteCode', '==', normalizedCode));
      console.log('[FamPals] Running partner code query...');
      const snap = await getDocs(q);
      console.log('[FamPals] Query returned', snap.docs.length, 'results');
      
      // Find a match that isn't the current user
      const match = snap.docs.find(docSnap => docSnap.id !== auth.currentUser?.uid);

      if (!match) {
        console.log('[FamPals] No partner found with code:', normalizedCode);
        alert('No partner found with this code. Please check and try again.');
        setPartnerCode('');
        return;
      }

      console.log('[FamPals] Found partner:', match.id);
      const partnerData = match.data() || {};
      const partnerProfile = partnerData.profile || {};
      const partnerName = partnerProfile.displayName || partnerProfile.email || 'Partner';
      const partnerEmail = partnerProfile.email || undefined;
      const partnerPhotoURL = partnerProfile.photoURL || undefined;
      const partnerUserId = match.id;

      // Update current user's partnerLink to accepted
      const partnerLink: PartnerLink = {
        inviteCode: normalizedCode,
        linkedAt: new Date().toISOString(),
        status: 'accepted',
        partnerName,
        partnerEmail,
        partnerPhotoURL,
        partnerUserId,
      };
      
      console.log('[FamPals] Updating current user partnerLink:', partnerLink);
      onUpdateState('partnerLink', partnerLink);
      setPartnerCode('');
      setShowCodeInput(false);

      // Update the partner's record to mark them as linked
      try {
        const selfProfileName = state.user?.displayName || state.user?.email || 'Partner';
        const partnerUpdate = {
          partnerLink: {
            status: 'accepted',
            linkedAt: new Date().toISOString(),
            partnerUserId: auth.currentUser.uid,
            partnerName: selfProfileName,
            partnerEmail: state.user?.email || undefined,
            partnerPhotoURL: state.user?.photoURL || undefined,
            inviteCode: normalizedCode,
          }
        };
        console.log('[FamPals] Updating partner record:', partnerUserId, partnerUpdate);
        await setDoc(doc(db, 'users', partnerUserId), partnerUpdate, { merge: true });
        await ensurePartnerThread(auth.currentUser.uid, partnerUserId);
        console.log('[FamPals] Partner link complete!');
        alert('Successfully linked with ' + partnerName + '! The Partner tab is now available.');
      } catch (err) {
        console.warn('[FamPals] Unable to update partner record:', err);
        alert('Linked locally, but could not update partner. They may need to refresh.');
      }
    } catch (err) {
      console.error('[FamPals] Partner lookup failed:', err);
      alert('Failed to find partner. Please try again.');
    }
  };

  const handleUnlinkPartner = async () => {
    if (!db || !auth?.currentUser?.uid) {
      onUpdateState('partnerLink', undefined);
      onUpdateState('spouseName', undefined);
      onUpdateState('linkedEmail', undefined);
      return;
    }
    const uid = auth.currentUser.uid;
    const partnerUserId = state.partnerLink?.partnerUserId;
    
    // If no partner linked yet (pending code), just clear locally and in Firestore
    if (!partnerUserId) {
      try {
        await setDoc(doc(db, 'users', uid), { partnerLink: deleteField() }, { merge: true });
        onUpdateState('partnerLink', undefined);
        onUpdateState('spouseName', undefined);
        onUpdateState('linkedEmail', undefined);
      } catch (err) {
        console.warn('Failed to clear pending code.', err);
        // Still clear local state
        onUpdateState('partnerLink', undefined);
        onUpdateState('spouseName', undefined);
        onUpdateState('linkedEmail', undefined);
      }
      return;
    }
    
    const threadId = getPartnerThreadId(uid, partnerUserId);
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', uid), { partnerLink: deleteField() }, { merge: true });
      batch.set(doc(db, 'partnerThreads', threadId), { status: 'closed', updatedAt: serverTimestamp() }, { merge: true });
      await batch.commit();
      onUpdateState('partnerLink', undefined);
      onUpdateState('spouseName', undefined);
      onUpdateState('linkedEmail', undefined);
    } catch (err) {
      console.warn('Failed to unlink partner.', err);
      alert('Unable to unlink right now. Please try again.');
    }
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

  const userName = state.profileInfo?.displayName || state.user?.displayName || 'Guest User';
  const userPhoto = state.user?.photoURL || 'https://picsum.photos/seed/guest/200';
  
  const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage || !auth?.currentUser) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo must be under 5MB');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    setUploadingProfilePic(true);
    try {
      const fileName = `profile_pictures/${auth.currentUser.uid}/avatar_${Date.now()}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      
      // Update user state with new photo URL
      if (state.user) {
        onUpdateState('user', { ...state.user, photoURL: downloadUrl });
      }
    } catch (error) {
      console.error('Profile picture upload failed:', error);
      alert('Failed to upload photo. Please try again.');
    }
    setUploadingProfilePic(false);
    if (profilePicInputRef.current) profilePicInputRef.current.value = '';
  };

  const handleSaveProfileInfo = () => {
    if (isGuest) {
      setView('login');
      return;
    }
    const trimmedName = profileDisplayName.trim();
    const parsedAge = profileAgeInput.trim() ? Number(profileAgeInput) : NaN;
    const payload = {
      ...(state.profileInfo || {}),
      displayName: trimmedName || undefined,
      age: Number.isFinite(parsedAge) ? parsedAge : undefined,
    };
    onUpdateState('profileInfo', payload);
  };

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
            <input
              ref={profilePicInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePicUpload}
              className="hidden"
            />
            <div 
              onClick={() => !isGuest && profilePicInputRef.current?.click()}
              className={`w-36 h-36 rounded-[56px] overflow-hidden border-8 border-white shadow-2xl shadow-slate-200 ${!isGuest ? 'cursor-pointer' : ''}`}
            >
              {uploadingProfilePic ? (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                  <span className="text-slate-400 text-sm font-bold">Uploading...</span>
                </div>
              ) : (
                <img src={userPhoto} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
              )}
            </div>
            <button 
              onClick={() => !isGuest && profilePicInputRef.current?.click()}
              disabled={isGuest || uploadingProfilePic}
              className={`absolute -bottom-2 -right-2 w-12 h-12 rounded-2xl flex items-center justify-center text-white border-4 border-[#F8FAFC] shadow-lg ${
                isGuest ? 'bg-slate-300 cursor-not-allowed' : 'bg-sky-500 hover:bg-sky-600 cursor-pointer'
              }`}
            >
              📸
            </button>
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-black text-[#1E293B]">{userName}</h2>
            <p className="text-sky-500 font-extrabold text-xs uppercase tracking-widest mt-1">Adventure Parent</p>
          </div>
        </div>

        {!isGuest && (
          <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Profile Basics</h3>
              <button
                onClick={handleSaveProfileInfo}
                className="text-xs font-bold text-sky-600"
              >
                Save
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={profileDisplayName}
                onChange={(e) => setProfileDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full h-12 rounded-2xl bg-slate-50 border border-slate-100 px-4 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-sky-200"
              />
              <input
                value={profileAgeInput}
                onChange={(e) => setProfileAgeInput(e.target.value)}
                placeholder="Age"
                type="number"
                min="0"
                className="w-full h-12 rounded-2xl bg-slate-50 border border-slate-100 px-4 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
            <p className="text-[11px] text-slate-400">These details help personalize your recommendations.</p>
          </div>
        )}

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
            <button 
              onClick={() => setView('login')}
              className="w-full bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm hover:shadow-md hover:border-sky-200 transition-all"
            >
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-8 h-8 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-slate-700 mb-2">Sign in to save your family</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                  Create an account to save your children's details and get personalized recommendations.
                </p>
                <p className="text-sky-500 font-semibold text-sm mt-4">Tap to sign in →</p>
              </div>
            </button>
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

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddChild();
                }}
                className="space-y-3"
              >
                <div className="flex gap-3">
                  <input 
                    placeholder="Child's Name" 
                    className="flex-1 h-14 bg-slate-50 border-none rounded-2xl px-5 text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-sky-100"
                    value={childName}
                    onChange={e => setChildName(e.target.value)}
                  />
                  <input 
                    placeholder="Age" 
                    type="number"
                    className="w-24 h-14 bg-slate-50 border-none rounded-2xl px-4 text-sm font-bold text-center outline-none focus:bg-white focus:ring-2 focus:ring-sky-100"
                    value={childAge}
                    onChange={e => setChildAge(e.target.value)}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full h-12 bg-sky-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-sky-100 active-press flex items-center justify-center gap-2"
                >
                  <span>+</span> Add Child
                </button>
              </form>
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
                  {!isPaid && (
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
                      {!isPaid && <span className="text-[9px] font-bold text-slate-400">{userPrefs.foodPreferences.length}/{FREE_PREF_LIMIT}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {FOOD_PREFERENCES.map(pref => {
                        const isSelected = userPrefs.foodPreferences.includes(pref);
                        const isDisabled = !isSelected && !isPaid && userPrefs.foodPreferences.length >= FREE_PREF_LIMIT;
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
                    <div className="space-y-2">
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
                      <p className="text-xs text-slate-400 text-center">Partner connected? The app updates automatically.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500 text-center">Link with your partner to share saved places and plan adventures together.</p>
                  
                  {!canLinkPartner ? (
                    <div className="space-y-3">
                      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
                        <p className="text-sm font-bold text-amber-700">Partner linking is a Pro or Family feature.</p>
                        <p className="text-xs text-amber-600 mt-1">Upgrade to start sharing places and memories.</p>
                      </div>
                      <button
                        onClick={() => setShowPlanBilling(true)}
                        className="w-full h-12 bg-amber-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest active-press"
                      >
                        View Plans
                      </button>
                    </div>
                  ) : showCodeInput ? (
                    <div className="space-y-3">
                      <input 
                        placeholder="Enter 6-digit code" 
                        className="w-full h-14 bg-slate-50 border-none rounded-2xl px-5 text-lg font-black text-center uppercase tracking-[0.2em] outline-none"
                        maxLength={6}
                        value={partnerCode}
                        onChange={e => setPartnerCode(e.target.value.toUpperCase())}
                      />
                      <button 
                        onClick={handleJoinWithCode}
                        disabled={partnerCode.length !== 6}
                        className="w-full h-14 bg-sky-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest active-press disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Join with Code
                      </button>
                      <button 
                        onClick={() => { setShowCodeInput(false); setPartnerCode(''); }}
                        className="w-full text-slate-400 text-sm font-medium py-2"
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
                    {planTier === 'lifetime' ? '👑' : planTier === 'family' ? 'F' : planTier === 'pro' ? '⭐' : '🌱'}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800">{getPlanDisplayName(planTier)} Plan</p>
                    <p className="text-xs text-slate-400">
                      {planTier === 'lifetime' ? 'Lifetime access' : 
                       planTier === 'family' ? 'Family pool active' :
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

        {showAdminCode && (
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-[32px] border border-purple-200 shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-black text-purple-600 uppercase tracking-widest">Admin Access</h3>
            <input
              type="text"
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value.toUpperCase())}
              placeholder="Enter admin code"
              className="w-full h-14 bg-white border border-purple-200 rounded-2xl px-5 text-lg font-black text-center uppercase tracking-[0.15em] outline-none focus:ring-2 focus:ring-purple-400"
              maxLength={10}
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdminCode}
                disabled={!adminCode.trim()}
                className="flex-1 h-12 bg-purple-500 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50"
              >
                Activate
              </button>
              <button
                onClick={() => { setShowAdminCode(false); setAdminCode(''); }}
                className="px-4 h-12 bg-slate-100 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500"
              >
                Cancel
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
        {!isGuest && (
          <div className="text-center py-4">
            <button
              onClick={handleVersionTap}
              className="text-xs text-slate-300 hover:text-slate-400 transition-colors"
            >
              FamPals v2.3
            </button>
          </div>
        )}
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
