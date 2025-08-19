/*
 * Event Publisher (T26/T27)
 * Pure create-only writes into /orgs/{orgId}/events/{eventId}
 * Keep dependency-light: allow injected Firestore; lazy-import firebase when available.
 */

import type { EventType } from './event-types';
import { isEventType } from './event-types';

// Keep as type-only to avoid bundling when unused in tests without Firebase.
// Minimal Firestore interfaces (subset) to support create-only writes without pulling full types
export interface FirestoreLegacyDocRef {
  get?: () => Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
  create?: (data: Record<string, unknown>) => Promise<unknown>;
  set?: (data: Record<string, unknown>, opts?: { merge?: boolean }) => Promise<unknown>;
}
export interface FirestoreLegacyCollectionRef {
  doc(id: string): FirestoreLegacyDocRef;
}
export interface FirestoreLegacyLike {
  collection(path: string): FirestoreLegacyCollectionRef;
}
export interface FirestoreModularLike { /* marker – runtime checked via function presence */ }
export type Firestore = FirestoreLegacyLike | FirestoreModularLike;

export interface PublishEventInput {
  orgId: string;
  type: EventType;
  source: string;
  attrs?: Record<string, unknown>;
  userId?: string;
  teamId?: string;
  provenance?: 'live' | 'synthetic' | 'derived';
}

type PublishResult = { eventId: string };

const FORBIDDEN_RATIO_ATTR_KEYS = new Set([
  'ctr',
  'roi',
  'conversionRate',
  'winRate',
  'lifetimeValue',
  'arpu',
]);

function ensureValidAttrs(attrs?: Record<string, unknown>) {
  if (attrs == null) return;
  if (typeof attrs !== 'object' || Array.isArray(attrs)) {
    throw new Error('INVALID_ATTRS_SHAPE');
  }

  const proto = Object.getPrototypeOf(attrs);
  if (proto !== Object.prototype && proto !== null) {
    throw new Error('INVALID_ATTRS_SHAPE');
  }

  const keys = Object.keys(attrs);
  if (keys.length > 20) {
    throw new Error('TOO_MANY_ATTR_KEYS');
  }
  for (const k of keys) {
    if (FORBIDDEN_RATIO_ATTR_KEYS.has(k)) {
      throw new Error('FORBIDDEN_ATTR_KEY');
    }
    const v = (attrs as Record<string, unknown>)[k];
    if (
      v === null ||
      typeof v === 'string' ||
      typeof v === 'number' ||
      typeof v === 'boolean'
    ) {
      continue;
    }
    if (Array.isArray(v)) {
      if (v.length > 10) throw new Error('ATTR_ARRAY_TOO_LONG');
      const allString = v.every((x) => typeof x === 'string');
      const allNumber = v.every((x) => typeof x === 'number');
      if (!(allString || allNumber)) throw new Error('INVALID_ATTR_ARRAY_TYPE');
      continue;
    }
    // No nested objects allowed.
    throw new Error('INVALID_ATTR_VALUE');
  }
}

async function sha256Hex(input: string): Promise<string> {
  // Prefer Web Crypto subtle if available; fallback to Node crypto.
  const g: unknown = globalThis;
  if (
    typeof g === 'object' && g !== null &&
    'crypto' in g && typeof (g as { crypto?: unknown }).crypto === 'object' &&
    (g as { crypto: { subtle?: unknown } }).crypto.subtle &&
    typeof (g as { crypto: { subtle: { digest?: unknown } } }).crypto.subtle.digest === 'function'
  ) {
    const enc = new TextEncoder();
    const data = enc.encode(input);
    const hashBuf = await (g as { crypto: { subtle: { digest(algo: string, data: Uint8Array): Promise<ArrayBuffer> } } }).crypto.subtle.digest('SHA-256', data);
    const bytes = Array.from(new Uint8Array(hashBuf));
    return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Node fallback
  // Dynamic import without explicit type annotation to satisfy consistent-type-imports rule
  const nodeCrypto = await import('crypto');
  return nodeCrypto.createHash('sha256').update(input).digest('hex');
}

function hasLegacyCollection(db: Firestore | undefined | null): db is FirestoreLegacyLike {
  return !!db && typeof (db as Record<string, unknown>).collection === 'function';
}

async function writeCreateOnlyViaLegacy(
  db: FirestoreLegacyLike,
  path: string,
  id: string,
  data: Record<string, unknown>
) {
  const col = db.collection(path);
  const ref = col.doc(id);
  if (typeof ref.get === 'function') {
    const snap = await ref.get();
    if (snap && (snap.exists === true || snap.data())) {
      throw new Error('DOC_EXISTS');
    }
  }
  if (typeof ref.create === 'function') {
    // Some clients expose create() which fails if exists.
    return ref.create(data);
  }
  // Fallback to set(); assume caller mock enforces create-only.
  if (typeof ref.set === 'function') {
    return ref.set(data, { merge: false });
  }
  throw new Error('UNSUPPORTED_DB_INTERFACE');
}

async function writeCreateOnlyViaModular(
  db: FirestoreModularLike,
  docPath: string,
  data: Record<string, unknown>
) {
  // Lazy import to avoid adding weight when unused in tests
  const mod = await import('firebase/firestore');
  const { doc, getDoc, setDoc } = mod;
  // The modular Firestore instance is opaque here; use any to satisfy overload while retaining runtime safety.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = doc(db as unknown as any, docPath);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    throw new Error('DOC_EXISTS');
  }
  await setDoc(ref, data, { merge: false });
}

export async function publishEvent(
  input: PublishEventInput & { db?: Firestore }
): Promise<PublishResult> {
  const { orgId, type, source } = input;
  if (!isEventType(type)) {
    throw new Error('UNKNOWN_EVENT_TYPE');
  }

  ensureValidAttrs(input.attrs);

  const provenance = input.provenance ?? 'live';
  const version = 1;

  // Attempt twice in case of extremely unlikely ID collision
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt < 2) {
    const ts = new Date(attempt === 0 ? Date.now() : Date.now());
    const attrsNaturalKey =
      (input.attrs && typeof input.attrs.naturalKey !== 'undefined'
        ? String(input.attrs.naturalKey)
        : '') || '';
    const hashInput = JSON.stringify({
      orgId,
      type,
      ts: ts.toISOString(),
      provenance,
      attrsNaturalKey,
    });
    const hash = await sha256Hex(hashInput);
    const shard = (parseInt(hash.slice(0, 4), 16) % 64) | 0;
    const shortHash = hash.slice(0, 8);
    const eventId = `${ts.getTime()}-${shortHash}`;

    const docData: Record<string, unknown> = {
      orgId,
      teamId: input.teamId ?? null,
      userId: input.userId ?? null,
      source,
      type,
      ts,
      shard,
      attrs: input.attrs ?? null,
      provenance,
      version,
      hash,
    };

    const pathBase = `/orgs/${orgId}/events`;
    try {
      const db = input.db as Firestore | undefined;
      if (!db) {
        // If a central Firestore initializer exists later, wire it here.
        // TODO(T28): Auto-detect and lazily import client Firestore instance.
        throw new Error(
          'NO_FIRESTORE_INSTANCE: Inject db or add initializer (e.g., src/lib/firebase.ts)'
        );
      }

      if (hasLegacyCollection(db)) { // legacy style
        await writeCreateOnlyViaLegacy(db as FirestoreLegacyLike, pathBase, eventId, docData);
      } else {
        const fullPath = `${pathBase}/${eventId}`;
        await writeCreateOnlyViaModular(db as FirestoreModularLike, fullPath, docData);
      }
      return { eventId };
    } catch (e: unknown) {
      // On existing doc collision only, retry once with a new timestamp
      if (
        e && typeof e === 'object' && 'message' in e &&
        typeof (e as { message?: unknown }).message === 'string' &&
        (e as { message: string }).message.includes('DOC_EXISTS')
      ) {
        lastError = e;
        attempt += 1;
        continue;
      }
      throw e;
    }
  }

  throw lastError ?? new Error('EVENT_ID_COLLISION');
}

// Note: If running in browser where Web Crypto subtle is missing, consider adding a
// small polyfill or ensure Node fallback applies in server contexts. TODO(T28):
// evaluate subtle crypto availability across our Next.js runtime targets.
