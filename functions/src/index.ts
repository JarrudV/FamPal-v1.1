import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { aggregateFromReports, AccessibilityReportDoc } from './accessibility.js';
import { aggregateFamilyFacilitiesFromReports, FamilyFacilityReportDoc } from './familyFacilities.js';

initializeApp();

const db = getFirestore();

type SubscriptionTier = 'free' | 'pro' | 'admin';
type SubscriptionStatus = 'active' | 'inactive';

function getUtcUsageMonth(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getNextUtcMonthStartIso(date = new Date()): string {
  const nextMonthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return nextMonthStart.toISOString();
}

function resolveTier(entitlement: Record<string, any> | undefined): SubscriptionTier {
  const subscriptionTier = entitlement?.subscription_tier;
  if (subscriptionTier === 'free' || subscriptionTier === 'pro' || subscriptionTier === 'admin') {
    return subscriptionTier;
  }
  const legacyTier = entitlement?.plan_tier;
  if (legacyTier === 'pro' || legacyTier === 'family' || legacyTier === 'lifetime') return 'pro';
  return 'free';
}

function resolveStatus(entitlement: Record<string, any> | undefined): SubscriptionStatus {
  const subscriptionStatus = entitlement?.subscription_status;
  if (subscriptionStatus === 'active' || subscriptionStatus === 'inactive') return subscriptionStatus;
  const legacyStatus = entitlement?.plan_status;
  if (legacyStatus === 'cancelled' || legacyStatus === 'expired') return 'inactive';
  return 'active';
}

function resolveLimit(tier: SubscriptionTier): number {
  if (tier === 'admin') return Number.MAX_SAFE_INTEGER;
  if (tier === 'pro') return 100;
  return 5;
}

export const reserveSmartInsightCredit = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const currentMonth = getUtcUsageMonth();
  const userRef = db.collection('users').doc(uid);

  const txResult = await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const userData = snap.exists ? (snap.data() as Record<string, any>) : {};
    const entitlement = (userData.entitlement || {}) as Record<string, any>;
    const nowMs = Date.now();

    let tier = resolveTier(entitlement);
    const status = resolveStatus(entitlement);
    if (status !== 'active' && tier !== 'admin') {
      tier = 'free';
    }

    const limit = resolveLimit(tier);
    const lastCreditAtRaw = userData.last_credit_at;
    const lastCreditAtMs = typeof lastCreditAtRaw === 'number'
      ? lastCreditAtRaw
      : (lastCreditAtRaw && typeof lastCreditAtRaw.toMillis === 'function' ? lastCreditAtRaw.toMillis() : 0);
    if (tier !== 'admin' && lastCreditAtMs > 0 && nowMs - lastCreditAtMs < 2000) {
      return {
        ok: false,
        reason: 'rate_limited',
      };
    }

    const resetMonth = typeof entitlement.usage_reset_month === 'string' ? entitlement.usage_reset_month : null;
    const wasReset = resetMonth !== currentMonth;
    const existingUsed = typeof entitlement.gemini_credits_used === 'number'
      ? entitlement.gemini_credits_used
      : (typeof entitlement.ai_requests_this_month === 'number' ? entitlement.ai_requests_this_month : 0);
    const usedBeforeCheck = wasReset ? 0 : existingUsed;

    if (tier !== 'admin' && usedBeforeCheck >= limit) {
      if (wasReset) {
        tx.set(userRef, {
          entitlement: {
            ...entitlement,
            subscription_tier: tier,
            subscription_status: status,
            gemini_credits_used: 0,
            gemini_credits_limit: limit,
            usage_reset_month: currentMonth,
            ai_requests_this_month: 0,
            ai_requests_reset_date: getNextUtcMonthStartIso(),
          },
        }, { merge: true });
      }
      return {
        ok: false,
        reason: 'limit_reached',
        used: usedBeforeCheck,
        limit,
        resetMonth: currentMonth,
      };
    }

    const usedAfter = usedBeforeCheck + 1;
    tx.set(userRef, {
      last_credit_at: nowMs,
      entitlement: {
        ...entitlement,
        subscription_tier: tier,
        subscription_status: status,
        gemini_credits_used: usedAfter,
        gemini_credits_limit: limit,
        usage_reset_month: currentMonth,
        ai_requests_this_month: usedAfter,
        ai_requests_reset_date: getNextUtcMonthStartIso(),
      },
    }, { merge: true });

    return {
      ok: true,
      used: usedAfter,
      limit: tier === 'admin' ? -1 : limit,
      remaining: tier === 'admin' ? -1 : Math.max(0, limit - usedAfter),
    };
  });

  return txResult;
});

export const refundSmartInsightCredit = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const currentMonth = getUtcUsageMonth();
  const userRef = db.collection('users').doc(uid);

  const txResult = await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const userData = snap.exists ? (snap.data() as Record<string, any>) : {};
    const entitlement = (userData.entitlement || {}) as Record<string, any>;

    let tier = resolveTier(entitlement);
    const status = resolveStatus(entitlement);
    if (status !== 'active' && tier !== 'admin') {
      tier = 'free';
    }
    const limit = resolveLimit(tier);
    const resetMonth = typeof entitlement.usage_reset_month === 'string' ? entitlement.usage_reset_month : null;
    if (resetMonth !== currentMonth) {
      return {
        ok: false,
        reason: 'month_changed',
      };
    }

    if (tier === 'admin') {
      return {
        ok: true,
        used: 0,
        limit: -1,
        remaining: -1,
      };
    }

    const existingUsed = typeof entitlement.gemini_credits_used === 'number'
      ? entitlement.gemini_credits_used
      : (typeof entitlement.ai_requests_this_month === 'number' ? entitlement.ai_requests_this_month : 0);
    const usedAfter = Math.max(0, existingUsed - 1);

    if (existingUsed > 0) {
      tx.set(userRef, {
        entitlement: {
          ...entitlement,
          subscription_tier: tier,
          subscription_status: status,
          gemini_credits_used: usedAfter,
          gemini_credits_limit: limit,
          usage_reset_month: currentMonth,
          ai_requests_this_month: usedAfter,
          ai_requests_reset_date: getNextUtcMonthStartIso(),
        },
      }, { merge: true });
    }

    return {
      ok: true,
      used: usedAfter,
      limit,
      remaining: Math.max(0, limit - usedAfter),
    };
  });

  return txResult;
});

export const aggregatePlaceAccessibilityOnReportCreate = onDocumentCreated(
  'places/{placeId}/accessibilityReports/{reportId}',
  async (event) => {
    const placeId = event.params.placeId;
    if (!placeId) return;

    const placeRef = db.collection('places').doc(placeId);
    const reportsQuery = placeRef.collection('accessibilityReports');

    try {
      await db.runTransaction(async (tx) => {
        const reportsSnap = await tx.get(reportsQuery);
        const reports: AccessibilityReportDoc[] = reportsSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<AccessibilityReportDoc, 'id'>),
        }));
        const aggregated = aggregateFromReports(reports);

        tx.set(
          placeRef,
          {
            accessibility: aggregated.accessibility,
            accessibilitySummary: aggregated.accessibilitySummary,
            accessibilityUpdatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });
    } catch (err) {
      logger.error('Failed to aggregate accessibility reports', { placeId, err });
      throw err;
    }
  }
);

export const aggregatePlaceFamilyFacilitiesOnReportCreate = onDocumentCreated(
  'places/{placeId}/familyFacilitiesReports/{reportId}',
  async (event) => {
    const placeId = event.params.placeId;
    if (!placeId) return;

    const placeRef = db.collection('places').doc(placeId);
    const reportsQuery = placeRef.collection('familyFacilitiesReports');

    try {
      await db.runTransaction(async (tx) => {
        const reportsSnap = await tx.get(reportsQuery);
        const reports: FamilyFacilityReportDoc[] = reportsSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<FamilyFacilityReportDoc, 'id'>),
        }));
        const aggregated = aggregateFamilyFacilitiesFromReports(reports);

        tx.set(
          placeRef,
          {
            familyFacilities: aggregated.familyFacilities,
            familyFacilitiesSummary: aggregated.familyFacilitiesSummary,
            familyFacilitiesUpdatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });
    } catch (err) {
      logger.error('Failed to aggregate family facilities reports', { placeId, err });
      throw err;
    }
  }
);
