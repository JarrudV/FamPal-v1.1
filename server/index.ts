import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || '';
const APP_URL = process.env.APP_URL
  || (process.env.REPLIT_DOMAINS?.split(',')[0] ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000');

if (!getApps().length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null;
  
  if (serviceAccount) {
    initializeApp({ credential: cert(serviceAccount) });
  } else {
    initializeApp();
  }
}

const db = getFirestore();
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_PLACES_API_KEY || '';

if (!GOOGLE_PLACES_API_KEY) {
  console.warn('[FamPals API] Google Places API key is not configured. Places search will fail.');
}

const LEGACY_PLACE_TYPE_MAP: Record<string, string | undefined> = {
  restaurant: 'restaurant',
  outdoor: 'park',
  indoor: 'museum',
  active: 'playground',
  hike: 'park',
  wine: 'bar',
  golf: 'golf_course',
  all: undefined,
};

function resolveLegacyType(type?: string | string[]) {
  if (!type) return undefined;
  const key = Array.isArray(type) ? type[0] : type;
  return LEGACY_PLACE_TYPE_MAP[key] || undefined;
}

interface PlanConfig {
  name: string;
  amount: number;
  currency: string;
  interval: string | null;
  plan_code?: string;
}

const PLANS: Record<string, PlanConfig> = {
  pro: {
    name: 'Pro Plan',
    amount: 7500,
    currency: 'ZAR',
    interval: 'annually',
    plan_code: process.env.PAYSTACK_PRO_PLAN_CODE || '',
  },
  lifetime: {
    name: 'Lifetime Plan',
    amount: 39900,
    currency: 'ZAR',
    interval: null,
  }
};

function verifyPaystackSignature(rawBody: Buffer, signature: string): boolean {
  if (!PAYSTACK_SECRET_KEY) return false;
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');
  return hash === signature;
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/places/nearby', async (req, res) => {
  try {
    const apiKey = GOOGLE_PLACES_API_KEY || (typeof req.query.apiKey === 'string' ? req.query.apiKey : '');
    if (!apiKey) {
      return res.status(500).json({ error: 'Places API not configured' });
    }
    if (!GOOGLE_PLACES_API_KEY && apiKey) {
      console.warn('[FamPals API] Using client-provided Places API key for nearby search.');
    }
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'Missing or invalid lat/lng' });
    }
    const radiusKm = Number(req.query.radiusKm || 10);
    const radiusMeters = Math.min(Math.max(radiusKm, 0.1) * 1000, 50000);
    const pageToken = typeof req.query.pageToken === 'string' ? req.query.pageToken : undefined;
    const legacyType = resolveLegacyType(req.query.type);

    const params = new URLSearchParams({
      key: apiKey,
      location: `${lat},${lng}`,
      radius: `${radiusMeters}`,
    });
    if (legacyType) {
      params.set('type', legacyType);
    }
    if (pageToken) {
      params.set('pagetoken', pageToken);
    }

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'INVALID_REQUEST' && pageToken) {
      return res.status(409).json({ error: 'page_token_not_ready' });
    }
    if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return res.status(400).json({ error: data.error_message || data.status, status: data.status });
    }
    return res.json({
      results: data.results || [],
      nextPageToken: data.next_page_token || null,
    });
  } catch (error) {
    console.error('Places nearby error:', error);
    return res.status(500).json({ error: 'Places search failed' });
  }
});

app.get('/api/places/text', async (req, res) => {
  try {
    const apiKey = GOOGLE_PLACES_API_KEY || (typeof req.query.apiKey === 'string' ? req.query.apiKey : '');
    if (!apiKey) {
      return res.status(500).json({ error: 'Places API not configured' });
    }
    if (!GOOGLE_PLACES_API_KEY && apiKey) {
      console.warn('[FamPals API] Using client-provided Places API key for text search.');
    }
    const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
    if (!query) {
      return res.status(400).json({ error: 'Missing query' });
    }
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'Missing or invalid lat/lng' });
    }
    const radiusKm = Number(req.query.radiusKm || 10);
    const radiusMeters = Math.min(Math.max(radiusKm, 0.1) * 1000, 50000);
    const pageToken = typeof req.query.pageToken === 'string' ? req.query.pageToken : undefined;

    const params = new URLSearchParams({
      key: apiKey,
      query: `${query} family friendly`,
      location: `${lat},${lng}`,
      radius: `${radiusMeters}`,
    });
    if (pageToken) {
      params.set('pagetoken', pageToken);
    }

    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'INVALID_REQUEST' && pageToken) {
      return res.status(409).json({ error: 'page_token_not_ready' });
    }
    if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return res.status(400).json({ error: data.error_message || data.status, status: data.status });
    }
    return res.json({
      results: data.results || [],
      nextPageToken: data.next_page_token || null,
    });
  } catch (error) {
    console.error('Places text search error:', error);
    return res.status(500).json({ error: 'Places search failed' });
  }
});

app.get('/api/subscription/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.json({ entitlement: null });
    }
    
    const data = userDoc.data();
    return res.json({ entitlement: data?.entitlement || null });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return res.status(500).json({ error: 'Failed to fetch status' });
  }
});

app.post('/api/paystack/init-payment', async (req, res) => {
  try {
    const { userId, email, plan } = req.body;
    
    if (!userId || !email || !plan) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ error: 'Payment system not configured' });
    }
    
    const planConfig = PLANS[plan as keyof typeof PLANS];
    if (!planConfig) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    
    const reference = `fampals_${plan}_${userId}_${Date.now()}`;
    const callbackUrl = `${APP_URL}?payment_callback=true&ref=${reference}`;
    
    let paystackPayload: any = {
      email,
      amount: planConfig.amount,
      currency: planConfig.currency,
      reference,
      callback_url: callbackUrl,
      metadata: {
        userId,
        plan,
        custom_fields: [
          { display_name: 'Plan', variable_name: 'plan', value: plan },
          { display_name: 'User ID', variable_name: 'user_id', value: userId }
        ]
      }
    };
    
    if (plan === 'pro' && planConfig.plan_code) {
      paystackPayload.plan = planConfig.plan_code;
    }
    
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paystackPayload),
    });
    
    const data = await response.json();
    
    if (!data.status) {
      console.error('Paystack init error:', data);
      return res.status(400).json({ error: data.message || 'Payment initialization failed' });
    }
    
    return res.json({
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: data.data.reference,
    });
  } catch (error) {
    console.error('Payment init error:', error);
    return res.status(500).json({ error: 'Payment initialization failed' });
  }
});

app.post('/api/paystack/verify', async (req, res) => {
  try {
    const { reference } = req.body;
    
    if (!reference || !PAYSTACK_SECRET_KEY) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });
    
    const data = await response.json();
    
    if (!data.status || data.data.status !== 'success') {
      return res.status(400).json({ error: 'Payment not verified' });
    }
    
    const metadata = data.data.metadata;
    const userId = metadata?.userId;
    const plan = metadata?.plan;
    
    if (userId && plan) {
      await updateUserEntitlement(userId, plan, data.data.reference, data.data);
    }
    
    return res.json({ success: true, plan });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ error: 'Verification failed' });
  }
});

app.post('/api/paystack/webhook', async (req: any, res) => {
  try {
    const signature = req.headers['x-paystack-signature'] as string;
    
    if (!signature || !verifyPaystackSignature(req.rawBody, signature)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const event = req.body;
    console.log('Paystack webhook event:', event.event);
    
    switch (event.event) {
      case 'charge.success':
      case 'subscription.create': {
        const metadata = event.data.metadata;
        const userId = metadata?.userId;
        const plan = metadata?.plan;
        
        if (userId && plan) {
          await updateUserEntitlement(userId, plan, event.data.reference, event.data);
          console.log(`Updated entitlement for user ${userId} to ${plan}`);
        }
        break;
      }
      
      case 'subscription.disable':
      case 'subscription.not_renew': {
        const subscriptionCode = event.data.subscription_code;
        const userSnapshot = await db.collection('users')
          .where('entitlement.paystack_subscription_code', '==', subscriptionCode)
          .limit(1)
          .get();
        
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          await userDoc.ref.update({
            'entitlement.plan_status': 'cancelled',
          });
          console.log(`Cancelled subscription for user ${userDoc.id}`);
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        const customerCode = event.data.customer?.customer_code;
        if (customerCode) {
          const userSnapshot = await db.collection('users')
            .where('entitlement.paystack_customer_code', '==', customerCode)
            .limit(1)
            .get();
          
          if (!userSnapshot.empty) {
            const userDoc = userSnapshot.docs[0];
            await userDoc.ref.update({
              'entitlement.plan_status': 'expired',
            });
          }
        }
        break;
      }
    }
    
    return res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

app.post('/api/subscription/cancel', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId || !PAYSTACK_SECRET_KEY) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const subscriptionCode = userData?.entitlement?.paystack_subscription_code;
    const emailToken = userData?.entitlement?.paystack_email_token;
    
    if (!subscriptionCode) {
      return res.status(400).json({ error: 'No active subscription' });
    }
    
    const response = await fetch(`https://api.paystack.co/subscription/disable`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: subscriptionCode, token: emailToken }),
    });
    
    const data = await response.json();
    
    if (data.status) {
      await userDoc.ref.update({
        'entitlement.plan_status': 'cancelled',
      });
      return res.json({ success: true });
    }
    
    return res.status(400).json({ error: 'Failed to cancel subscription' });
  } catch (error) {
    console.error('Cancel error:', error);
    return res.status(500).json({ error: 'Cancellation failed' });
  }
});

async function updateUserEntitlement(
  userId: string, 
  plan: string, 
  reference: string,
  paymentData: any
) {
  const now = new Date();
  const isLifetime = plan === 'lifetime';
  
  let endDate: string | null = null;
  if (!isLifetime) {
    const oneYearLater = new Date(now);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    endDate = oneYearLater.toISOString();
  }
  
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  
  const entitlement = {
    plan_tier: isLifetime ? 'lifetime' : 'pro',
    plan_status: 'active',
    entitlement_source: 'paystack',
    entitlement_start_date: now.toISOString(),
    entitlement_end_date: endDate,
    paystack_customer_code: paymentData.customer?.customer_code || null,
    paystack_subscription_code: paymentData.subscription_code || null,
    paystack_email_token: paymentData.email_token || paymentData.subscription?.email_token || null,
    last_payment_reference: reference,
    ai_requests_this_month: 0,
    ai_requests_reset_date: nextMonth.toISOString(),
  };
  
  await db.collection('users').doc(userId).set(
    { entitlement },
    { merge: true }
  );
}

app.get('/api/paystack/config', (_req, res) => {
  res.json({ 
    publicKey: PAYSTACK_PUBLIC_KEY,
    configured: !!PAYSTACK_SECRET_KEY 
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[FamPals API] Server running on port ${PORT}`);
  console.log(`[FamPals API] Paystack configured: ${!!PAYSTACK_SECRET_KEY}`);
});
