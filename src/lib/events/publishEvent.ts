/*
 * Event Publisher (T26/T27)
 * Pure create-only writes into /orgs/{orgId}/events/{eventId}
 * Keep dependency-light: allow injected Firestore; lazy-import firebase when available.
 */

import type { EventType } from './event-types';
import { isEventType } from './event-types';

// Keep as type-only to avoid bundling when unused in tests without Firebase.
export type Firestore = unknown; // accept injected db of any compatible shape

export interface PublishEventInput {
  orgId: string;
  type: EventType;
  source: string;
  attrs?: Record<string, any>;
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

function ensureValidAttrs(attrs?: Record<string, any>) {
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
    const v = (attrs as any)[k];
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
  const g: any = globalThis as any;
  if (g.crypto && g.crypto.subtle && typeof g.crypto.subtle.digest === 'function') {
    const enc = new TextEncoder();
    const data = enc.encode(input);
    const hashBuf = await g.crypto.subtle.digest('SHA-256', data);
    const bytes = Array.from(new Uint8Array(hashBuf));
    return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Node fallback
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodeCrypto = require('crypto') as typeof import('crypto');
  return nodeCrypto.createHash('sha256').update(input).digest('hex');
}

function hasLegacyCollection(db: any): boolean {
  return db && typeof db.collection === 'function';
}

async function writeCreateOnlyViaLegacy(
  db: any,
  path: string,
  id: string,
  data: Record<string, any>
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
  db: any,
  docPath: string,
  data: Record<string, any>
) {
  // Lazy import to avoid adding weight when unused in tests
  const mod = await import('firebase/firestore');
  const { doc, getDoc, setDoc } = mod as any;
  const ref = doc(db, docPath);
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
  let lastError: any = null;

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

    const docData: Record<string, any> = {
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
      const db: any = input.db as any;
      if (!db) {
        // If a central Firestore initializer exists later, wire it here.
        // TODO(T28): Auto-detect and lazily import client Firestore instance.
        throw new Error(
          'NO_FIRESTORE_INSTANCE: Inject db or add initializer (e.g., src/lib/firebase.ts)'
        );
      }

      if (hasLegacyCollection(db)) {
        await writeCreateOnlyViaLegacy(db, pathBase, eventId, docData);
      } else {
        const fullPath = `${pathBase}/${eventId}`;
        await writeCreateOnlyViaModular(db, fullPath, docData);
      }
      return { eventId };
    } catch (e: any) {
      // On existing doc collision only, retry once with a new timestamp
      if (e && typeof e.message === 'string' && e.message.includes('DOC_EXISTS')) {
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
