import { useMemo } from 'react';
import { AppState, PLAN_LIMITS, GOOGLE_PLAY_SUBSCRIPTION_URL } from '../types';
import { canUseAI, getPlanDisplayName, isPaidTier } from '../lib/entitlements';

interface PlanBillingProps {
  state: AppState;
  onClose: () => void;
  onUpdateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
}

export default function PlanBilling({ state, onClose }: PlanBillingProps) {
  const entitlement = state.entitlement;
  const aiInfo = canUseAI(entitlement, state.familyPool);
  const aiUsed = entitlement?.gemini_credits_used ?? entitlement?.ai_requests_this_month ?? 0;
  const currentTier = entitlement?.subscription_tier || entitlement?.plan_tier || 'free';
  const isPaid = isPaidTier(entitlement);

  const statusLabel = useMemo(() => {
    if (currentTier === 'admin') return 'Admin tester access';
    if (currentTier === 'pro' || currentTier === 'family' || currentTier === 'lifetime') return 'Pro monthly entitlement';
    return 'Free tier';
  }, [currentTier]);

  const handleUpgradeToPlayStore = () => {
    window.open(GOOGLE_PLAY_SUBSCRIPTION_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-900 p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-lg text-slate-800 dark:text-white">Plans</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center" aria-label="Close plans">
            <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-900/30 dark:to-fuchsia-900/30 rounded-2xl p-5 border border-purple-100 dark:border-purple-800">
            <h3 className="font-bold text-slate-800 dark:text-white">{getPlanDisplayName(entitlement?.plan_tier || 'free')} Plan</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{statusLabel}</p>
            <div className="mt-4 pt-4 border-t border-purple-100 dark:border-purple-800 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Smart insights this month</span>
                <span className="font-semibold text-slate-800 dark:text-white">{aiUsed} / {aiInfo.limit === -1 ? 'Unlimited' : aiInfo.limit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Remaining</span>
                <span className="font-semibold text-slate-800 dark:text-white">{aiInfo.limit === -1 ? 'Unlimited' : aiInfo.remaining}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
            <h4 className="font-bold text-slate-800 dark:text-white">Free</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Great for getting started.</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                {PLAN_LIMITS.free.aiRequestsPerMonth} smart insights per month
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                Save up to {PLAN_LIMITS.free.savedPlaces} places
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                {PLAN_LIMITS.free.circles} Friend Circle
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                Browse and discover places
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-purple-50 via-fuchsia-50 to-pink-50 dark:from-purple-900/20 dark:via-fuchsia-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-3 right-3 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">BEST VALUE</div>
            <h4 className="font-bold text-slate-800 dark:text-white">Pro</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Unlock everything. Less than a coffee.</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                {PLAN_LIMITS.pro.aiRequestsPerMonth} smart insights per month
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                Unlimited saved places
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                Unlimited circles and memories
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                Unlimited partner favourites
              </li>
            </ul>
            {isPaid ? (
              <p className="mt-4 text-xs font-semibold text-emerald-700 dark:text-emerald-400">Pro is active on this account.</p>
            ) : (
              <button
                onClick={handleUpgradeToPlayStore}
                className="mt-4 w-full py-3.5 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-shadow active:scale-[0.98]"
              >
                Upgrade to Pro on Google Play
              </button>
            )}
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">Subscriptions are managed through Google Play Store. Cancel anytime.</p>
        </div>
      </div>
    </div>
  );
}
