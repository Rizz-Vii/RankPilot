import * as dotenv from "dotenv";
import type { ServiceAccount } from "firebase-admin";
import * as admin from "firebase-admin";
import fs from "fs";
import path from "path";

// Load environment variables in non-production for local dev
if (process.env.NODE_ENV !== 'production') {
  try { dotenv.config({ path: ".env.local" }); } catch { /* optional */ }
}

// Enhanced Firebase Admin initialization with fallbacks (named app)
let app: admin.app.App;

// Lightweight in-module diagnostics for initialization errors
const firebaseAdminDiagnostics: { errors: Array<{ message: string; code?: string }> } = { errors: [] };

try {
  // Reuse or initialize a named app to avoid stale default app credentials on HMR
  app = admin.app('rankpilot-admin');
} catch {
  try {
    app = initializeFirebaseAdmin('rankpilot-admin');
  } catch (error) {
    console.warn('[Firebase Admin] Initialization failed, using development fallback:', error);
    // In development/build mode, create a mock admin for static generation
    app = createMockAdmin();
  }
}

function initializeFirebaseAdmin(name?: string): admin.app.App {
  // Try different configuration methods

  // Method 1: Service Account JSON via env (highest priority in dev)
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      }, name);
    } catch (error) {
      console.warn('[Firebase Admin] Service account JSON parsing failed:', error);
    }
  }

  // Method 2: Local serviceAccount.json if present (dev convenience)
  try {
    const saPath = path.resolve(process.cwd(), "serviceAccount.json");
    if (fs.existsSync(saPath)) {
      const raw = fs.readFileSync(saPath, "utf8");
      const sa = JSON.parse(raw);
      return admin.initializeApp({
        credential: admin.credential.cert(sa),
        projectId: sa.project_id || sa.projectId || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      }, name);
    }
  } catch (e) {
    console.warn('[Firebase Admin] Local serviceAccount.json load failed:', e);
  }

  // Method 3: Individual environment variables
  const serviceAccount: Partial<ServiceAccount> = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID ||
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    // Support both FIREBASE_ADMIN_* and plain FIREBASE_* env var names
    privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY)?.replace(/\\n/g, "\n"),
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL,
  };

  if (serviceAccount.projectId && serviceAccount.privateKey && serviceAccount.clientEmail) {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as ServiceAccount),
      projectId: serviceAccount.projectId
    }, name);
  }

  // Method 4: Application Default Credentials (for production)
  if (process.env.NODE_ENV === 'production') {
    return admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    }, name);
  }

  throw new Error('No valid Firebase admin configuration found');
}

function createMockAdmin(): admin.app.App {
  // Create minimalist stub implementing subset of admin.app.App we use
  const mockApp = {
    name: 'mock-app',
    options: {},
    delete: async () => { /* noop */ },
  } as unknown as admin.app.App;
  // Attach needed service accessors via module augmentation pattern
  (mockApp as unknown as { auth: () => unknown }).auth = () => ({
    verifyIdToken: async () => ({ uid: 'mock-user' }),
    getUser: async () => ({ uid: 'mock-user', email: 'mock@example.com' })
  });
  (mockApp as unknown as { firestore: () => unknown }).firestore = () => ({
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: false, data: () => null }),
        set: async () => ({}),
        update: async () => ({})
      }),
      add: async () => ({ id: 'mock-id' }),
      where: () => ({
        get: async () => ({ empty: true, docs: [] })
      })
    })
  });
  (mockApp as unknown as { storage: () => unknown }).storage = () => ({ bucket: () => ({}) });
  return mockApp;
}

// Export Firebase Admin services for use in other parts of your application
export const adminDb = app.firestore();
// Apply settings only once per process to avoid noisy warnings in dev HMR
const SETTINGS_KEY = '__RP_FIRESTORE_SETTINGS_APPLIED__';
try {
  // @ts-ignore
  if (!(global as unknown)[SETTINGS_KEY]) {
    // @ts-ignore
    adminDb.settings?.({ ignoreUndefinedProperties: true });
    // @ts-ignore
    (global as unknown)[SETTINGS_KEY] = true;
  }
} catch (e) {
  // Capture diagnostics without throwing
  const msg = typeof e === "object" && e && "message" in (e as Record<string, unknown>
    ) && typeof (e as { message?: unknown }).message === "string"
      ? (e as { message: string }).message
      : String(e);
  const code = typeof e === "object" && e && "code" in (e as Record<string, unknown>) && typeof (e as { code?: unknown }).code === "string"
      ? (e as { code: string }).code
      : undefined;
  firebaseAdminDiagnostics.errors.push({ message: msg, code });
  if (firebaseAdminDiagnostics.errors.length > 50) {
    firebaseAdminDiagnostics.errors.shift();
  }
}
export const adminAuth = app.auth();
export { app as adminApp };
// Storage for server-side artifact uploads (exports, reports, etc.)
export const adminStorage = app.storage();
