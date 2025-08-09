import * as dotenv from "dotenv";
import type { ServiceAccount } from "firebase-admin";
import * as admin from "firebase-admin";
import fs from "fs";
import path from "path";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Enhanced Firebase Admin initialization with fallbacks (named app)
let app: admin.app.App;

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

function createMockAdmin(): any {
  // Mock admin for development/build mode
  return {
    auth: () => ({
      verifyIdToken: async () => ({ uid: 'mock-user' }),
      getUser: async () => ({ uid: 'mock-user', email: 'mock@example.com' })
    }),
    firestore: () => ({
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
    })
  };
}

// Export Firebase Admin services for use in other parts of your application
export const adminDb = app.firestore();
try {
  // Ensure optional undefined properties in objects are ignored (avoids write errors)
  // @ts-ignore - depends on Firestore SDK version
  adminDb.settings?.({ ignoreUndefinedProperties: true });
} catch (e) {
  console.warn('[Firebase Admin] Could not apply ignoreUndefinedProperties:', (e as any)?.message);
}
try {
  // Allow omitting optional undefined fields without errors
  // (No-op in newer SDKs if already the default)
  // @ts-ignore - settings may exist depending on firestore version
  adminDb.settings?.({ ignoreUndefinedProperties: true });
} catch (e) {
  console.warn('[Firebase Admin] Failed to apply ignoreUndefinedProperties:', (e as any)?.message);
}
export const adminAuth = app.auth();
export { app as adminApp };
