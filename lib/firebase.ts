
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, query, where, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Attempt to get config from environment or use placeholders
// To fix the error: Replace these with values from Firebase Console > Project Settings > General > Your Apps (Web)
const firebaseConfig = {
  apiKey: (process.env as any).FIREBASE_API_KEY || "REPLACE_WITH_YOUR_FIREBASE_KEY",
  authDomain: (process.env as any).FIREBASE_AUTH_DOMAIN || "fampals-app.firebaseapp.com",
  projectId: (process.env as any).FIREBASE_PROJECT_ID || "fampals-app",
  storageBucket: (process.env as any).FIREBASE_STORAGE_BUCKET || "fampals-app.appspot.com",
  messagingSenderId: (process.env as any).FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: (process.env as any).FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

// Check if we have a valid key (not the placeholder)
export const isFirebaseConfigured = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "REPLACE_WITH_YOUR_FIREBASE_KEY" &&
  firebaseConfig.apiKey.length > 10;

let app;
let auth: any;
let db: any;
let googleProvider: any;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
  } catch (error) {
    console.error("Firebase Initialization Error:", error);
  }
} else {
  console.warn("FamPals: Firebase is not configured. Google Login and Cloud Sync are disabled. Using Guest Mode (Local Storage).");
}

export { auth, db, googleProvider };
export { signInWithPopup, onAuthStateChanged, signOut, doc, setDoc, getDoc, onSnapshot, collection, query, where, addDoc };
