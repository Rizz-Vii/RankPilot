/**
 * Offline Queue Utilities
 * Minimal client-side helpers to enqueue analysis requests and preference updates
 * into IndexedDB for the service worker to sync when connectivity is available.
 *
 * Stores (must match service worker):
 * - pendingAnalysisRequests
 * - pendingPreferences
 *
 * Background sync tags (must match service worker):
 * - 'neuroseo-analysis'
 * - 'user-preferences'
 */

// Guard for SSR
const isBrowser = typeof window !== 'undefined' && typeof indexedDB !== 'undefined';

const IDB_NAME = 'rankpilot-offline';
const IDB_VERSION = 1;
const STORE_ANALYSIS = 'pendingAnalysisRequests';
const STORE_PREFS = 'pendingPreferences';

function openDB(): Promise<IDBDatabase> {
    if (!isBrowser) return Promise.reject(new Error('indexedDB not available'));
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_ANALYSIS)) {
                db.createObjectStore(STORE_ANALYSIS, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(STORE_PREFS)) {
                db.createObjectStore(STORE_PREFS, { keyPath: 'id', autoIncrement: true });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function withStore<T>(db: IDBDatabase, store: string, mode: IDBTransactionMode, fn: (os: IDBObjectStore) => void, onComplete: (result: T) => void, onError: (err: unknown) => void) {
    try {
        const tx = db.transaction(store, mode);
        const os = tx.objectStore(store);
        let out: T | undefined;
        tx.oncomplete = () => onComplete(out as T);
        tx.onerror = () => onError(tx.error);
        // Let fn set out via request callbacks
        const proxy = new Proxy(os, {
            get(target, prop, receiver) {
                const v = Reflect.get(target, prop, receiver);
                if (typeof v === 'function') {
                    return function <A extends unknown[]>(this: IDBObjectStore, ...args: A) {
                        // Bind the original object store as context (dynamic IDB API call)
                        const req = (v as (...a: A) => IDBRequest).apply(target, args);
                        if ((prop === 'add' || prop === 'put') && req) {
                            req.onsuccess = () => { out = req.result as T; };
                        }
                        return req;
                    };
                }
                return v;
            }
        });
        fn(proxy);
    } catch (e) {
        onError(e);
    }
}

async function registerSync(tag: 'neuroseo-analysis' | 'user-preferences') {
    if (!isBrowser) return;
    try {
        const reg = await navigator.serviceWorker?.ready;
        // Background Sync is not in the default TS lib for ServiceWorkerRegistration.
        // Use a narrowed type and optional chaining so typecheck passes even if unavailable.
        type SWRegWithSync = ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } };
        const withSync = reg as unknown as SWRegWithSync | undefined;
        await withSync?.sync?.register(tag);
    } catch {
        // Ignore if Background Sync not available
    }
}

export type EnqueueResult = { id: number };

/**
 * Queue a NeuroSEO analysis request payload for background sync.
 * Returns the auto-incremented ID assigned by IndexedDB.
 */
export async function queueAnalysisRequest(data: unknown): Promise<EnqueueResult> {
    const db = await openDB();
    return new Promise<EnqueueResult>((resolve, reject) => {
        withStore<number>(db, STORE_ANALYSIS, 'readwrite', (os) => {
            os.add({ data, createdAt: Date.now() });
        }, async (id) => {
            await registerSync('neuroseo-analysis');
            resolve({ id: Number(id) });
        }, reject);
    });
}

/**
 * Queue a user preference update payload for background sync.
 * Returns the auto-incremented ID assigned by IndexedDB.
 */
export async function queuePreferenceUpdate(data: unknown): Promise<EnqueueResult> {
    const db = await openDB();
    return new Promise<EnqueueResult>((resolve, reject) => {
        withStore<number>(db, STORE_PREFS, 'readwrite', (os) => {
            os.add({ data, createdAt: Date.now() });
        }, async (id) => {
            await registerSync('user-preferences');
            resolve({ id: Number(id) });
        }, reject);
    });
}

/**
 * Convenience helper to submit immediately if online, else enqueue for sync.
 * The submit function should perform the live network call and return a Promise.
 */
export async function submitOrQueue<T>(opts: {
    isOnline?: () => boolean;
    submit: () => Promise<T>;
    fallbackQueue: () => Promise<EnqueueResult>;
}): Promise<{ mode: 'live' | 'queued'; result?: T; queuedId?: number }> {
    const online = opts.isOnline ? opts.isOnline() : (typeof navigator !== 'undefined' ? navigator.onLine : false);
    if (online) {
        try {
            const result = await opts.submit();
            return { mode: 'live', result };
        } catch {
            // If live submit fails, enqueue as a fallback
            const q = await opts.fallbackQueue();
            return { mode: 'queued', queuedId: q.id };
        }
    } else {
        const q = await opts.fallbackQueue();
        return { mode: 'queued', queuedId: q.id };
    }
}

export default {
    queueAnalysisRequest,
    queuePreferenceUpdate,
    submitOrQueue,
};
