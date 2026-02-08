"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregatePlaceFamilyFacilitiesOnReportCreate = exports.aggregatePlaceAccessibilityOnReportCreate = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firebase_functions_1 = require("firebase-functions");
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
const accessibility_js_1 = require("./accessibility.js");
const familyFacilities_js_1 = require("./familyFacilities.js");
(0, app_1.initializeApp)();
const db = (0, firestore_2.getFirestore)();
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