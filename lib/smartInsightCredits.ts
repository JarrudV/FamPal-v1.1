import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth } from './firebase';

export type ReserveSmartInsightResponse =
  | { ok: true; used: number; limit: number; remaining: number }
  | { ok: false; reason: 'limit_reached'; used: number; limit: number; resetMonth: string }
  | { ok: false; reason: 'rate_limited' };

export type RefundSmartInsightResponse =
  | { ok: true; used: number; limit: number; remaining: number }
  | { ok: false; reason: 'month_changed' };

let reserveCallable: ReturnType<typeof httpsCallable> | null = null;
let refundCallable: ReturnType<typeof httpsCallable> | null = null;

function getReserveCallable() {
  if (!app) {
    throw new Error('Firebase app is not configured.');
  }
  if (!reserveCallable) {
    const functions = getFunctions(app);
    reserveCallable = httpsCallable(functions, 'reserveSmartInsightCredit');
  }
  return reserveCallable;
}

function getRefundCallable() {
  if (!app) {
    throw new Error('Firebase app is not configured.');
  }
  if (!refundCallable) {
    const functions = getFunctions(app);
    refundCallable = httpsCallable(functions, 'refundSmartInsightCredit');
  }
  return refundCallable;
}

export async function reserveSmartInsightCredit(): Promise<ReserveSmartInsightResponse> {
  if (import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS === 'true') {
    return { ok: true, used: 0, limit: -1, remaining: -1 };
  }
  if (!auth?.currentUser) {
    throw new Error('auth_required');
  }
  const fn = getReserveCallable();
  const response = await fn();
  return response.data as ReserveSmartInsightResponse;
}

export async function refundSmartInsightCredit(): Promise<RefundSmartInsightResponse> {
  if (import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS === 'true') {
    return { ok: true, used: 0, limit: -1, remaining: -1 };
  }
  if (!auth?.currentUser) {
    throw new Error('auth_required');
  }
  const fn = getRefundCallable();
  const response = await fn();
  return response.data as RefundSmartInsightResponse;
}
