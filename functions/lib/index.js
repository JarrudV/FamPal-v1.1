"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregatePlaceFamilyFacilitiesOnReportCreate = exports.aggregatePlaceAccessibilityOnReportCreate = exports.refundSmartInsightCredit = exports.reserveSmartInsightCredit = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
const accessibility_js_1 = require("./accessibility.js");
const familyFacilities_js_1 = require("./familyFacilities.js");
(0, app_1.initializeApp)();
const db = (0, firestore_2.getFirestore)();
function getUtcUsageMonth(date = new Date()) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
function getNextUtcMonthStartIso(date = new Date()) {
    const nextMonthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
    return nextMonthStart.toISOString();
}
function resolveTier(entitlement) {
    const subscriptionTier = entitlement?.subscription_tier;
    if (subscriptionTier === 'free' || subscriptionTier === 'pro' || subscriptionTier === 'admin') {
        return subscriptionTier;
    }
    const legacyTier = entitlement?.plan_tier;
    if (legacyTier === 'pro' || legacyTier === 'family' || legacyTier === 'lifetime')
        return 'pro';
    return 'free';
}
function resolveStatus(entitlement) {
    const subscriptionStatus = entitlement?.subscription_status;
    if (subscriptionStatus === 'active' || subscriptionStatus === 'inactive')
        return subscriptionStatus;
    const legacyStatus = entitlement?.plan_status;
    if (legacyStatus === 'cancelled' || legacyStatus === 'expired')
        return 'inactive';
    return 'active';
}
function resolveLimit(tier) {
    if (tier === 'admin')
        return Number.MAX_SAFE_INTEGER;
    if (tier === 'pro')
        return 100;
    return 5;
}
function isAdminAccessUser(userData, entitlement) {
    const role = typeof userData.role === 'string' ? userData.role.toLowerCase() : '';
    const topLevelEntitlement = typeof userData.entitlement === 'string' ? userData.entitlement.toLowerCase() : '';
    return role === 'admin'
        || topLevelEntitlement === 'admin'
        || entitlement?.subscription_tier === 'admin'
        || userData.unlimited_credits === true
        || userData.is_review_account === true;
}
exports.reserveSmartInsightCredit = (0, https_1.onCall)(async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required.');
    }
    const currentMonth = getUtcUsageMonth();
    const userRef = db.collection('users').doc(uid);
    const txResult = await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        const userData = snap.exists ? snap.data() : {};
        const entitlement = (userData.entitlement || {});
        // Google Play review account – do not remove without updating Play Console
        if (isAdminAccessUser(userData, entitlement)) {
            return {
                ok: true,
                used: 0,
                limit: -1,
                remaining: -1,
            };
        }
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
exports.refundSmartInsightCredit = (0, https_1.onCall)(async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required.');
    }
    const currentMonth = getUtcUsageMonth();
    const userRef = db.collection('users').doc(uid);
    const txResult = await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        const userData = snap.exists ? snap.data() : {};
        const entitlement = (userData.entitlement || {});
        // Google Play review account – do not remove without updating Play Console
        if (isAdminAccessUser(userData, entitlement)) {
            return {
                ok: true,
                used: 0,
                limit: -1,
                remaining: -1,
            };
        }
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
exports.aggregatePlaceAccessibilityOnReportCreate = (0, firestore_1.onDocumentCreated)('places/{placeId}/accessibilityReports/{reportId}', async (event) => {
    const placeId = event.params.placeId;
    if (!placeId)
        return;
    const placeRef = db.collection('places').doc(placeId);
    const reportsQuery = placeRef.collection('accessibilityReports');
    try {
        await db.runTransaction(async (tx) => {
            const reportsSnap = await tx.get(reportsQuery);
            const reports = reportsSnap.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
            }));
            const aggregated = (0, accessibility_js_1.aggregateFromReports)(reports);
            tx.set(placeRef, {
                accessibility: aggregated.accessibility,
                accessibilitySummary: aggregated.accessibilitySummary,
                accessibilityUpdatedAt: firestore_2.FieldValue.serverTimestamp(),
            }, { merge: true });
        });
    }
    catch (err) {
        firebase_functions_1.logger.error('Failed to aggregate accessibility reports', { placeId, err });
        throw err;
    }
});
exports.aggregatePlaceFamilyFacilitiesOnReportCreate = (0, firestore_1.onDocumentCreated)('places/{placeId}/familyFacilitiesReports/{reportId}', async (event) => {
    const placeId = event.params.placeId;
    if (!placeId)
        return;
    const placeRef = db.collection('places').doc(placeId);
    const reportsQuery = placeRef.collection('familyFacilitiesReports');
    try {
        await db.runTransaction(async (tx) => {
            const reportsSnap = await tx.get(reportsQuery);
            const reports = reportsSnap.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
            }));
            const aggregated = (0, familyFacilities_js_1.aggregateFamilyFacilitiesFromReports)(reports);
            tx.set(placeRef, {
                familyFacilities: aggregated.familyFacilities,
                familyFacilitiesSummary: aggregated.familyFacilitiesSummary,
                familyFacilitiesUpdatedAt: firestore_2.FieldValue.serverTimestamp(),
            }, { merge: true });
        });
    }
    catch (err) {
        firebase_functions_1.logger.error('Failed to aggregate family facilities reports', { placeId, err });
        throw err;
    }
});
//# sourceMappingURL=index.js.map