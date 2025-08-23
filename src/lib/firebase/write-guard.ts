import type { CollectionReference, DocumentReference } from 'firebase/firestore';
import { addDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';

export interface GuardOptions { requireTeamId?: boolean; stripUndefined?: boolean; }

function sanitize(data: unknown): unknown {
    if (data == null || typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map(sanitize);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
        if (v === undefined) continue;
        out[k] = sanitize(v);
    }
    return out;
}

function validateIds(payload: Record<string, unknown>, { requireTeamId }: GuardOptions) {
    if (!payload || typeof payload !== 'object') throw new Error('Invalid payload');
    const userId = payload['userId'];
    const teamId = payload['teamId'];
    if (!userId) throw new Error('Missing userId in write payload');
    if (requireTeamId && !teamId) throw new Error('Missing teamId in team-scoped write payload');
}

export async function guardedAdd<T = unknown>(colRef: CollectionReference, data: T, opts: GuardOptions = {}) {
    const payload = (opts.stripUndefined ? sanitize(data) : data) as Record<string, unknown>;
    validateIds(payload, opts);
    return addDoc(colRef, { ...payload });
}

export async function guardedSet<T = unknown>(docRef: DocumentReference, data: T, opts: GuardOptions = {}) {
    const payload = (opts.stripUndefined ? sanitize(data) : data) as Record<string, unknown>;
    validateIds(payload, opts);
    return setDoc(docRef, { ...payload }, { merge: true });
}

export async function guardedUpdate<T = unknown>(docRef: DocumentReference, data: Partial<T>, opts: GuardOptions = {}) {
    const payload = (opts.stripUndefined ? sanitize(data) : data) as Record<string, unknown>;
    validateIds({ userId: payload['userId'] } as Record<string, unknown>, { requireTeamId: false });
    return updateDoc(docRef, { ...payload });
}

// Snapshot subscription manager to reduce rapid duplicate listeners

type Unsub = () => void;
const activeCounts: Record<string, number> = {};

// Centralized refcounted registry for Firestore subscriptions
type RegistryEntry = {
    refCount: number;
    unsubscribe: Unsub;
    callbacks: Set<(snap: unknown) => void>;
    errorCallbacks: Set<(err: unknown) => void>;
    lastSnap?: unknown;
    timer: ReturnType<typeof setTimeout> | null;
    debounceMs: number;
};

// Keep registry stable across HMR by storing it on globalThis and cleaning up on reload
const GLOBAL_REG_KEY = '__RP_FS_SNAPSHOT_REG__';
const GLOBAL_LOADED_KEY = '__RP_FS_SNAPSHOT_LOADED__';

function getGlobal<T extends Record<string, unknown>>(): T | undefined {
    try {
        return globalThis as unknown as T;
    } catch {
        return undefined;
    }
}

function getRegistry(): Map<string, RegistryEntry> {
    const g = getGlobal<Record<string, unknown>>() || ({} as Record<string, unknown>);
    let reg = g[GLOBAL_REG_KEY] as Map<string, RegistryEntry> | undefined;
    const wasLoaded = Boolean(g[GLOBAL_LOADED_KEY]);
    if (!reg) {
        reg = new Map<string, RegistryEntry>();
        g[GLOBAL_REG_KEY] = reg as unknown as Record<string, unknown>;
    } else if (wasLoaded) {
        // Module was reloaded; proactively clean up any lingering subscriptions
        for (const [key, entry] of Array.from(reg.entries())) {
            try { if (entry.timer) clearTimeout(entry.timer); entry.unsubscribe(); } catch { /* ignore */ }
            reg.delete(key);
            untrackListener(key);
        }
    }
    g[GLOBAL_LOADED_KEY] = true as unknown as Record<string, unknown>;
    return reg;
}

const registry = getRegistry();

export function snapshotKey(parts: unknown[]): string {
    return parts.map(p => typeof p === 'string' ? p : JSON.stringify(p)).join('|');
}

export function trackListener(key: string) {
    activeCounts[key] = (activeCounts[key] || 0) + 1;
    if (activeCounts[key] === 1) {
        console.log(`[FirestoreListener] + ${key} (unique:${Object.keys(activeCounts).length})`);
    }
}

export function untrackListener(key: string) {
    if (!activeCounts[key]) return;
    activeCounts[key] -= 1;
    if (activeCounts[key] <= 0) {
        delete activeCounts[key];
        console.log(`[FirestoreListener] - ${key} (unique:${Object.keys(activeCounts).length})`);
    }
}

export interface ManagedSnapshotOptions { debounceMs?: number; }

export function managedOnSnapshot(q: unknown, onData: (snap: unknown) => void, onError?: (e: unknown) => void, opts: ManagedSnapshotOptions = {}): Unsub {
    const debounceMs = opts.debounceMs ?? 150;
    const key = deriveReadableKey(q);

    // If an entry exists, reuse the single underlying subscription and just attach callbacks
    const existing = registry.get(key);
    if (existing) {
        existing.refCount += 1;
        existing.callbacks.add(onData);
        if (onError) existing.errorCallbacks.add(onError);
        // Optionally deliver last snapshot to new subscriber
        if (existing.lastSnap !== undefined) {
            queueMicrotask(() => {
                try { onData(existing.lastSnap as unknown); } catch { /* ignore */ }
            });
        }
        return () => {
            existing.callbacks.delete(onData);
            if (onError) existing.errorCallbacks.delete(onError);
            existing.refCount -= 1;
            if (existing.refCount <= 0) {
                if (existing.timer) clearTimeout(existing.timer);
                existing.unsubscribe();
                registry.delete(key);
                untrackListener(key);
            }
        };
    }

    // Create a new underlying subscription for this key
    type OnSnapshotFn = (query: unknown, next: (snap: unknown) => void, error?: (err: unknown) => void) => () => void;
    const invokeOnSnapshot = onSnapshot as unknown as OnSnapshotFn;

    const entry: RegistryEntry = {
        refCount: 1,
        unsubscribe: () => { },
        callbacks: new Set([(snap: unknown) => onData(snap)]),
        errorCallbacks: new Set(onError ? [(err: unknown) => onError(err)] : []),
        lastSnap: undefined,
        timer: null,
        debounceMs,
    };

    const debouncedNext = (snap: unknown) => {
        if (entry.timer) clearTimeout(entry.timer);
        entry.timer = setTimeout(() => {
            entry.lastSnap = snap;
            // Fan-out to all current callbacks
            for (const cb of Array.from(entry.callbacks)) {
                try { cb(snap); } catch { /* ignore */ }
            }
        }, entry.debounceMs);
    };

    const onErr = (err: unknown) => {
        for (const ecb of Array.from(entry.errorCallbacks)) {
            try { ecb(err); } catch { /* ignore */ }
        }
        // Do not auto re-subscribe here; let Firestore manage reconnects
    };

    entry.unsubscribe = invokeOnSnapshot(q, debouncedNext, onErr);
    registry.set(key, entry);
    trackListener(key);

    // Return per-subscriber unsubscribe
    return () => {
        const current = registry.get(key);
        if (!current) return;
        current.callbacks.delete(onData);
        if (onError) current.errorCallbacks.delete(onError);
        current.refCount -= 1;
        if (current.refCount <= 0) {
            if (current.timer) clearTimeout(current.timer);
            current.unsubscribe();
            registry.delete(key);
            untrackListener(key);
        }
    };
}

export function getActiveListenerSummary() {
    return { totalUnique: Object.keys(activeCounts).length, keys: { ...activeCounts } };
}

// Build a stable, human-readable key for any Firestore reference or query.
function deriveReadableKey(q: unknown): string {
    try {
        const anyQ = q as Record<string, unknown>;
        // Prefer public API first: DocumentReference/CollectionReference expose path
        const pathVal = anyQ && typeof anyQ === 'object' ? (anyQ as { path?: unknown }).path : undefined;
        const path: string | undefined = typeof pathVal === 'string' ? pathVal : undefined;
        if (path) {
            const segments = path.split('/');
            const kind = segments.length % 2 === 0 ? 'doc' : 'col';
            return `${kind}:${path}`;
        }

        const qInternal = (anyQ as { _query?: unknown; _ref?: { _query?: unknown }; _delegate?: { _query?: unknown } })._query
            || (anyQ as { _ref?: { _query?: unknown } })._ref?._query
            || (anyQ as { _delegate?: { _query?: unknown } })._delegate?._query;
        const segs: string[] | undefined = (qInternal as { path?: { segments?: string[] } } | undefined)?.path?.segments
            || (anyQ as { _queryPath?: { segments?: string[] } })._queryPath?.segments
            || (anyQ as { _path?: { segments?: string[] } })._path?.segments;
        const basePath = Array.isArray(segs) && segs.length ? segs.join('/') : undefined;

        const constraints: string[] = [];
        const filters = (qInternal as { filters?: unknown[]; filter?: unknown } | undefined)?.filters
            || (qInternal as { filter?: unknown } | undefined)?.filter
            || (anyQ as { _queryOptions?: { filters?: unknown[] } })._queryOptions?.filters;
        if (Array.isArray(filters)) constraints.push(`where:${filters.length}`);
        const orderBy = (qInternal as { orderBy?: unknown[] } | undefined)?.orderBy
            || (anyQ as { _queryOptions?: { orderBy?: unknown[] } })._queryOptions?.orderBy;
        if (Array.isArray(orderBy)) constraints.push(`orderBy:${orderBy.length}`);
        const limit = (qInternal as { limit?: number } | undefined)?.limit
            || (anyQ as { _queryOptions?: { limit?: number } })._queryOptions?.limit;
        if (typeof limit === 'number') constraints.push(`limit:${limit}`);

        if (basePath) {
            return constraints.length ? `query:${basePath}?${constraints.join(',')}` : `query:${basePath}`;
        }
    } catch {
        // ignore and fall through
    }
    return 'query:unknown';
}

// HMR cleanup handled via global registry re-initialization above; no import.meta/module.hot used.
