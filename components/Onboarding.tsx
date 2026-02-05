import React, { useMemo, useState } from 'react';
import type { ActivityType, UserPreferences, Preferences, Child, PartnerLink, ProfileInfo } from '../types';
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

const CATEGORY_OPTIONS: { key: ActivityType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'restaurant', label: 'Food' },
  { key: 'outdoor', label: 'Outdoors' },
  { key: 'indoor', label: 'Indoor' },
  { key: 'active', label: 'Active' },
  { key: 'hike', label: 'Hike' },
  { key: 'wine', label: 'Wine' },
  { key: 'golf', label: 'Golf' },
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
  const [category, setCategory] = useState<ActivityType>(initialUserPreferences?.lastCategory || 'all');
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

  const steps = useMemo(() => ([
    { title: 'Welcome', subtitle: `Hi ${userName || 'there'}! Let’s get FamPals set up for you.` },
    { title: 'Core Features', subtitle: 'Discover places, save favorites, and track adventures.' },
    { title: 'Circles', subtitle: 'Create circles to share places with friends and family.' },
    { title: 'AI + Pro', subtitle: 'Get tailored suggestions with AI. Pro unlocks more power.' },
    { title: 'Partner Linking', subtitle: 'Link with a partner to share favorites and notes.' },
    { title: 'Preferences', subtitle: 'Set your defaults and add dependants.' },
  ]), [userName]);

  const isLastStep = step === steps.length - 1;

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
    setStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const togglePreference = (key: keyof Preferences, value: string) => {
    const current = preferences[key] || [];
    const exists = current.includes(value);
    const next = exists ? current.filter((item) => item !== value) : [...current, value];
    setPreferences({ ...preferences, [key]: next });
  };

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
    <div className="min-h-screen bg-[#F8FAFC] px-6 py-8 flex flex-col">
      <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-widest">
        <span>Step {step + 1} / {steps.length}</span>
        <button onClick={handleSkip} className="text-slate-500 hover:text-slate-700">Skip</button>
      </div>

      <div className="mt-8 flex-1 flex flex-col gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <h2 className="text-xl font-black text-slate-800">{steps[step].title}</h2>
          <p className="text-sm text-slate-500 mt-2">{steps[step].subtitle}</p>
        </div>

        {step === 0 && (
          <div className="bg-white rounded-3xl p-6 border border-slate-100 space-y-4">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Your Name</p>
              <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Enter your name"
                className="w-full h-12 rounded-2xl bg-slate-50 border border-slate-100 px-4 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Your Age</p>
              <input
                type="number"
                min="0"
                value={profileAge}
                onChange={(e) => setProfileAge(e.target.value)}
                placeholder="Optional"
                className="w-full h-12 rounded-2xl bg-slate-50 border border-slate-100 px-4 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
            <p className="text-[11px] text-slate-400">You can edit these later in Profile.</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3 text-sm text-slate-600">
            <div className="bg-white rounded-2xl p-4 border border-slate-100">Explore nearby family-friendly places with smart filters.</div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100">Save favorites and track visits for easy planning.</div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100">Share memories and invite others into circles.</div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-2xl p-5 border border-slate-100 text-sm text-slate-600">
            Circles help you collect places by theme and share them with friends, family, or your partner.
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-2xl p-5 border border-slate-100 text-sm text-slate-600">
            Ask AI for tailored ideas. Pro unlocks higher limits and more features.
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-100 text-sm text-slate-600">
              Link a partner to share favorites, memories, and quick notes together.
            </div>
            <div className="bg-white rounded-3xl p-5 border border-slate-100 space-y-3">
              {partnerLink?.status === 'accepted' ? (
                <p className="text-sm text-slate-600">Partner already linked.</p>
              ) : partnerLink?.inviteCode ? (
                <>
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Your Invite Code</p>
                    <div className="text-2xl font-black text-sky-600 tracking-[0.3em] text-center">
                      {partnerLink.inviteCode}
                    </div>
                  </div>
                  <button
                    onClick={handleSharePartnerLink}
                    className="w-full h-12 bg-green-500 text-white rounded-2xl text-xs font-bold uppercase tracking-widest"
                  >
                    Share via WhatsApp
                  </button>
                </>
              ) : (
                <button
                  onClick={handleGeneratePartnerLink}
                  className="w-full h-12 bg-sky-500 text-white rounded-2xl text-xs font-bold uppercase tracking-widest"
                >
                  Generate Invite Code
                </button>
              )}
              <p className="text-[11px] text-slate-400">You can manage partner linking later in Profile.</p>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 space-y-4">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Search Radius</p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-700">{radiusKm} km</span>
                  <span className="text-[10px] text-slate-400">1 - 200 km</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="200"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
              </div>

              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Starting Category</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map(option => (
                    <button
                      key={option.key}
                      onClick={() => setCategory(option.key)}
                      className={`px-3 py-2 rounded-full text-[11px] font-bold transition-all ${
                        category === option.key
                          ? 'bg-sky-500 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-100 space-y-5">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Eating Habits</p>
                <div className="flex flex-wrap gap-2">
                  {FOOD_PREFERENCES.map(pref => (
                    <button
                      key={pref}
                      onClick={() => togglePreference('foodPreferences', pref)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                        preferences.foodPreferences.includes(pref)
                          ? 'bg-green-500 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {pref}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Allergies</p>
                <div className="flex flex-wrap gap-2">
                  {ALLERGY_OPTIONS.map(pref => (
                    <button
                      key={pref}
                      onClick={() => togglePreference('allergies', pref)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                        preferences.allergies.includes(pref)
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
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Activity Preferences</p>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_PREFERENCES.map(pref => (
                    <button
                      key={pref}
                      onClick={() => togglePreference('activityPreferences', pref)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                        preferences.activityPreferences.includes(pref)
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

            <div className="bg-white rounded-3xl p-6 border border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Dependants</h3>
                <span className="text-[10px] text-slate-400">{children.length} added</span>
              </div>

              {children.length > 0 && (
                <div className="space-y-2">
                  {children.map(child => (
                    <div key={child.id} className="flex items-center justify-between bg-slate-50 rounded-2xl px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{child.name}</p>
                        <p className="text-[10px] text-slate-400">Age {child.age}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveChild(child.id)}
                        className="text-xs font-bold text-rose-500"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="Child name"
                  className="flex-1 h-12 rounded-2xl bg-slate-50 border border-slate-100 px-4 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-sky-200"
                />
                <input
                  value={childAge}
                  onChange={(e) => setChildAge(e.target.value)}
                  placeholder="Age"
                  type="number"
                  min="0"
                  className="w-24 h-12 rounded-2xl bg-slate-50 border border-slate-100 px-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <button
                onClick={handleAddChild}
                className="w-full h-12 bg-slate-900 text-white rounded-2xl text-xs font-bold uppercase tracking-widest"
              >
                Add dependant
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mt-6">
        {step > 0 && (
          <button
            onClick={handleBack}
            className="flex-1 h-12 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-500"
          >
            Back
          </button>
        )}
        <button
          onClick={handleNext}
          className="flex-1 h-12 bg-slate-900 text-white rounded-2xl text-sm font-bold"
        >
          {isLastStep ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
