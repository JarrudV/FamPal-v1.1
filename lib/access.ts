import type { Entitlement, User } from '../types';
import { getDefaultEntitlement, getLimits, isPaidTier } from './entitlements';

export interface AppAccessContext {
  isGuest: boolean;
  isLoggedIn: boolean;
  isPro: boolean;
  isAuthBypass: boolean;
  canSyncCloud: boolean;
  entitlement: Entitlement;
  limits: ReturnType<typeof getLimits> & {
    radiusKm: number;
  };
}

interface BuildAccessParams {
  isGuest: boolean;
  user: User | null;
  entitlement?: Entitlement;
  isAuthBypass?: boolean;
}

export function buildAccessContext(params: BuildAccessParams): AppAccessContext {
  const entitlement = params.entitlement || getDefaultEntitlement();
  const isLoggedIn = !!params.user;
  const isAuthBypass = !!params.isAuthBypass;
  const limits = getLimits(entitlement);
  return {
    isGuest: params.isGuest,
    isLoggedIn,
    isPro: isPaidTier(entitlement),
    isAuthBypass,
    // DEV bypass stays read-only for cloud writes to avoid accidental production data changes.
    canSyncCloud: isLoggedIn && !params.isGuest && !isAuthBypass,
    entitlement,
    limits: {
      ...limits,
      radiusKm: 200,
    },
  };
}
