import { Entitlement, PlanTier, PLAN_LIMITS, getDefaultEntitlement } from '../types';

export function getLimits(entitlement: Entitlement | undefined) {
  const tier = entitlement?.plan_tier || 'free';
  const status = entitlement?.plan_status || 'active';
  
  if (status === 'expired' || status === 'cancelled') {
    return PLAN_LIMITS.free;
  }
  
  return PLAN_LIMITS[tier];
}

export function isPaidTier(entitlement: Entitlement | undefined): boolean {
  if (!entitlement) return false;
  const { plan_tier, plan_status } = entitlement;
  return (plan_tier === 'pro' || plan_tier === 'family' || plan_tier === 'lifetime') && plan_status === 'active';
}

interface FeatureCheck {
  allowed: boolean;
  remaining: number;
  limit: number;
}

export function canSavePlace(entitlement: Entitlement | undefined, currentCount: number): FeatureCheck {
  const limits = getLimits(entitlement);
  const limit = limits.savedPlaces;
  const remaining = Math.max(0, limit - currentCount);
  return { allowed: currentCount < limit, remaining, limit };
}

export function canAddNotebookEntry(entitlement: Entitlement | undefined, currentCount: number): FeatureCheck {
  const limits = getLimits(entitlement);
  const limit = limits.notebookEntries;
  const remaining = Math.max(0, limit - currentCount);
  return { allowed: currentCount < limit, remaining, limit };
}

export function canAddMemory(entitlement: Entitlement | undefined, currentCount: number): FeatureCheck {
  const limits = getLimits(entitlement);
  const limit = limits.memories;
  const remaining = Math.max(0, limit - currentCount);
  return { allowed: currentCount < limit, remaining, limit };
}

export function canCreateCircle(entitlement: Entitlement | undefined, currentCount: number): FeatureCheck {
  const limits = getLimits(entitlement);
  const limit = limits.circles;
  const remaining = Math.max(0, limit - currentCount);
  return { allowed: currentCount < limit, remaining, limit };
}

export function canUseAI(
  entitlement: Entitlement | undefined,
  poolUsage?: { ai_requests_this_month?: number; ai_requests_reset_date?: string } | null
): { allowed: boolean; remaining: number; limit: number } {
  const limits = getLimits(entitlement);
  const limit = limits.aiRequestsPerMonth;
  const used = entitlement?.plan_tier === 'family' && poolUsage
    ? (poolUsage.ai_requests_this_month || 0)
    : (entitlement?.ai_requests_this_month || 0);
  const remaining = Math.max(0, limit - used);
  const unlimited = limit === Infinity;
  return {
    allowed: unlimited ? true : remaining > 0,
    remaining,
    limit: unlimited ? -1 : limit
  };
}

export function canAddPreference(entitlement: Entitlement | undefined, currentCount: number): FeatureCheck {
  const limits = getLimits(entitlement);
  const limit = limits.preferencesPerCategory;
  const remaining = Math.max(0, limit - currentCount);
  return { allowed: currentCount < limit, remaining, limit };
}

export function shouldResetMonthlyAI(entitlement: Entitlement | undefined): boolean {
  if (!entitlement?.ai_requests_reset_date) return true;
  const resetDate = new Date(entitlement.ai_requests_reset_date);
  return new Date() >= resetDate;
}

export function getNextResetDate(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}

export function getRemainingCount(current: number, limit: number): string {
  if (limit === Infinity || limit === -1) return 'Unlimited';
  const remaining = Math.max(0, limit - current);
  return `${remaining} remaining`;
}

export function getPlanDisplayName(tier: PlanTier): string {
  switch (tier) {
    case 'pro': return 'Pro';
    case 'family': return 'Family';
    case 'lifetime': return 'Lifetime';
    default: return 'Free';
  }
}

export function isEntitlementValid(entitlement: Entitlement | undefined): boolean {
  if (!entitlement) return false;
  if (entitlement.plan_tier === 'free') return true;
  if (entitlement.plan_status !== 'active') return false;
  if (entitlement.plan_tier === 'lifetime') return true;
  
  if (entitlement.entitlement_end_date) {
    return new Date(entitlement.entitlement_end_date) > new Date();
  }
  return true;
}

export { getDefaultEntitlement };
