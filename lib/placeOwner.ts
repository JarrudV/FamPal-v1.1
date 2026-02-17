import { auth } from './firebase';
import type { PlaceClaim, OwnerContent } from '../src/types/placeOwner';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth?.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function submitPlaceClaim(data: {
  placeId: string;
  placeName: string;
  businessRole: string;
  businessEmail?: string;
  businessPhone?: string;
  verificationMethod?: string;
  verificationEvidence: string;
}): Promise<{ success: boolean; claimId: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/place-claims`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to submit claim' }));
    throw new Error(err.error || 'Failed to submit claim');
  }
  return res.json();
}

export async function fetchMyClaims(): Promise<PlaceClaim[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/place-claims/my-claims`, { headers });
  if (!res.ok) throw new Error('Failed to fetch claims');
  const data = await res.json();
  return data.claims;
}

export async function fetchPlaceClaim(placeId: string): Promise<PlaceClaim | null> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/place-claims/place/${placeId}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch claim');
  const data = await res.json();
  return data.claim;
}

export async function fetchAdminClaims(status: string = 'pending'): Promise<PlaceClaim[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/place-claims?status=${status}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch claims');
  const data = await res.json();
  return data.claims;
}

export async function verifyClaimAdmin(claimId: string, action: 'verify' | 'reject', rejectionReason?: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/admin/place-claims/${claimId}/verify`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, rejectionReason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to process claim' }));
    throw new Error(err.error || 'Failed to process claim');
  }
}

export async function fetchPlaceOwnerInfo(placeId: string): Promise<{
  ownerStatus: string;
  ownerTier: string | null;
  ownerContent: OwnerContent | null;
  promotedUntil: string | null;
}> {
  const res = await fetch(`${API_BASE}/api/place-owner/${placeId}`);
  if (!res.ok) throw new Error('Failed to fetch owner info');
  return res.json();
}

export async function updateOwnerContent(placeId: string, ownerContent: OwnerContent): Promise<{ success: boolean; ownerContent: OwnerContent }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/place-owner/${placeId}/content`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ ownerContent }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update content' }));
    throw new Error(err.error || 'Failed to update content');
  }
  return res.json();
}

export async function initBusinessPayment(placeId: string, email: string): Promise<{ authorization_url: string; reference: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/paystack/init-business-payment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ placeId, email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Payment initialization failed' }));
    throw new Error(err.error || 'Payment initialization failed');
  }
  return res.json();
}

export async function verifyBusinessPayment(reference: string): Promise<{ success: boolean }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/paystack/verify-business`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ reference }),
  });
  if (!res.ok) throw new Error('Payment verification failed');
  return res.json();
}
