import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  collection,
  collectionGroup,
  query,
  where,
  addDoc,
  FieldPath,
  documentId,
  deleteDoc,
  deleteField,
  getDocs,
  getDoc,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isConfigValid = firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.authDomain;

let app = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
let storage: ReturnType<typeof getStorage> | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (isConfigValid) {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  googleProvider = new GoogleAuthProvider();

  setPersistence(auth, browserLocalPersistence).catch((e) => {
    console.warn("Auth persistence failed", e);
  });
}

export const isFirebaseConfigured = isConfigValid && !!app;
export const firebaseConfigError = !isConfigValid 
  ? "Firebase is not configured. Please add Firebase secrets (VITE_FIREBASE_API_KEY, etc.) in the Secrets tab."
  : null;

export {
  auth,
  db,
  storage,
  googleProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  getDocs,
  collection,
  collectionGroup,
  query,
  where,
  addDoc,
  FieldPath,
  documentId,
  deleteDoc,
  deleteField,
  writeBatch,
  serverTimestamp,
  Timestamp,
  ref,
  uploadBytes,
  getDownloadURL
};
