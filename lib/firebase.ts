
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, query, where, addDoc } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-analytics.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDHr6-i8HRApiGdk60WheG_wrnDCazP4Fw",
  authDomain: "fampals-7e4fd.firebaseapp.com",
  projectId: "fampals-7e4fd",
  storageBucket: "fampals-7e4fd.firebasestorage.app",
  messagingSenderId: "925495129376",
  appId: "1:925495129376:web:de6e6927a2518b4e5f1345",
  measurementId: "G-FXP72FLPRF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();


export { auth, db, googleProvider, analytics };
export { signInWithPopup, onAuthStateChanged, signOut, doc, setDoc, getDoc, onSnapshot, collection, query, where, addDoc };
