import { PLAN_PRICES, PlanTier } from '../types';

interface UpgradePromptProps {
  feature: string;
  currentLimit: number;
  onUpgrade: () => void;
  compact?: boolean;
}

export function UpgradePrompt({ feature, currentLimit, onUpgrade, compact = false }: UpgradePromptProps) {
  if (compact) {
    return (
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-100">
        <p className="text-xs text-amber-700">
          You've reached the free limit of {currentLimit} {feature}.{' '}
          <button 
            onClick={onUpgrade}
            className="font-semibold text-amber-800 underline"
          >
            Upgrade for more
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 rounded-2xl p-5 border border-amber-100 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0 text-amber-500">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-amber-800 text-sm">
            Free limit reached
          </p>
          <p className="text-xs text-amber-600 mt-1">
            You've used all {currentLimit} free {feature}. Upgrade to Pro for unlimited access.
          </p>
          <button 
            onClick={onUpgrade}
            className="mt-3 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold text-xs shadow-md hover:shadow-lg transition-shadow"
          >
            Upgrade to Pro - {PLAN_PRICES.pro.label}
          </button>
        </div>
      </div>
    </div>
  );
}

interface LimitIndicatorProps {
  current: number;
  limit: number;
  label: string;
  showUpgrade?: boolean;
  onUpgrade?: () => void;
}

export function LimitIndicator({ current, limit, label, showUpgrade, onUpgrade }: LimitIndicatorProps) {
  const isUnlimited = limit === Infinity || limit === -1;
  const isAtLimit = !isUnlimited && current >= limit;
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-500">{label}:</span>
      {isUnlimited ? (
        <span className="text-emerald-600 font-medium">Unlimited</span>
      ) : (
        <>
          <span className={isAtLimit ? 'text-amber-600 font-medium' : 'text-slate-700'}>
            {current}/{limit}
          </span>
          {isAtLimit && showUpgrade && onUpgrade && (
            <button 
              onClick={onUpgrade}
              className="text-amber-600 underline font-medium"
            >
              Upgrade
            </button>
          )}
        </>
      )}
    </div>
  );
}

interface AILimitBadgeProps {
  remaining: number;
  limit: number;
}

export function AILimitBadge({ remaining, limit }: AILimitBadgeProps) {
  const isUnlimited = limit === -1;
  
  if (isUnlimited) {
    return (
      <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-medium">
        Unlimited AI
      </span>
    );
  }
  
  const isLow = remaining <= 3;
  
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
      isLow 
        ? 'text-amber-700 bg-amber-50' 
        : 'text-sky-700 bg-sky-50'
    }`}>
      {remaining} AI {remaining === 1 ? 'question' : 'questions'} left
    </span>
  );
}
