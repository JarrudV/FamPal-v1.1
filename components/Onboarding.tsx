import React, { useState, useCallback } from 'react';
import type { ExploreIntent, UserPreferences, Preferences, Child, PartnerLink, ProfileInfo } from '../types';
import { FOOD_PREFERENCES, ALLERGY_OPTIONS, ACTIVITY_PREFERENCES } from '../types';

interface OnboardingProps {
  userName?: string | null;
  initialProfileInfo?: ProfileInfo;
  initialUserPreferences?: UserPreferences;
  initialPreferences?: Preferences;
  initialChildren?: Child[];
  initialPartnerLink?: PartnerLink;
  onComplete: (result: {
    profileInfo?: ProfileInfo | null;
    preferences?: Preferences | null;
    children?: Child[] | null;
    userPreferences?: UserPreferences | null;
    partnerLink?: PartnerLink | null;
    skipped: boolean;
  }) => void;
}

const CATEGORY_OPTIONS: { key: ExploreIntent; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '?' },
  { key: 'eat_drink', label: 'Eat and drink', icon: '???' },
  { key: 'play_kids', label: 'Play and kids', icon: '??' },
  { key: 'outdoors', label: 'Outdoors', icon: '??' },
  { key: 'things_to_do', label: 'Things to do', icon: '???' },
  { key: 'sport_active', label: 'Sport and active', icon: '?' },
  { key: 'indoor', label: 'Indoor', icon: '???' },
];

const generateInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const getDefaultPreferences = (): Preferences => ({
  foodPreferences: [],
  allergies: [],
  accessibility: [],
  activityPreferences: [],
});

const STEP_GRADIENTS = [
  'from-sky-400 via-blue-500 to-indigo-600',
  'from-emerald-400 via-teal-500 to-cyan-600',
  'from-pink-400 via-rose-500 to-red-500',
  'from-violet-400 via-purple-500 to-indigo-600',
];

const Onboarding: React.FC<OnboardingProps> = ({
  userName,
  initialProfileInfo,
  initialUserPreferences,
  initialPreferences,
  initialChildren,
  initialPartnerLink,
  onComplete,
}) => {
  const [step, setStep] = useState(0);
  const [radiusKm, setRadiusKm] = useState(initialUserPreferences?.lastRadius || 10);
  const [category, setCategory] = useState<ExploreIntent>(initialUserPreferences?.lastCategory || 'all');
  const [profileName, setProfileName] = useState(initialProfileInfo?.displayName || userName || '');
  const [profileAge, setProfileAge] = useState(
    initialProfileInfo?.age ? String(initialProfileInfo.age) : ''
  );
  const [preferences, setPreferences] = useState<Preferences>({
    ...getDefaultPreferences(),
    ...(initialPreferences || {}),
  });
  const [children, setChildren] = useState<Child[]>(initialChildren || []);
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [partnerLink, setPartnerLink] = useState<PartnerLink | null>(initialPartnerLink || null);

  const totalSteps = 4;
  const isLastStep = step === totalSteps - 1;

  const handleSkip = () => {
    const result = buildResult(true);
    onComplete(result);
  };

  const handleNext = () => {
    if (isLastStep) {
      const result = buildResult(false);
      onComplete(result);
      return;
    }
    setStep((prev) => Math.min(prev + 1, totalSteps - 1));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const togglePreference = useCallback((key: keyof Preferences, value: string) => {
    setPreferences(prev => {
      const current = prev[key] || [];
      const exists = current.includes(value);
      const next = exists ? current.filter((item) => item !== value) : [...current, value];
      return { ...prev, [key]: next };
    });
  }, []);

  const handleAddChild = () => {
    if (!childName.trim() || !childAge.trim()) return;
    const ageNumber = childAge.trim() ? Number(childAge) : NaN;
    if (!Number.isFinite(ageNumber)) return;
    const newChild: Child = {
      id: Date.now().toString(),
      name: childName.trim(),
      age: ageNumber,
    };
    setChildren((prev) => [...prev, newChild]);
    setChildName('');
    setChildAge('');
  };

  const handleRemoveChild = (id: string) => {
    setChildren((prev) => prev.filter((child) => child.id !== id));
  };

  const handleGeneratePartnerLink = () => {
    if (partnerLink?.status === 'accepted') return;
    const code = partnerLink?.inviteCode || generateInviteCode();
    setPartnerLink({
      inviteCode: code,
      linkedAt: new Date().toISOString(),
      status: 'pending',
    });
  };

  const handleSharePartnerLink = () => {
    if (!partnerLink?.inviteCode) return;
    const message = `Join me on FamPals! Use my partner code: ${partnerLink.inviteCode}\n\nDownload the app: ${window.location.origin}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const buildResult = (skipped: boolean) => {
    const trimmedName = profileName.trim();
    const parsedAge = profileAge.trim() ? Number(profileAge) : NaN;
    const profileInfo: ProfileInfo | null = trimmedName || Number.isFinite(parsedAge)
      ? {
          displayName: trimmedName || undefined,
          age: Number.isFinite(parsedAge) ? parsedAge : undefined,
        }
      : null;

    return {
      profileInfo,
      preferences,
      children,
      userPreferences: {
        ...(initialUserPreferences || {}),
        lastRadius: radiusKm,
        lastCategory: category,
      },
      partnerLink: partnerLink?.inviteCode ? partnerLink : null,
      skipped,
    };
  };

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === step
                  ? 'w-8 bg-gradient-to-r ' + STEP_GRADIENTS[step]
                  : i < step
                  ? 'w-4 bg-slate-300'
                  : 'w-4 bg-slate-200'
              }`}
            />
          ))}
        </div>
        <button onClick={handleSkip} className="text-xs font-semibold text-slate-400 active:text-slate-600 px-2 py-1">
          Skip
        </button>
      </div>

      <div className="flex-1 flex flex-col" key={step}>
        {step === 0 && <StepWelcome
          userName={userName}
          profileName={profileName}
          setProfileName={setProfileName}
          profileAge={profileAge}
          setProfileAge={setProfileAge}
        />}
        {step === 1 && <StepFeatures />}
        {step === 2 && <StepFamily
          children={children}
          childName={childName}
          setChildName={setChildName}
          childAge={childAge}
          setChildAge={setChildAge}
          handleAddChild={handleAddChild}
          handleRemoveChild={handleRemoveChild}
          partnerLink={partnerLink}
          handleGeneratePartnerLink={handleGeneratePartnerLink}
          handleSharePartnerLink={handleSharePartnerLink}
        />}
        {step === 3 && <StepPreferences
          radiusKm={radiusKm}
          setRadiusKm={setRadiusKm}
          category={category}
          setCategory={setCategory}
          preferences={preferences}
          togglePreference={togglePreference}
        />}
      </div>

      <div className="px-6 pb-8 pt-4">
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={handleBack}
              className="h-14 w-14 flex items-center justify-center rounded-2xl border-2 border-slate-200 active:scale-95 transition-all"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-slate-500">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <button
            onClick={handleNext}
            className={`flex-1 h-14 rounded-2xl text-sm font-bold text-white active:scale-[0.98] transition-all shadow-lg bg-gradient-to-r ${STEP_GRADIENTS[step]}`}
          >
            {isLastStep ? "Let's Go!" : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

const StepWelcome: React.FC<{
  userName?: string | null;
  profileName: string;
  setProfileName: (v: string) => void;
  profileAge: string;
  setProfileAge: (v: string) => void;
}> = ({ userName, profileName, setProfileName, profileAge, setProfileAge }) => (
  <div className="flex-1 flex flex-col px-6 pt-4 pb-2">
    <div className="flex flex-col items-center text-center mb-8">
      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center mb-6 shadow-xl shadow-sky-200/50">
        <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
      </div>
      <h1 className="text-3xl font-black text-slate-900 mb-2">
        Welcome{userName ? `, ${userName.split(' ')[0]}` : ''}!
      </h1>
      <p className="text-base text-slate-500 max-w-xs leading-relaxed">
        Let's set up your family profile so we can find the best activities near you.
      </p>
    </div>

    <div className="space-y-4 flex-1">
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">What should we call you?</label>
        <input
          value={profileName}
          onChange={(e) => setProfileName(e.target.value)}
          placeholder="Your name"
          className="w-full h-14 rounded-2xl bg-slate-50 border-2 border-slate-100 px-5 text-base font-semibold text-slate-700 outline-none focus:border-sky-300 focus:bg-white transition-all"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Your age (optional)</label>
        <input
          type="number"
          min="0"
          value={profileAge}
          onChange={(e) => setProfileAge(e.target.value)}
          placeholder="e.g. 34"
          className="w-full h-14 rounded-2xl bg-slate-50 border-2 border-slate-100 px-5 text-base font-semibold text-slate-700 outline-none focus:border-sky-300 focus:bg-white transition-all"
        />
      </div>
    </div>
  </div>
);

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string; gradient: string; delay: number }> = ({
  icon, title, description, gradient, delay,
}) => (
  <div
    className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-md text-white`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>
    </div>
  </div>
);

const StepFeatures: React.FC = () => (
  <div className="flex-1 flex flex-col px-6 pt-4 pb-2">
    <div className="flex flex-col items-center text-center mb-6">
      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-600 flex items-center justify-center mb-6 shadow-xl shadow-emerald-200/50">
        <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>
      </div>
      <h1 className="text-2xl font-black text-slate-900 mb-2">
        Here's what you can do
      </h1>
      <p className="text-sm text-slate-500 max-w-xs">
        Everything you need for family adventures, in one place.
      </p>
    </div>

    <div className="space-y-3 flex-1">
      <FeatureCard
        icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>}
        title="Discover Places"
        description="Find family-friendly restaurants, parks, trails and more nearby."
        gradient="from-sky-400 to-blue-500"
        delay={0}
      />
      <FeatureCard
        icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>}
        title="Save & Track"
        description="Bookmark favourites and log your family adventures."
        gradient="from-rose-400 to-pink-500"
        delay={100}
      />
      <FeatureCard
        icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>}
        title="Circles & Sharing"
        description="Create groups with friends and family to share recommendations."
        gradient="from-amber-400 to-orange-500"
        delay={200}
      />
      <FeatureCard
        icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>}
        title="AI Suggestions"
        description="Get personalised activity ideas powered by AI."
        gradient="from-violet-400 to-purple-500"
        delay={300}
      />
    </div>
  </div>
);

const StepFamily: React.FC<{
  children: Child[];
  childName: string;
  setChildName: (v: string) => void;
  childAge: string;
  setChildAge: (v: string) => void;
  handleAddChild: () => void;
  handleRemoveChild: (id: string) => void;
  partnerLink: PartnerLink | null;
  handleGeneratePartnerLink: () => void;
  handleSharePartnerLink: () => void;
}> = ({
  children, childName, setChildName, childAge, setChildAge,
  handleAddChild, handleRemoveChild,
  partnerLink, handleGeneratePartnerLink, handleSharePartnerLink,
}) => (
  <div className="flex-1 flex flex-col px-6 pt-4 pb-2 overflow-y-auto">
    <div className="flex flex-col items-center text-center mb-6">
      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-pink-400 to-red-500 flex items-center justify-center mb-6 shadow-xl shadow-pink-200/50">
        <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
      </div>
      <h1 className="text-2xl font-black text-slate-900 mb-2">
        Your Family
      </h1>
      <p className="text-sm text-slate-500 max-w-xs">
        Add your kids so we can recommend age-appropriate activities.
      </p>
    </div>

    <div className="space-y-4 flex-1">
      <div className="bg-slate-50 rounded-3xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700">Kids</h3>
          <span className="text-xs font-semibold text-slate-400 bg-white px-3 py-1 rounded-full">{children.length} added</span>
        </div>

        {children.length > 0 && (
          <div className="space-y-2">
            {children.map(child => (
              <div key={child.id} className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-300 to-rose-400 flex items-center justify-center text-white text-sm font-bold">
                    {child.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">{child.name}</p>
                    <p className="text-[11px] text-slate-400">{child.age} {child.age === 1 ? 'year' : 'years'} old</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveChild(child.id)}
                  className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center active:scale-90 transition-all"
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-rose-400">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="Name"
            className="flex-1 h-12 rounded-2xl bg-white border-2 border-slate-100 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-pink-300 transition-all"
          />
          <input
            value={childAge}
            onChange={(e) => setChildAge(e.target.value)}
            placeholder="Age"
            type="number"
            min="0"
            className="w-20 h-12 rounded-2xl bg-white border-2 border-slate-100 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-pink-300 transition-all text-center"
          />
          <button
            onClick={handleAddChild}
            className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 text-white flex items-center justify-center shadow-md active:scale-90 transition-all flex-shrink-0"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="bg-slate-50 rounded-3xl p-5 space-y-3">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-700">Partner Link</h3>
            <p className="text-[11px] text-slate-400">Share favourites and plan together</p>
          </div>
        </div>

        {partnerLink?.status === 'accepted' ? (
          <div className="bg-green-50 rounded-2xl p-4 text-center">
            <p className="text-sm font-semibold text-green-700">Partner linked</p>
          </div>
        ) : partnerLink?.inviteCode ? (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Your invite code</p>
              <div className="text-2xl font-black text-violet-600 tracking-[0.3em]">{partnerLink.inviteCode}</div>
            </div>
            <button
              onClick={handleSharePartnerLink}
              className="w-full h-12 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-md active:scale-[0.98] transition-all"
            >
              Share via WhatsApp
            </button>
          </div>
        ) : (
          <button
            onClick={handleGeneratePartnerLink}
            className="w-full h-12 bg-white border-2 border-dashed border-violet-200 text-violet-500 rounded-2xl text-xs font-bold uppercase tracking-wider active:scale-[0.98] transition-all"
          >
            Generate Invite Code
          </button>
        )}
        <p className="text-[10px] text-slate-400 text-center">You can always do this later in your Profile</p>
      </div>
    </div>
  </div>
);

const StepPreferences: React.FC<{
  radiusKm: number;
  setRadiusKm: (v: number) => void;
  category: ExploreIntent;
  setCategory: (v: ExploreIntent) => void;
  preferences: Preferences;
  togglePreference: (key: keyof Preferences, value: string) => void;
}> = ({ radiusKm, setRadiusKm, category, setCategory, preferences, togglePreference }) => (
  <div className="flex-1 flex flex-col px-6 pt-4 pb-2 overflow-y-auto">
    <div className="flex flex-col items-center text-center mb-6">
      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-violet-400 to-indigo-600 flex items-center justify-center mb-6 shadow-xl shadow-violet-200/50">
        <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
      </div>
      <h1 className="text-2xl font-black text-slate-900 mb-2">
        Your Preferences
      </h1>
      <p className="text-sm text-slate-500 max-w-xs">
        Help us personalise your experience. You can change these anytime.
      </p>
    </div>

    <div className="space-y-5 flex-1">
      <div className="bg-slate-50 rounded-3xl p-5 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Search Radius</label>
            <span className="text-sm font-black text-violet-600 bg-violet-50 px-3 py-1 rounded-full">{radiusKm} km</span>
          </div>
          <input
            type="range"
            min="1"
            max="200"
            value={radiusKm}
            onChange={(e) => setRadiusKm(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-500"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-slate-400">1 km</span>
            <span className="text-[10px] text-slate-400">200 km</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">Default Category</label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORY_OPTIONS.map(option => (
              <button
                key={option.key}
                onClick={() => setCategory(option.key)}
                className={`flex flex-col items-center gap-1 py-3 rounded-2xl text-[10px] font-bold transition-all active:scale-95 ${
                  category === option.key
                    ? 'bg-gradient-to-br from-violet-400 to-indigo-500 text-white shadow-md'
                    : 'bg-white text-slate-500 border border-slate-100'
                }`}
              >
                <span className="text-lg">{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-3xl p-5 space-y-5">
        <PreferenceSection
          title="Eating Habits"
          options={FOOD_PREFERENCES}
          selected={preferences.foodPreferences}
          onToggle={(v) => togglePreference('foodPreferences', v)}
          activeColor="bg-emerald-500"
        />
        <PreferenceSection
          title="Allergies"
          options={ALLERGY_OPTIONS}
          selected={preferences.allergies}
          onToggle={(v) => togglePreference('allergies', v)}
          activeColor="bg-rose-500"
        />
        <PreferenceSection
          title="Activities You Love"
          options={ACTIVITY_PREFERENCES}
          selected={preferences.activityPreferences}
          onToggle={(v) => togglePreference('activityPreferences', v)}
          activeColor="bg-violet-500"
        />
      </div>
    </div>
  </div>
);

const PreferenceSection: React.FC<{
  title: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
  activeColor: string;
}> = ({ title, options, selected, onToggle, activeColor }) => (
  <div>
    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">{title}</label>
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onToggle(opt)}
          className={`px-3.5 py-2 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
            selected.includes(opt)
              ? `${activeColor} text-white shadow-sm`
              : 'bg-white text-slate-500 border border-slate-100'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  </div>
);

export default Onboarding;

