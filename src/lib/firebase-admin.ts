import * as dotenv from "dotenv";
import type { ServiceAccount } from "firebase-admin";
import * as admin from "firebase-admin";
import fs from "fs";
import path from "path";

// Load environment variables in non-production for local dev
if (process.env.NODE_ENV !== "production") {
  try {
    dotenv.config({ path: ".env.local" });
  } catch {
    /* optional */
  }
}

// Enhanced Firebase Admin initialization with fallbacks (named app)
let app: admin.app.App;

// Lightweight in-module diagnostics for initialization errors
const firebaseAdminDiagnostics: {
  errors: Array<{ message: string; code?: string }>;
} = { errors: [] };

try {
  // Test-only escape hatch to force mock admin for unit tests
  if (process.env.FIREBASE_ADMIN_FORCE_MOCK === "1") {
    app = createMockAdmin();
  } else {
    // Reuse or initialize a named app to avoid stale default app credentials on HMR
    app = admin.app("rankpilot-admin");
  }
} catch {
  try {
    app = initializeFirebaseAdmin("rankpilot-admin");
  } catch (error) {
    console.warn(
      "[Firebase Admin] Initialization failed, using development fallback:",
      error
    );
    // In development/build mode, create a mock admin for static generation
    app = createMockAdmin();
  }
}

/**
 * The client (connection-manager.ts) treats placeholder NEXT_PUBLIC_FIREBASE_* values as missing and
 * falls back to the known public project config. The admin SDK MUST resolve the SAME project id, or
 * verifyIdToken rejects otherwise-valid tokens with an audience mismatch — every Bearer-auth SSR
 * route then 401s. The project id is public (not a secret), so a built-in fallback is safe and must
 * match the client's fallback in connection-manager.ts.
 */
function isPlaceholderProjectId(v?: string): boolean {
  return (
    !v ||
    v.trim() === "" ||
    /^(firebase_|your[_-]|placeholder|example|changeme|xxx|<)/i.test(v.trim())
  );
}
function resolveAdminProjectId(): string {
  for (const candidate of [
    process.env.FIREBASE_ADMIN_PROJECT_ID,
    process.env.FIREBASE_PROJECT_ID,
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  ]) {
    if (!isPlaceholderProjectId(candidate)) return (candidate as string).trim();
  }
  return "rankpilot-h3jpc";
}

function initializeFirebaseAdmin(name?: string): admin.app.App {
  // Try different configuration methods

  // Prefer explicit admin env vars first (more reliable in CI/tests)
  const envProjectId = resolveAdminProjectId();
  const envPrivateKey = (
    process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY
  )?.replace(/\\n/g, "\n");
  const envClientEmail =
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
    process.env.FIREBASE_CLIENT_EMAIL;
  if (envProjectId && envPrivateKey && envClientEmail) {
    const serviceAccount: Partial<ServiceAccount> = {
      projectId: envProjectId,
      privateKey: envPrivateKey,
      clientEmail: envClientEmail,
    };
    try {
      return admin.initializeApp(
        {
          credential: admin.credential.cert(serviceAccount as ServiceAccount),
          projectId: envProjectId,
        },
        name
      );
    } catch (e) {
      console.warn(
        "[Firebase Admin] Admin env var initialization failed, falling back:",
        e
      );
    }
  }

  // Method 2: Service Account JSON via env
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      return admin.initializeApp(
        {
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id,
        },
        name
      );
    } catch (error) {
      console.warn(
        "[Firebase Admin] Service account JSON parsing failed:",
        error
      );
    }
  }

  // Method 2: Local serviceAccount.json if present (dev convenience)
  try {
    const saPath = path.resolve(process.cwd(), "serviceAccount.json");
    if (fs.existsSync(saPath)) {
      const raw = fs.readFileSync(saPath, "utf8");
      const sa = JSON.parse(raw);
      return admin.initializeApp(
        {
          credential: admin.credential.cert(sa),
          projectId:
            sa.project_id ||
            sa.projectId ||
            process.env.FIREBASE_PROJECT_ID ||
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        },
        name
      );
    }
  } catch (e) {
    console.warn("[Firebase Admin] Local serviceAccount.json load failed:", e);
  }

  // Method 3: Local serviceAccount.json and then ADC handled below

  // Method 4: Application Default Credentials (for production)
  if (process.env.NODE_ENV === "production") {
    return admin.initializeApp(
      {
        credential: admin.credential.applicationDefault(),
        projectId: resolveAdminProjectId(),
      },
      name
    );
  }

  throw new Error("No valid Firebase admin configuration found");
}

function createMockAdmin(): admin.app.App {
  // Create minimalist stub implementing subset of admin.app.App we use
  const mockApp = {
    name: "mock-app",
    options: {},
    delete: async () => {
      /* noop */
    },
  } as unknown as admin.app.App;
  // Attach needed service accessors via module augmentation pattern
  (mockApp as unknown as { auth: () => unknown }).auth = () => ({
    verifyIdToken: async () => ({ uid: "mock-user" }),
    getUser: async () => ({ uid: "mock-user", email: "mock@example.com" }),
  });
  (mockApp as unknown as { firestore: () => unknown }).firestore = () => {
    // Minimal in-memory store (no persistence) to satisfy API shape
    const makeEmptySnap = () => ({
      empty: true,
      size: 0,
      docs: [] as Array<{ id: string; data: () => unknown }>,
      forEach: (_: unknown) => {},
    });

    // Query/Collection builder with chainable methods
    type MockDocRef = {
      id: string;
      get: () => Promise<{ exists: boolean; id: string; data: () => unknown }>;
      set: (data: unknown, opts?: unknown) => Promise<Record<string, never>>;
      update: (data: unknown) => Promise<Record<string, never>>;
      collection: (name: string) => MockQuery;
    };
    type MockQuery = {
      orderBy: () => MockQuery;
      where: () => MockQuery;
      limit: () => MockQuery;
      get: () => Promise<{
        empty: boolean;
        size: number;
        docs: Array<{ id: string; data: () => unknown }>;
        forEach: (cb: (d: unknown) => void) => void;
      }>;
      doc: (id?: string) => MockDocRef;
      add: (data?: unknown) => Promise<{ id: string }>;
      collection: (name: string) => MockQuery;
    };

    const makeQuery = (): MockQuery => {
      const q: MockQuery = {
        orderBy: () => q,
        where: () => q,
        limit: () => q,
        get: async () => makeEmptySnap(),
        doc: (id?: string) => makeDocRef(id),
        add: async (_data?: unknown) => ({
          id: `mock_${Math.random().toString(36).slice(2, 9)}`,
        }),
        collection: (_name: string) => makeQuery(),
      };
      return q;
    };

    const makeDocRef = (id?: string): MockDocRef => {
      const ref: MockDocRef = {
        id: id || `mock_${Math.random().toString(36).slice(2, 9)}`,
        get: async () => ({ exists: false, id: ref.id, data: () => null }),
        set: async (_data: unknown, _opts?: unknown) => ({}),
        update: async (_data: unknown) => ({}),
        collection: (_name: string) => makeQuery(),
      };
      return ref;
    };

    type MockBatch = {
      set: (ref: unknown, data: unknown, opts?: unknown) => void;
      update: (ref: unknown, data: unknown) => void;
      delete: (ref: unknown) => void;
      commit: () => Promise<number>;
    };
    type MockTx = {
      get: (ref: unknown) => Promise<{ exists: boolean; data: () => unknown }>;
      set: (ref: unknown, data: unknown, opts?: unknown) => void;
      update: (ref: unknown, data: unknown) => void;
      delete: (ref: unknown) => void;
    };
    type MockDb = {
      collection: (name: string) => MockQuery;
      batch: () => MockBatch;
      runTransaction: <T>(fn: (tx: MockTx) => Promise<T>) => Promise<T>;
      settings: (opts?: unknown) => void;
    };

    const db: MockDb = {
      collection: (_name: string) => makeQuery(),
      batch: () => {
        const ops: Array<unknown> = [];
        return {
          set: (_ref: unknown, _data: unknown, _opts?: unknown) => {
            ops.push({ type: "set" });
          },
          update: (_ref: unknown, _data: unknown) => {
            ops.push({ type: "update" });
          },
          delete: (_ref: unknown) => {
            ops.push({ type: "delete" });
          },
          commit: async () => ops.length,
        };
      },
      runTransaction: async <T>(fn: (tx: MockTx) => Promise<T>): Promise<T> => {
        const tx: MockTx = {
          get: async (_ref: unknown) => ({ exists: false, data: () => null }),
          set: (_ref: unknown, _data: unknown, _opts?: unknown) => {},
          update: (_ref: unknown, _data: unknown) => {},
          delete: (_ref: unknown) => {},
        };
        return await fn(tx);
      },
      settings: (_opts?: unknown) => {},
    };
    return db;
  };
  (mockApp as unknown as { storage: () => unknown }).storage = () => ({
    bucket: () => ({}),
  });
  return mockApp;
}

// Export Firebase Admin services for use in other parts of your application
export const adminDb = app.firestore();
// Apply settings only once per process to avoid noisy warnings in dev HMR
const SETTINGS_KEY = "__RP_FIRESTORE_SETTINGS_APPLIED__";
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
  const msg =
    typeof e === "object" &&
    e &&
    "message" in (e as Record<string, unknown>) &&
    typeof (e as { message?: unknown }).message === "string"
      ? (e as { message: string }).message
      : String(e);
  const code =
    typeof e === "object" &&
    e &&
    "code" in (e as Record<string, unknown>) &&
    typeof (e as { code?: unknown }).code === "string"
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

// --- Lightweight environment diagnostics (PROD only, logs once) ---
try {
  const DIAG_KEY = "__RP_ADMIN_INIT_DIAG_LOGGED__";
  // @ts-ignore
  if (process.env.NODE_ENV === "production" && !(global as unknown)[DIAG_KEY]) {
    const proj =
      process.env.FIREBASE_ADMIN_PROJECT_ID ||
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      "unknown";
    const mode = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? "service_account_json"
      : process.env.FIREBASE_ADMIN_PRIVATE_KEY &&
          process.env.FIREBASE_ADMIN_CLIENT_EMAIL
        ? "admin_env_vars"
        : "application_default";
    console.info("[Firebase Admin] Initialized", {
      projectId: proj,
      credentialMode: mode,
    });
    // @ts-ignore
    (global as unknown)[DIAG_KEY] = true;
  }
} catch {
  /* ignore diag errors */
}
