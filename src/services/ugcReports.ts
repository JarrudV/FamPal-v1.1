import { addDoc, auth, collection, db, serverTimestamp } from '../../lib/firebase';

export const UGC_REPORT_REASONS = [
  'Inappropriate content',
  'Nudity',
  'Violence',
  'Spam',
  'Harassment',
  'Other',
] as const;

export type UgcReportReason = (typeof UGC_REPORT_REASONS)[number];
export type UgcReportContentType = 'review' | 'profile';

export async function createUgcReport(payload: {
  reported_content_type: UgcReportContentType;
  reported_content_id: string;
  reported_user_id: string;
  reason: UgcReportReason;
}): Promise<void> {
  if (!db) throw new Error('firestore_unavailable');
  const currentUserId = auth?.currentUser?.uid;
  if (!currentUserId) throw new Error('auth_required');

  // Required for Google Play UGC compliance
  await addDoc(collection(db, 'reports'), {
    reported_content_type: payload.reported_content_type,
    reported_content_id: payload.reported_content_id,
    reported_user_id: payload.reported_user_id,
    reason: payload.reason,
    reported_by: currentUserId,
    created_at: serverTimestamp(),
    status: 'pending',
  });
}

