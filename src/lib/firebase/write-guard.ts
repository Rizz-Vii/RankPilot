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
    // Store the exact onData reference so unsubscribe can delete it reliably
        callbacks: new Set([onData]),
    // Also keep exact onError reference if provided
    errorCallbacks: new Set(onError ? [onError] : []),
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

    try {
        entry.unsubscribe = invokeOnSnapshot(q, debouncedNext, onErr);
    } catch (e) {
        // If onSnapshot throws synchronously (rare), surface error and avoid leaking registry entry
        for (const ecb of Array.from(entry.errorCallbacks)) {
            try { ecb(e); } catch { /* ignore */ }
        }
        return () => { /* no-op: subscription never established */ };
    }
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
        // Unique identity fallback to avoid collisions when internals are opaque
        const identity = getObjectIdentity(anyQ);
        // Prefer public API first: DocumentReference/CollectionReference expose path
        const pathVal = anyQ && typeof anyQ === 'object' ? (anyQ as { path?: unknown }).path : undefined;
        const path: string | undefined = typeof pathVal === 'string' ? pathVal : undefined;
        if (path) {
            const segments = path.split('/');
            const kind = segments.length % 2 === 0 ? 'doc' : 'col';
            return `${kind}:${path}#${identity}`;
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
        let filterSig = '';
        if (Array.isArray(filters)) {
            constraints.push(`where:${filters.length}`);
            // Build a lightweight, stable signature for filters to prevent cross-user collisions
            try {
                const parts = filters.map((f: unknown) => summarizeFilter(f)).filter(Boolean) as string[];
                if (parts.length) filterSig = hashSmall(parts.join('|'));
            } catch { /* ignore */ }
        }
        const orderBy = (qInternal as { orderBy?: unknown[] } | undefined)?.orderBy
            || (anyQ as { _queryOptions?: { orderBy?: unknown[] } })._queryOptions?.orderBy;
        if (Array.isArray(orderBy)) constraints.push(`orderBy:${orderBy.length}`);
        const limit = (qInternal as { limit?: number } | undefined)?.limit
            || (anyQ as { _queryOptions?: { limit?: number } })._queryOptions?.limit;
        if (typeof limit === 'number') constraints.push(`limit:${limit}`);

        if (basePath) {
            const base = constraints.length ? `query:${basePath}?${constraints.join(',')}` : `query:${basePath}`;
            return filterSig ? `${base}#${filterSig}` : `${base}#${identity}`;
        }
    } catch {
        // ignore and fall through
    }
    return `query:unknown#${Math.random().toString(36).slice(2, 8)}`;
}

// HMR cleanup handled via global registry re-initialization above; no import.meta/module.hot used.

// --- helpers for key derivation ---
const _objIdMap: WeakMap<object, string> = new WeakMap();
let _objIdSeq = 0;
function getObjectIdentity(obj: unknown): string {
    if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) return 'lit';
    const o = obj as object;
    let id = _objIdMap.get(o);
    if (!id) { id = `q${++_objIdSeq}`; _objIdMap.set(o, id); }
    return id;
}

function summarizeFilter(f: unknown): string {
    if (!f || typeof f !== 'object') return typeof f;
    const anyF = f as Record<string, unknown>;
    const field = extractFieldName(anyF);
    const op = (anyF['op'] || anyF['operator'] || anyF['opStr'] || '').toString();
    const val = extractValueSignature(anyF);
    return `${field}:${op}:${val}`;
}

function extractFieldName(anyF: Record<string, unknown>): string {
    const field = anyF['field'] as unknown;
    if (field && typeof field === 'object') {
        const f = field as { canonicalString?: () => string; toString?: () => string; fieldPath?: { segments?: string[] } };
        try {
            if (typeof f.canonicalString === 'function') return f.canonicalString();
            if (typeof f.toString === 'function') return f.toString();
            const segs = f.fieldPath?.segments;
            if (Array.isArray(segs) && segs.length) return segs.join('.');
        } catch { /* ignore */ }
    }
    const fieldPath = (anyF['fieldPath'] as { segments?: string[] } | undefined)?.segments;
    if (Array.isArray(fieldPath) && fieldPath.length) return fieldPath.join('.');
    return 'unknownField';
}

function extractValueSignature(anyF: Record<string, unknown>): string {
    const v: unknown = anyF['value'];
    if (v == null) return 'null';
    if (typeof v === 'string') return `s:${hashSmall(v)}`;
    if (typeof v === 'number' || typeof v === 'bigint') return `n:${String(v)}`;
    if (typeof v === 'boolean') return `b:${v ? 1 : 0}`;
    if (typeof v === 'object') {
        // Timestamp, GeoPoint, arrays, etc. -> compact signature
        try {
            if (Array.isArray(v)) return `a:${v.length}:${hashSmall(JSON.stringify(v).slice(0, 200))}`;
            // Firestore Timestamp
            const ts = (v as { toMillis?: () => number }).toMillis?.();
            if (typeof ts === 'number') return `ts:${ts}`;
            return `o:${hashSmall(JSON.stringify(v, replacerLimited) ?? '')}`;
        } catch { return 'o:?'; }
    }
    return typeof v;
}

function replacerLimited(_k: string, val: unknown) {
    if (typeof val === 'string') return val.length > 64 ? `${val.slice(0, 64)}…` : val;
    return val;
}

function hashSmall(s: string): string {
    // Tiny FNV-1a 32-bit hash, hex string
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ('0000000' + h.toString(16)).slice(-8);
}
