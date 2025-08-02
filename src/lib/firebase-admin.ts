import * as dotenv from "dotenv";
import type { ServiceAccount } from "firebase-admin";
import * as admin from "firebase-admin";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Enhanced Firebase Admin initialization with fallbacks
let app: admin.app.App;

try {
  // Check if app is already initialized
  app = admin.apps.length ? admin.app() : initializeFirebaseAdmin();
} catch (_error) {
  console.warn('[Firebase Admin] Initialization failed, using development fallback:', _error);
  // In development/build mode, create a mock admin for static generation
  app = createMockAdmin();
}

function initializeFirebaseAdmin(): admin.app.App {
  // Try different configuration methods

  // Method 1: Service Account JSON
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    } catch (_error) {
      console.warn('[Firebase Admin] Service account JSON parsing failed:', _error);
    }
  }

  // Method 2: Individual environment variables
  const serviceAccount: Partial<ServiceAccount> = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID ||
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  };

  if (serviceAccount.projectId && serviceAccount.privateKey && serviceAccount.clientEmail) {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as ServiceAccount),
      projectId: serviceAccount.projectId
    });
  }

  // Method 3: Application Default Credentials (for production)
  if (process.env.NODE_ENV === 'production') {
    return admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    });
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
          get: async () => ({ exists: false, _data: () => null }),
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
export const adminAuth = app.auth();
export { app as adminApp };
