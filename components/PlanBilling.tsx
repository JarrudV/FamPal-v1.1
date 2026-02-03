import { useState } from 'react';
import { AppState, Entitlement, PLAN_LIMITS, PLAN_PRICES, PlanTier } from '../types';
import { getLimits, getPlanDisplayName, canUseAI } from '../lib/entitlements';

interface PlanBillingProps {
  state: AppState;
  onClose: () => void;
  onUpdateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
}

const API_BASE = '';

export default function PlanBilling({ state, onClose, onUpdateState }: PlanBillingProps) {
  const [loading, setLoading] = useState<'pro' | 'lifetime' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const entitlement = state.entitlement;
  const currentTier = entitlement?.plan_tier || 'free';
  const limits = getLimits(entitlement);
  const aiInfo = canUseAI(entitlement);

  const handleUpgrade = async (plan: 'pro' | 'lifetime') => {
    if (!state.user?.email || !state.user?.uid) {
      setError('Please sign in to upgrade');
      return;
    }

    setLoading(plan);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/paystack/init-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: state.user.uid,
          email: state.user.email,
          plan,
        }),
      });

      const data = await response.json();

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        setError(data.error || 'Failed to initialize payment');
      }
    } catch (err) {
      setError('Payment initialization failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!state.user?.uid) return;

    setCancelLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/subscription/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: state.user.uid }),
      });

      const data = await response.json();
      if (data.success) {
        onUpdateState('entitlement', {
          ...entitlement!,
          plan_status: 'cancelled',
        });
      } else {
        setError(data.error || 'Failed to cancel subscription');
      }
    } catch (err) {
      setError('Cancellation failed. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  const isPro = currentTier === 'pro' && entitlement?.plan_status === 'active';
  const isLifetime = currentTier === 'lifetime';
  const isPaid = isPro || isLifetime;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-lg text-slate-800">Plan & Billing</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
            <span className="text-slate-500">✕</span>
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div className="bg-gradient-to-br from-sky-50 to-indigo-50 rounded-2xl p-5 border border-sky-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm">
                {isLifetime ? '👑' : isPro ? '⭐' : '🌱'}
              </div>
              <div>
                <h3 className="font-bold text-slate-800">{getPlanDisplayName(currentTier)} Plan</h3>
                <p className="text-xs text-slate-500">
                  {isLifetime ? 'Lifetime access - never expires' :
                   isPro ? `Renews ${entitlement?.entitlement_end_date ? new Date(entitlement.entitlement_end_date).toLocaleDateString() : 'annually'}` :
                   'Free tier with usage limits'}
                </p>
              </div>
            </div>

            {isPaid && (
              <div className="mt-4 pt-4 border-t border-sky-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">AI questions this month</span>
                  <span className="font-medium text-slate-800">
                    {entitlement?.ai_requests_this_month || 0} / {aiInfo.limit === -1 ? '∞' : aiInfo.limit}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Saved places</span>
                  <span className="font-medium text-slate-800">Unlimited</span>
                </div>
              </div>
            )}
          </div>

          {!isPaid && (
            <>
              <div className="space-y-3">
                <div className="bg-white border-2 border-amber-200 rounded-2xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    POPULAR
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-xl">⭐</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800">Pro</h4>
                      <p className="text-2xl font-bold text-amber-600 mt-1">{PLAN_PRICES.pro.label}</p>
                      <ul className="mt-3 space-y-2 text-sm text-slate-600">
                        <li className="flex items-center gap-2">✓ Unlimited saved places</li>
                        <li className="flex items-center gap-2">✓ Unlimited notebook entries</li>
                        <li className="flex items-center gap-2">✓ 100 AI questions/month</li>
                        <li className="flex items-center gap-2">✓ Unlimited memories</li>
                        <li className="flex items-center gap-2">✓ Unlimited circles</li>
                      </ul>
                      <button
                        onClick={() => handleUpgrade('pro')}
                        disabled={loading === 'pro'}
                        className="mt-4 w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm shadow-lg disabled:opacity-50"
                      >
                        {loading === 'pro' ? 'Processing...' : 'Upgrade to Pro'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-xl">👑</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800">Lifetime</h4>
                      <p className="text-2xl font-bold text-purple-600 mt-1">{PLAN_PRICES.lifetime.label}</p>
                      <ul className="mt-3 space-y-2 text-sm text-slate-600">
                        <li className="flex items-center gap-2">✓ Everything in Pro</li>
                        <li className="flex items-center gap-2">✓ 200 AI questions/month</li>
                        <li className="flex items-center gap-2">✓ Pay once, yours forever</li>
                        <li className="flex items-center gap-2">✓ Future features included</li>
                      </ul>
                      <button
                        onClick={() => handleUpgrade('lifetime')}
                        disabled={loading === 'lifetime'}
                        className="mt-4 w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg disabled:opacity-50"
                      >
                        {loading === 'lifetime' ? 'Processing...' : 'Get Lifetime Access'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="font-semibold text-slate-700 text-sm mb-2">Free Plan Limits</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>Saved places: {PLAN_LIMITS.free.savedPlaces}</div>
                  <div>Notebook: {PLAN_LIMITS.free.notebookEntries}</div>
                  <div>AI/month: {PLAN_LIMITS.free.aiRequestsPerMonth}</div>
                  <div>Memories: {PLAN_LIMITS.free.memories}</div>
                  <div>Circles: {PLAN_LIMITS.free.circles}</div>
                </div>
              </div>
            </>
          )}

          {isPro && entitlement?.paystack_subscription_code && (
            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="font-semibold text-slate-700 text-sm mb-2">Manage Subscription</h4>
              <button
                onClick={handleCancel}
                disabled={cancelLoading}
                className="text-sm text-red-600 underline disabled:opacity-50"
              >
                {cancelLoading ? 'Cancelling...' : 'Cancel subscription'}
              </button>
              <p className="text-xs text-slate-500 mt-1">
                You'll keep Pro features until the end of your billing period.
              </p>
            </div>
          )}

          {isLifetime && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 text-center">
              <p className="text-sm text-purple-700 font-medium">
                🎉 You have lifetime access! Thank you for your support.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}

          <p className="text-xs text-slate-400 text-center">
            Secure payments powered by Paystack. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
