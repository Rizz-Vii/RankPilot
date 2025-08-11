import { addDoc, setDoc, updateDoc, DocumentReference, CollectionReference } from 'firebase/firestore';

export interface GuardOptions { requireTeamId?: boolean; stripUndefined?: boolean; }

function sanitize(data: any): any {
    if (data == null || typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map(sanitize);
    const out: any = {};
    for (const [k, v] of Object.entries(data)) {
        if (v === undefined) continue;
        out[k] = sanitize(v);
    }
    return out;
}

function validateIds(payload: any, { requireTeamId }: GuardOptions) {
    if (!payload || typeof payload !== 'object') throw new Error('Invalid payload');
    if (!payload.userId) throw new Error('Missing userId in write payload');
    if (requireTeamId && !payload.teamId) throw new Error('Missing teamId in team-scoped write payload');
}

export async function guardedAdd<T = any>(colRef: CollectionReference, data: T, opts: GuardOptions = {}) {
    const payload: any = opts.stripUndefined ? sanitize(data) : data;
    validateIds(payload, opts);
    return addDoc(colRef, { ...payload });
}

export async function guardedSet<T = any>(docRef: DocumentReference, data: T, opts: GuardOptions = {}) {
    const payload: any = opts.stripUndefined ? sanitize(data) : data;
    validateIds(payload, opts);
    return setDoc(docRef, { ...payload }, { merge: true } as any);
}

export async function guardedUpdate<T = any>(docRef: DocumentReference, data: Partial<T>, opts: GuardOptions = {}) {
    const payload: any = opts.stripUndefined ? sanitize(data) : data;
    validateIds({ userId: (payload as any).userId }, { requireTeamId: false });
    return updateDoc(docRef, { ...payload });
}

// Snapshot subscription manager to reduce rapid duplicate listeners

type Unsub = () => void;
const activeCounts: Record<string, number> = {};

export function snapshotKey(parts: any[]): string {
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

export function managedOnSnapshot(q: any, onData: (snap: any) => void, onError?: (e: any) => void, opts: ManagedSnapshotOptions = {}): Unsub {
    const debounceMs = opts.debounceMs ?? 150;
    const key = snapshotKey([q?._queryPath || q?._path || 'unknown', q?._queryOptions || {}]);
    trackListener(key);
    let timeout: any = null;
    const { onSnapshot } = require('firebase/firestore');
    const unsub = onSnapshot(q, (snap: any) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => onData(snap), debounceMs);
    }, (err: any) => { if (onError) onError(err); });
    return () => { clearTimeout(timeout); unsub(); untrackListener(key); };
}

export function getActiveListenerSummary() {
    return { totalUnique: Object.keys(activeCounts).length, keys: { ...activeCounts } };
}
