import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function getCurrentUsageMonthUtc() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getNextResetDateUtcIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0)).toISOString();
}

async function initAdmin() {
  if (getApps().length) return;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
    return;
  }
  initializeApp();
}

async function run() {
  const email = process.env.REVIEW_ACCOUNT_EMAIL || 'review@fampal.co.za';
  const password = requireEnv('REVIEW_ACCOUNT_PASSWORD');
  await initAdmin();

  const auth = getAuth();
  const db = getFirestore();

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
  } catch (err) {
    if (err?.code !== 'auth/user-not-found') {
      throw err;
    }
    userRecord = await auth.createUser({
      email,
      password,
      emailVerified: true,
      disabled: false,
    });
  }

  await auth.updateUser(userRecord.uid, {
    password,
    emailVerified: true,
    disabled: false,
  });

  const usageResetMonth = getCurrentUsageMonthUtc();
  const resetDate = getNextResetDateUtcIso();
  const entitlement = {
    subscription_tier: 'admin',
    subscription_status: 'active',
    subscription_source: 'admin',
    gemini_credits_used: 0,
    gemini_credits_limit: -1,
    usage_reset_month: usageResetMonth,
    plan_tier: 'lifetime',
    plan_status: 'active',
    entitlement_source: 'admin',
    entitlement_start_date: new Date().toISOString(),
    entitlement_end_date: null,
    ai_requests_this_month: 0,
    ai_requests_reset_date: resetDate,
    unlimited_credits: true,
  };

  await db.collection('users').doc(userRecord.uid).set({
    role: 'admin',
    entitlement,
    subscription_status: 'active',
    gemini_credits_used: 0,
    usage_reset_month: usageResetMonth,
    unlimited_credits: true,
    is_review_account: true,
    created_for: 'google_play_review',
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log('Review account ready:', { uid: userRecord.uid, email });
}

run().catch((err) => {
  console.error('Failed to create/update review account:', err);
  process.exit(1);
});
