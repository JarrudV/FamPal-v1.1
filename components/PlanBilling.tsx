import { useMemo } from 'react';
import { AppState, PLAN_LIMITS } from '../types';
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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-lg text-slate-800">Plans</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Close plans">
            <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="bg-gradient-to-br from-sky-50 to-indigo-50 rounded-2xl p-5 border border-sky-100">
            <h3 className="font-bold text-slate-800">{getPlanDisplayName(entitlement?.plan_tier || 'free')} Plan</h3>
            <p className="text-xs text-slate-500 mt-1">{statusLabel}</p>
            <div className="mt-4 pt-4 border-t border-sky-100 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Smart insights this month</span>
                <span className="font-semibold text-slate-800">{aiUsed} / {aiInfo.limit === -1 ? 'Unlimited' : aiInfo.limit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Remaining</span>
                <span className="font-semibold text-slate-800">{aiInfo.limit === -1 ? 'Unlimited' : aiInfo.remaining}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h4 className="font-bold text-slate-800">Free</h4>
            <p className="text-xs text-slate-500 mt-1">Great for getting started.</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>{PLAN_LIMITS.free.aiRequestsPerMonth} smart insights per calendar month</li>
              <li>Browse and discover places</li>
              <li>Save up to {PLAN_LIMITS.free.savedPlaces} places, {PLAN_LIMITS.free.circles} circle</li>
            </ul>
          </div>

          <div className="bg-white border-2 border-amber-200 rounded-2xl p-5">
            <h4 className="font-bold text-slate-800">Pro</h4>
            <p className="text-xs text-slate-500 mt-1">More planning power every month.</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>{PLAN_LIMITS.pro.aiRequestsPerMonth} smart insights per calendar month</li>
              <li>Unlimited saved places, circles, and memories</li>
            </ul>
            {isPaid ? (
              <p className="mt-4 text-xs font-semibold text-emerald-700">Pro is active on this account.</p>
            ) : (
              <button
                disabled
                className="mt-4 w-full py-3 bg-amber-100 text-amber-700 rounded-xl font-bold text-sm cursor-not-allowed"
              >
                Upgrade to Pro (Coming soon)
              </button>
            )}
          </div>

          <p className="text-xs text-slate-400 text-center">Payments are coming soon. No charges are processed in the app yet.</p>
        </div>
      </div>
    </div>
  );
}
