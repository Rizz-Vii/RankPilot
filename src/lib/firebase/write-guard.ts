import type { CollectionReference, DocumentReference} from 'firebase/firestore';
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
    trackListener(key);
    let timeout: ReturnType<typeof setTimeout> | null = null;
    type OnSnapshotFn = (query: unknown, next: (snap: unknown) => void, error?: (err: unknown) => void) => () => void;
    const invokeOnSnapshot = onSnapshot as unknown as OnSnapshotFn;
    const unsub = invokeOnSnapshot(q, (snap: unknown) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => onData(snap), debounceMs);
    }, (err: unknown) => { if (onError) onError(err); });
    return () => { if (timeout) clearTimeout(timeout); unsub(); untrackListener(key); };
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
