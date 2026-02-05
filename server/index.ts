import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Log startup immediately
console.log('[FamPals API] Starting server...');
console.log('[FamPals API] PORT env:', process.env.PORT);
console.log('[FamPals API] NODE_ENV:', process.env.NODE_ENV);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extend Express Request type to include verified user
interface AuthenticatedRequest extends Request {
  uid?: string;
}

const app = express();

// Health check endpoint - respond BEFORE any initialization
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

app.use(cors({ origin: true }));
app.use(express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || '';
const APP_URL = process.env.APP_URL
  || (process.env.REPLIT_DOMAINS?.split(',')[0] ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000');

// Initialize Firebase Admin SDK
// In production on Cloud Run/App Hosting, uses Application Default Credentials (ADC)
// Can also use FIREBASE_SERVICE_ACCOUNT if explicitly provided
let db: ReturnType<typeof getFirestore>;
let adminAuth: ReturnType<typeof getAuth>;

try {
  if (!getApps().length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      initializeApp({ credential: cert(serviceAccount) });
      console.log('[FamPals API] Initialized with explicit service account');
    } else {
      // Use ADC (works on Cloud Run, App Engine, Cloud Functions)
      initializeApp();
      console.log('[FamPals API] Initialized with Application Default Credentials');
    }
  }
  db = getFirestore();
  adminAuth = getAuth();
  console.log('[FamPals API] Firebase Admin SDK initialized successfully');
} catch (err) {
  console.error('[FamPals API] Firebase Admin init error:', err);
  throw err; // Re-throw to fail fast and show in logs
}
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_PLACES_API_KEY || '';

// Middleware to verify Firebase Auth token
async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    req.uid = decodedToken.uid;
    next();
  } catch (err: any) {
    console.error('[FamPals API] Auth verification failed:', err?.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

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
    const typeParam = typeof req.query.type === 'string' ? req.query.type : undefined;
    const legacyType = resolveLegacyType(typeParam);

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

// Partner unlink endpoint - handles clearing both users' partnerLink fields
// This is needed because Firestore rules only allow users to write to their own documents
// Requires Firebase Auth token for security
app.post('/api/partner/unlink', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.uid!; // Verified user from auth token
    
    console.log('[FamPals API] Partner unlink request for user:', userId);
    
    // Fetch user's current partnerLink to get the actual partnerId
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data() || {};
    const currentPartnerLink = userData.partnerLink;
    
    // Get the actual partner from user's document (not from request body for security)
    const actualPartnerUserId = currentPartnerLink?.partnerUserId;
    
    console.log('[FamPals API] Validated partner from user doc:', actualPartnerUserId);
    
    const batch = db.batch();
    
    // Clear current user's partnerLink
    const userRef = db.collection('users').doc(userId);
    batch.update(userRef, { partnerLink: FieldValue.delete() });
    
    // If there's a valid partner link, clear their partnerLink too
    if (actualPartnerUserId) {
      const partnerRef = db.collection('users').doc(actualPartnerUserId);
      batch.update(partnerRef, { partnerLink: FieldValue.delete() });
      
      // Also mark the partner thread as closed
      const threadId = [userId, actualPartnerUserId].sort().join('_');
      const threadRef = db.collection('partnerThreads').doc(threadId);
      batch.set(threadRef, { status: 'closed', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    
    await batch.commit();
    console.log('[FamPals API] Partner unlink successful');
    
    res.json({ success: true });
  } catch (err: any) {
    console.error('[FamPals API] Partner unlink failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to unlink partner', details: err?.message });
  }
});

// Refresh partner status - returns current partner link info for the authenticated user
// Requires Firebase Auth token for security
app.get('/api/partner/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.uid!; // Verified user from auth token
    
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.json({ partnerLink: null });
    }
    
    const userData = userDoc.data() || {};
    const partnerLink = userData.partnerLink ? { ...userData.partnerLink } : null;
    
    // If linked, also get partner's current profile info
    if (partnerLink?.partnerUserId) {
      const partnerDoc = await db.collection('users').doc(partnerLink.partnerUserId).get();
      if (partnerDoc.exists) {
        const partnerData = partnerDoc.data() || {};
        const partnerProfile = partnerData.profile || {};
        partnerLink.partnerName = partnerProfile.displayName || partnerLink.partnerName;
        partnerLink.partnerEmail = partnerProfile.email || partnerLink.partnerEmail;
        partnerLink.partnerPhotoURL = partnerProfile.photoURL || partnerLink.partnerPhotoURL;
      }
    }
    
    res.json({ partnerLink });
  } catch (err: any) {
    console.error('[FamPals API] Partner status fetch failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to fetch partner status', details: err?.message });
  }
});

// Partner link endpoint - handles linking two users when accepting an invite code
// Requires Firebase Auth token for security
// Validates that the invite code matches the partner's pending code
app.post('/api/partner/link', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.uid!; // Verified user from auth token
    const { partnerUserId, partnerName, selfName, inviteCode } = req.body;
    
    if (!partnerUserId) {
      return res.status(400).json({ error: 'Missing partnerUserId' });
    }
    
    console.log('[FamPals API] Partner link request:', { userId, partnerUserId });
    
    // Get partner's info and validate invite code
    const partnerDoc = await db.collection('users').doc(partnerUserId).get();
    if (!partnerDoc.exists) {
      return res.status(404).json({ error: 'Partner not found' });
    }
    const partnerData = partnerDoc.data() || {};
    const partnerProfile = partnerData.profile || {};
    
    // Validate invite code matches partner's pending invite
    const partnerInviteCode = partnerData.partnerLink?.inviteCode;
    const partnerStatus = partnerData.partnerLink?.status;
    
    // If invite code is provided, validate it matches
    if (inviteCode && partnerInviteCode !== inviteCode) {
      console.log('[FamPals API] Invite code mismatch:', { provided: inviteCode, expected: partnerInviteCode });
      return res.status(403).json({ error: 'Invalid invite code' });
    }
    
    // Validate partner has a pending invite code
    if (!partnerInviteCode || partnerStatus === 'accepted') {
      console.log('[FamPals API] Partner does not have a pending invite or is already linked');
      return res.status(400).json({ error: 'Partner does not have a pending invite or is already linked' });
    }
    
    // Get current user's info to update partner's record
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const userProfile = userData?.profile || {};
    
    const batch = db.batch();
    
    // Update current user's partnerLink to accepted
    const userRef = db.collection('users').doc(userId);
    batch.set(userRef, {
      partnerLink: {
        status: 'accepted',
        inviteCode: partnerData.partnerLink?.inviteCode || '',
        createdAt: FieldValue.serverTimestamp(),
        partnerUserId,
        partnerName: partnerProfile.displayName || partnerName || 'Partner',
        partnerEmail: partnerProfile.email,
        partnerPhotoURL: partnerProfile.photoURL,
      }
    }, { merge: true });
    
    // Update partner's partnerLink to mark them as linked
    const partnerRef = db.collection('users').doc(partnerUserId);
    batch.set(partnerRef, {
      partnerLink: {
        status: 'accepted',
        inviteCode: partnerData.partnerLink?.inviteCode || '',
        createdAt: FieldValue.serverTimestamp(),
        partnerUserId: userId,
        partnerName: userProfile.displayName || selfName || 'Partner',
        partnerEmail: userProfile.email,
        partnerPhotoURL: userProfile.photoURL,
      }
    }, { merge: true });
    
    // Create partner thread
    const threadId = [userId, partnerUserId].sort().join('_');
    const threadRef = db.collection('partnerThreads').doc(threadId);
    batch.set(threadRef, {
      members: [userId, partnerUserId],
      createdAt: FieldValue.serverTimestamp(),
      status: 'active',
    }, { merge: true });
    
    await batch.commit();
    console.log('[FamPals API] Partner link successful');
    
    res.json({ 
      success: true, 
      partnerLink: {
        status: 'accepted',
        partnerUserId,
        partnerName: partnerProfile.displayName || partnerName || 'Partner',
        partnerEmail: partnerProfile.email,
        partnerPhotoURL: partnerProfile.photoURL,
      }
    });
  } catch (err: any) {
    console.error('[FamPals API] Partner link failed:', err?.message || err);
    res.status(500).json({ error: 'Failed to link partner', details: err?.message });
  }
});

// In production, serve the built frontend
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  // When running from repo root with `npx tsx server/index.ts`, dist is at ./dist
  const distPath = path.resolve(process.cwd(), 'dist');
  console.log(`[FamPals API] Serving static files from: ${distPath}`);
  console.log(`[FamPals API] Current working directory: ${process.cwd()}`);
  
  // Check if dist folder exists
  if (fs.existsSync(distPath)) {
    console.log(`[FamPals API] dist folder found, serving static files`);
    // Serve static files
    app.use(express.static(distPath));
    
    // Handle client-side routing - serve index.html for all non-API routes
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  } else {
    console.warn(`[FamPals API] WARNING: dist folder not found at ${distPath}`);
    console.log(`[FamPals API] Directory contents:`, fs.readdirSync(process.cwd()));
  }
}

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

// Start server immediately to satisfy Cloud Run health checks
const server = app.listen(Number(PORT), HOST, () => {
  console.log(`[FamPals API] Server running on ${HOST}:${PORT}`);
  console.log(`[FamPals API] Environment: ${isProduction ? 'production' : 'development'}`);
  console.log(`[FamPals API] Paystack configured: ${!!PAYSTACK_SECRET_KEY}`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('[FamPals API] Server error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[FamPals API] SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('[FamPals API] Server closed');
    process.exit(0);
  });
});
