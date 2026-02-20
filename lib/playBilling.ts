import { Capacitor, registerPlugin } from '@capacitor/core';
import { auth } from './firebase';
import type { Entitlement } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const PLAY_PRODUCT_IDS = (
  import.meta.env.VITE_PLAY_SUBSCRIPTION_PRODUCT_IDS ||
  import.meta.env.VITE_PLAY_SUBSCRIPTION_PRODUCT_ID ||
  'fampal_pro_monthly'
)
  .split(',')
  .map((id: string) => id.trim())
  .filter(Boolean);

type PlayStatus =
  | 'inactive'
  | 'active'
  | 'pending'
  | 'grace_period'
  | 'cancelled_active'
  | 'billing_retry'
  | 'expired';

type PlayProductOffer = {
  offerToken: string;
  basePlanId?: string | null;
  formattedPrice?: string | null;
  priceCurrencyCode?: string | null;
  priceAmountMicros?: number | null;
};

export type PlayProduct = {
  productId: string;
  title: string;
  description: string;
  offerToken?: string | null;
  offers: PlayProductOffer[];
};

type PlayPurchase = {
  orderId?: string | null;
  packageName?: string | null;
  purchaseToken: string;
  purchaseTime?: number;
  purchaseState: number;
  acknowledged: boolean;
  autoRenewing: boolean;
  products: string[];
};

interface PlayBillingPlugin {
  getSubscriptionProducts(options: { productIds: string[] }): Promise<{ products: PlayProduct[] }>;
  purchaseSubscription(options: { productId: string; offerToken?: string }): Promise<{ purchases: PlayPurchase[] }>;
  queryActivePurchases(): Promise<{ purchases: PlayPurchase[] }>;
  acknowledgePurchase(options: { purchaseToken: string }): Promise<{ acknowledged: boolean }>;
}

const PlayBilling = registerPlugin<PlayBillingPlugin>('PlayBilling');

function isAndroidNative(): boolean {
  return Capacitor.getPlatform() === 'android';
}

export function getPlayProductIds(): string[] {
  return PLAY_PRODUCT_IDS;
}

export async function isPlayBillingAvailable(): Promise<boolean> {
  if (!isAndroidNative()) return false;
  try {
    await PlayBilling.queryActivePurchases();
    return true;
  } catch {
    return false;
  }
}

export async function getPlayProducts(productIds: string[] = PLAY_PRODUCT_IDS): Promise<PlayProduct[]> {
  if (!isAndroidNative()) return [];
  const ids = productIds.filter(Boolean);
  if (ids.length === 0) return [];
  try {
    const result = await PlayBilling.getSubscriptionProducts({ productIds: ids });
    return result.products || [];
  } catch {
    return [];
  }
}

export async function queryPlayPurchases(): Promise<PlayPurchase[]> {
  if (!isAndroidNative()) return [];
  try {
    const result = await PlayBilling.queryActivePurchases();
    return result.purchases || [];
  } catch {
    return [];
  }
}

export async function purchasePlaySubscription(productId: string, offerToken?: string): Promise<PlayPurchase[]> {
  const result = await PlayBilling.purchaseSubscription({ productId, offerToken });
  return result.purchases || [];
}

async function acknowledgeIfNeeded(purchase: PlayPurchase): Promise<void> {
  if (purchase.acknowledged || !purchase.purchaseToken) return;
  try {
    await PlayBilling.acknowledgePurchase({ purchaseToken: purchase.purchaseToken });
  } catch {
    // Non-fatal for sync; server verification still runs.
  }
}

function pickMatchingPurchase(purchases: PlayPurchase[]): PlayPurchase | null {
  const match = purchases.find((purchase) =>
    purchase.products?.some((productId) => PLAY_PRODUCT_IDS.includes(productId))
  );
  return match || null;
}

async function getAuthHeader(): Promise<string | null> {
  const currentUser = auth?.currentUser;
  if (!currentUser) return null;
  const token = await currentUser.getIdToken();
  return `Bearer ${token}`;
}

export async function syncPlayEntitlementWithServer(): Promise<{ entitlement: Entitlement; status: PlayStatus } | null> {
  if (!isAndroidNative()) return null;
  if (!API_BASE) return null;

  const authHeader = await getAuthHeader();
  if (!authHeader) return null;

  const purchases = await queryPlayPurchases();
  const matched = pickMatchingPurchase(purchases);
  if (matched) {
    await acknowledgeIfNeeded(matched);
  }

  const productId = matched?.products?.find((id) => PLAY_PRODUCT_IDS.includes(id)) || PLAY_PRODUCT_IDS[0];
  const body = {
    productId,
    purchaseToken: matched?.purchaseToken || null,
    purchaseState: matched?.purchaseState ?? null,
    autoRenewing: matched?.autoRenewing ?? null,
    orderId: matched?.orderId || null,
    packageName: matched?.packageName || null,
  };

  const response = await fetch(`${API_BASE}/api/play/subscription/sync`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Play sync failed (${response.status})`);
  }

  const data = await response.json();
  return data || null;
}
