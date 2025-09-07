// Unified Firebase client exports leveraging connection-manager singleton to avoid duplicate init & logs
// IMPORTANT: Export concrete instances in the browser (no Proxies) so Firebase SDK identity checks pass.
import { getClientApp, getClientDb } from "@/lib/firebase/connection-manager";
import type { Analytics } from "firebase/analytics";
import type { FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  connectFunctionsEmulator,
  getFunctions,
  type Functions,
} from "firebase/functions";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const isBrowser = typeof window !== "undefined";

// Prefer server-set FIREBASE_REGION; fall back to NEXT_PUBLIC_FUNCTIONS_REGION; default to primary functions region
const FUNCTIONS_REGION =
  process.env.FIREBASE_REGION ||
  process.env.NEXT_PUBLIC_FUNCTIONS_REGION ||
  "australia-southeast1";

// Initialize concrete instances only in the browser. On the server, export lazy getters to avoid SSR crashes.
import type { Firestore } from "firebase/firestore";
let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;
let _functions: Functions | null = null;
let _storage: FirebaseStorage | null = null;

// Export non-nullable types for TS while keeping SSR-safe runtime behavior.
export const app: FirebaseApp = isBrowser
  ? (_app ||= getClientApp())
  : ({} as unknown as FirebaseApp);
export const db: Firestore = isBrowser
  ? (_db ||= getClientDb())
  : ({} as unknown as Firestore);
export const auth: Auth = isBrowser
  ? (_auth ||= getAuth(app))
  : ({} as unknown as Auth);
export const functions: Functions = isBrowser
  ? (_functions ||= getFunctions(app, FUNCTIONS_REGION))
  : ({} as unknown as Functions);
export const storage: FirebaseStorage = isBrowser
  ? (_storage ||= getStorage(app))
  : ({} as unknown as FirebaseStorage);

// Optionally connect Functions emulator (browser only)
if (
  isBrowser &&
  process.env.NEXT_PUBLIC_USE_FUNCTIONS_EMULATOR === "true" &&
  functions
) {
  try {
    connectFunctionsEmulator(functions, "localhost", 5001);
  } catch {
    /* already connected */
  }
}

// Analytics (only prod + supported + measurementId provided via env) - lazily initialize (browser only)
let analyticsInstance: Analytics | null = null;
if (isBrowser && process.env.NODE_ENV === "production") {
  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
  if (measurementId) {
    void (async () => {
      try {
        const mod = await import("firebase/analytics");
        const supported = await (mod.isSupported
          ? mod.isSupported()
          : Promise.resolve(false));
        if (supported && app) {
          try {
            analyticsInstance = mod.getAnalytics(app);
          } catch {
            analyticsInstance = null;
          }
        }
      } catch {
        // ignore analytics load failures; keep core bundle lean
      }
    })();
  }
}
export const analytics: Analytics | null = analyticsInstance;

// Safe accessors for environments that might import this module on the server
export const getFirebaseClient = () => ({
  app,
  db,
  auth,
  functions,
  storage,
  analytics,
});
