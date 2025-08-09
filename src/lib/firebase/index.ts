import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getAnalytics, isSupported } from "firebase/analytics";

// Firebase configuration from environment variables with fallbacks
// Firebase configuration from environment variables with fallbacks
const firebaseConfig: {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
} = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyB_HzRrVdysW3o-UXUdCkPqW9rH4fWWjyY",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "rankpilot-h3jpc.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "rankpilot-h3jpc",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "rankpilot-h3jpc.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "283736429782",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:283736429782:web:a3e387a3a79a592121e577",
  // Only needed for Analytics; ensure provided in production builds
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
};

// Initialize Firebase using a singleton pattern
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Cloud Functions and get a reference to the service
// Use explicit region (project standard: australia-southeast2) to avoid default us-central1 CORS issues
export const functions = getFunctions(app, "australia-southeast2");

// Storage (for media uploads in chat, etc.)
export const storage = getStorage(app);

// Optional: connect to emulator in local dev if env flag set
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_USE_FUNCTIONS_EMULATOR === 'true') {
  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
  } catch { }
}

// Initialize Analytics (only in browser, production, and if supported)
let analytics: any = null;
if (
  typeof window !== "undefined" &&
  process.env.NODE_ENV === "production" &&
  !!firebaseConfig.measurementId
) {
  isSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch {
        // Silently ignore analytics init errors in production
        analytics = null;
      }
    }
  });
}
export { analytics };
