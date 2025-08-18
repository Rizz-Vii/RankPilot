import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { enforceProvenance } from '@/lib/middleware/provenance';

// Accepts PUT with JSON body containing preference fields; updates users/{uid}.preferences
export async function PUT(req: NextRequest) {
  const started = Date.now();
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    const payload = await req.json().catch(() => ({}));
    // Support auth token provided in body for offline/queued sync by service worker
    const bodyToken: string | undefined = payload?.authToken;
    if (!authHeader && !bodyToken) {
      return NextResponse.json(enforceProvenance({ success: false, error: 'unauthorized', provenance: 'synthetic' }), { status: 401 });
    }
    const token = (authHeader?.replace(/^Bearer\s+/i, '') || bodyToken) as string;
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // Allow either direct preferences object or flat fields
    const prefs = payload.preferences ?? payload;
    if (!prefs || typeof prefs !== 'object') {
      return NextResponse.json(enforceProvenance({ success: false, error: 'invalid_payload', provenance: 'synthetic' }), { status: 400 });
    }
    // Whitelist preference keys
    const allowedKeys = new Set(['highContrast', 'reducedMotion', 'fontSize', 'colorBlindnessSupport', 'customColors', 'mode', 'voiceCommands', 'language']);
    const filtered: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(prefs)) {
      if (allowedKeys.has(k)) filtered[k] = v;
    }
    if (Object.keys(filtered).length === 0) {
      return NextResponse.json(enforceProvenance({ success: false, error: 'no_allowed_fields', provenance: 'synthetic' }), { status: 400 });
    }

    await adminDb.collection('users').doc(uid).set({ preferences: filtered, updatedAt: new Date() }, { merge: true });
    return NextResponse.json(enforceProvenance({ success: true, updated: Object.keys(filtered), ms: Date.now() - started, provenance: 'live' }));
  } catch (e: unknown) {
    return NextResponse.json(enforceProvenance({ success: false, error: (e as any)?.message || 'internal', provenance: 'synthetic' }), { status: 500 });
  }
}
