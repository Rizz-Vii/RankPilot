/**
 * Firebase Connection Manager - Single Instance Management
 * Fixes Firestore internal assertion failures and connection issues
 */

import type { FirebaseApp } from "firebase/app";
import { getApp, getApps, initializeApp } from "firebase/app";
import type { Firestore, FirestoreSettings } from "firebase/firestore";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  terminate,
} from "firebase/firestore";
// App Check is dynamically imported in-browser to avoid bundling/module resolution issues when unavailable.

// Firebase configuration - production requires env; dev falls back to defaults for local convenience
const firebaseConfig = (() => {
  // Treat empty OR placeholder env values (e.g. ".env" templates such as
  // "firebase_public_api_key") as missing, so the known-good public project
  // config below is used instead of passing an invalid key to the Firebase
  // SDK — which otherwise throws auth/api-key-not-valid. Firebase web config
  // values are public by design, so embedding them as a fallback is safe.
  const isPlaceholder = (v?: string): boolean =>
    !v ||
    v.trim() === "" ||
    /^(firebase_|your[_-]|placeholder|example|changeme|xxx|<)/i.test(v.trim());
  const pick = (envVal: string | undefined, fallback: string): string =>
    isPlaceholder(envVal) ? fallback : (envVal as string).trim();

  if (
    process.env.NODE_ENV === "production" &&
    isPlaceholder(process.env.NEXT_PUBLIC_FIREBASE_API_KEY)
  ) {
    // Non-fatal: fall back to the built-in public config rather than crashing.
    console.warn(
      "[Firebase] NEXT_PUBLIC_FIREBASE_* missing/placeholder; using built-in public project config."
    );
  }

  return {
    apiKey: pick(
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      "AIzaSyB_HzRrVdysW3o-UXUdCkPqW9rH4fWWjyY"
    ),
    authDomain: pick(
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      "rankpilot-h3jpc.firebaseapp.com"
    ),
    projectId: pick(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, "rankpilot-h3jpc"),
    storageBucket: pick(
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      "rankpilot-h3jpc.appspot.com"
    ),
    messagingSenderId: pick(
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      "283736429782"
    ),
    appId: pick(
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      "1:283736429782:web:a3e387a3a79a592121e577"
    ),
  };
})();

// Global sentinel key to suppress duplicate noisy init logs across HMR / route workers
// (placed on globalThis to survive module reload boundaries in dev)
const CLIENT_INIT_SENTINEL = "__RP_FIREBASE_INIT_LOGGED__";

// Local diagnostics for connection initialization
const connectionMetrics: {
  errorCount: number;
  lastError: { message: string; code?: string } | null;
} = {
  errorCount: 0,
  lastError: null,
};

function safeSerialize(err: unknown): { message: string; code?: string } {
  if (typeof err === "string") return { message: err };
  if (err && typeof err === "object") {
    const obj = err as { [key: string]: unknown };
    const message = typeof obj.message === "string" ? obj.message : String(err);
    const code = typeof obj.code === "string" ? obj.code : undefined;
    return { message, code };
  }
  return { message: "Unknown error" };
}

class FirestoreConnectionManager {
  private static instance: FirestoreConnectionManager;
  private db: Firestore | null = null;
  private app: FirebaseApp | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): FirestoreConnectionManager {
    if (!FirestoreConnectionManager.instance) {
      FirestoreConnectionManager.instance = new FirestoreConnectionManager();
    }
    return FirestoreConnectionManager.instance;
  }

  getDatabase(): Firestore {
    if (!this.initialized) {
      this.initializeDatabase();
    }
    return this.db!;
  }

  private initializeDatabase() {
    try {
      // Ensure single app instance - prevents "Firebase App named '[DEFAULT]' already exists" errors
      if (getApps().length === 0) {
        this.app = initializeApp(firebaseConfig);
        // Only log once per process in the browser
        try {
          if (typeof window !== "undefined") {
            const g = globalThis as Record<string, unknown>;
            if (!g[CLIENT_INIT_SENTINEL]) {
              console.log("🔥 Firebase app initialized");
              g[CLIENT_INIT_SENTINEL] = true;
            }
          }
        } catch {
          /* ignore sentinel issues */
        }
      } else {
        this.app = getApp();
        // Suppress noisy reuse log (can be re-enabled with NEXT_PUBLIC_FIREBASE_VERBOSE_INIT=1)
        if (process.env.NEXT_PUBLIC_FIREBASE_VERBOSE_INIT === "1") {
          console.log("🔥 Using existing Firebase app");
        }
      }

      // App Check: disabled by default to avoid bundling issues unless explicitly enabled with a shim.
      // TODO: Re-enable via a local shim or optional dependency gating when production App Check enforcement is required.

      // Initialize Firestore with robust browser settings (before any Firestore use)
      type FirestoreInitSettings = FirestoreSettings & {
        experimentalForceLongPolling?: boolean;
        experimentalAutoDetectLongPolling?: boolean;
        experimentalLongPollingOptions?: { timeoutSeconds: number };
        useFetchStreams?: boolean;
      };

      const settings: FirestoreInitSettings = {
        ignoreUndefinedProperties: true,
        // Disable experimental streams to avoid incompatibilities with certain proxies.
        useFetchStreams: false,
      };
      if (typeof window !== "undefined") {
        // Always prefer conservative transport to avoid proxy/CDN issues
        // Decide mode first to avoid mutually-exclusive flag conflict
        const envForce = process.env.NEXT_PUBLIC_FIRESTORE_FORCE_LONG_POLLING;
        const shouldForceLongPolling =
          envForce === "true" ||
          (process.env.NODE_ENV === "production" && envForce !== "false");
        const wantAutoDetect =
          process.env.NEXT_PUBLIC_FIRESTORE_AUTODETECT_LONG_POLLING !== "false";

        if (shouldForceLongPolling) {
          // Force long polling: DO NOT set autoDetect alongside this
          settings.experimentalForceLongPolling = true;
        } else if (wantAutoDetect) {
          // Otherwise allow the SDK to auto-detect when to use long polling
          settings.experimentalAutoDetectLongPolling = true;
        }

        // Disable fetch streams which can be blocked by some edges/CDNs
        // (Firestore will fallback to XHR/WebChannel or long polling)
        settings.useFetchStreams = false;

        // Optional: reduce initial backoff for faster recoveries in flaky networks
        const lpMs = Number(
          process.env.NEXT_PUBLIC_FIRESTORE_LONG_POLLING_PING_MS || "0"
        );
        if (!Number.isNaN(lpMs) && lpMs > 0) {
          settings.experimentalLongPollingOptions = {
            timeoutSeconds: Math.max(10, Math.min(30, Math.round(lpMs / 1000))),
          };
        }
      }

      this.db = initializeFirestore(this.app, settings);

      // Optional: connect to emulator when explicitly requested
      if (
        typeof window !== "undefined" &&
        process.env.NEXT_PUBLIC_USE_FIRESTORE_EMULATOR === "true"
      ) {
        const host =
          process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || "127.0.0.1";
        const port = Number(
          process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || 8080
        );
        try {
          connectFirestoreEmulator(this.db, host, port);
          console.log(`🔧 Connected to Firestore emulator at ${host}:${port}`);
        } catch (error) {
          // Track emulator connection issues without failing init
          connectionMetrics.lastError = safeSerialize(error);
          connectionMetrics.errorCount++;
          console.log("🔧 Firestore emulator already connected");
        }
      }

      this.initialized = true;
      if (process.env.NEXT_PUBLIC_FIREBASE_VERBOSE_INIT === "1") {
        console.log("✅ Firestore connection established successfully");
      }
    } catch (error) {
      console.error("❌ Firestore initialization failed:", error);
      throw error;
    }
  }

  async resetConnection(): Promise<void> {
    try {
      if (this.db) {
        await terminate(this.db);
        console.log("🧹 Firestore connection terminated");
      }

      this.db = null;
      this.initialized = false;
      this.initializeDatabase();

      console.log("🔄 Firestore connection reset successfully");
    } catch (error) {
      console.error("❌ Failed to reset Firestore connection:", error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.initialized && this.db !== null;
  }

  // Expose app instance (ensures initialization if not already done)
  getAppInstance(): FirebaseApp {
    if (!this.initialized) {
      this.initializeDatabase();
    }
    return this.app!;
  }
}

// Export singleton instance (no side effects)
export const connectionManager = FirestoreConnectionManager.getInstance();

// Lazy, explicit getters to avoid initializing during SSR/import time
export const getClientDb = (): Firestore => connectionManager.getDatabase();
export const getClientApp = (): FirebaseApp =>
  connectionManager.getAppInstance();
export const resetFirestoreConnection = (): Promise<void> =>
  connectionManager.resetConnection();

// Health check function
export const validateConnection = async (): Promise<boolean> => {
  try {
    if (!connectionManager.isConnected()) {
      console.warn("⚠️ Firestore not connected, attempting to reconnect...");
      await connectionManager.resetConnection();
    }
    return true;
  } catch (error) {
    console.error("❌ Firestore connection validation failed:", error);
    return false;
  }
};
