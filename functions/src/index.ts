import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { aggregateFromReports, AccessibilityReportDoc } from './accessibility.js';
import { aggregateFamilyFacilitiesFromReports, FamilyFacilityReportDoc } from './familyFacilities.js';

initializeApp();

const db = getFirestore();

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
