import { Entitlement, PlanTier, PLAN_LIMITS, getDefaultEntitlement } from '../types';

const FREE_CREDITS_PER_MONTH = 5;
const PRO_CREDITS_PER_MONTH = 100;
const ADMIN_UIDS = (import.meta.env.VITE_ADMIN_UIDS || '').split(',').filter(Boolean);

export function isAdminUser(uid: string | undefined): boolean {
  return !!uid && ADMIN_UIDS.includes(uid);
}

export function getCurrentUsageMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getEntitlementTier(entitlement: Entitlement | undefined): 'free' | 'pro' | 'admin' {
  if (!entitlement) return 'free';
  if (entitlement.subscription_tier) return entitlement.subscription_tier;
  if (entitlement.plan_tier === 'pro' || entitlement.plan_tier === 'family' || entitlement.plan_tier === 'lifetime') return 'pro';
  return 'free';
}

function getEffectiveCreditLimit(entitlement: Entitlement | undefined): number {
  if (!entitlement) return FREE_CREDITS_PER_MONTH;
  const tier = getEntitlementTier(entitlement);
  if (tier === 'admin') return Infinity;
  const tierDefault = tier === 'pro' ? PRO_CREDITS_PER_MONTH : FREE_CREDITS_PER_MONTH;
  if (typeof entitlement.gemini_credits_limit === 'number' && entitlement.gemini_credits_limit > tierDefault) {
    return entitlement.gemini_credits_limit;
  }
  return tierDefault;
}

function getEffectiveCreditsUsed(
  entitlement: Entitlement | undefined,
  poolUsage?: { ai_requests_this_month?: number; ai_requests_reset_date?: string } | null
): number {
  if (!entitlement) return 0;
  if (typeof entitlement.gemini_credits_used === 'number') {
    return entitlement.gemini_credits_used;
  }
  const isLegacyFamilyPool = entitlement.plan_tier === 'family' && poolUsage;
  if (isLegacyFamilyPool) {
    return poolUsage?.ai_requests_this_month || 0;
  }
  return entitlement.ai_requests_this_month || 0;
}

export function getLimits(entitlement: Entitlement | undefined) {
  const raw =
    entitlement?.subscription_tier === 'admin'
      ? 'pro'
      : entitlement?.subscription_tier === 'pro'
        ? 'pro'
        : (entitlement?.plan_tier || 'free');
  const tier = (raw === 'family' || raw === 'lifetime') ? 'pro' : raw as 'free' | 'pro';
  const status = entitlement?.plan_status || 'active';
  
  if (status === 'expired' || status === 'cancelled') {
    return PLAN_LIMITS.free;
  }
  
  return PLAN_LIMITS[tier];
}

export function isPaidTier(entitlement: Entitlement | undefined): boolean {
  if (!entitlement) return false;
  const tier = getEntitlementTier(entitlement);
  if (tier === 'admin') return true;
  if (tier === 'pro' && entitlement.subscription_status) {
    return entitlement.subscription_status === 'active';
  }
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
  poolUsage?: { ai_requests_this_month?: number; ai_requests_reset_date?: string } | null,
  uid?: string
): { allowed: boolean; remaining: number; limit: number } {
  if (uid && isAdminUser(uid)) {
    return { allowed: true, remaining: -1, limit: -1 };
  }
  const limit = getEffectiveCreditLimit(entitlement);
  const used = getEffectiveCreditsUsed(entitlement, poolUsage);
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
  if (entitlement?.usage_reset_month) {
    return entitlement.usage_reset_month !== getCurrentUsageMonth();
  }
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
    case 'pro':
    case 'family':
    case 'lifetime':
      return 'Pro';
    default: return 'Free';
  }
}

export function isEntitlementValid(entitlement: Entitlement | undefined): boolean {
  if (!entitlement) return false;
  if (entitlement.plan_tier === 'free') return true;
  if (entitlement.plan_status !== 'active') return false;
  
  if (entitlement.entitlement_end_date) {
    return new Date(entitlement.entitlement_end_date) > new Date();
  }
  return true;
}

export { getDefaultEntitlement };
