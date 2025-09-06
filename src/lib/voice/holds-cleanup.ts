/*
 * Cleanup utility for expired voice_holds.
 * Scans for holds with status='held' and heldUntil < now, then marks them 'expired'.
 * Uses adminDb when available to perform server-side updates.
 */
// Lazy-load logger and adminDb to avoid path-alias/ESM resolution issues in test runtimes
let logger = { info: () => { }, degraded: () => { }, error: () => { } } as any;
try {
    const lg = require('../logging/app-logger');
    if (lg && typeof lg.getLogger === 'function') logger = lg.getLogger('voice.holds-cleanup');
} catch (e) {
    // noop
}

// lazy require adminDb to avoid import-time issues in tests
let adminDb: any = null;
try {
    // Prefer server-side adminDb
    const admin = require('../firebase-admin');
    adminDb = admin && admin.adminDb ? admin.adminDb : null;
} catch { /* ignore */ }
if (!adminDb) {
    try {
        const fb = require('../firebase');
        adminDb = fb && fb.adminDb ? fb.adminDb : null;
    } catch { adminDb = null; }
}

export async function cleanupExpiredHolds({ limit = 100 } = {}) {
    logger.info('cleanupExpiredHolds.start', { limit });
    if (!adminDb || typeof adminDb.collection !== 'function') {
        logger.degraded('cleanupExpiredHolds.no_admindb');
        return { ok: false, reason: 'no_admin_db' };
    }

    try {
        const nowIso = new Date().toISOString();
        // Avoid composite index requirement by querying only by status, then filtering in memory.
        // Fetch a larger window than the update limit to improve chances of finding expired holds.
        const fetchLimit = Math.max(limit * 4, 200);
        const snap = await adminDb
            .collection('voice_holds')
            .where('status', '==', 'held')
            .limit(fetchLimit)
            .get();

        const expiredDocs: any[] = [];
        snap.forEach((doc: any) => {
            const data = doc.data() || {};
            const heldUntil = data.heldUntil as string | undefined;
            if (heldUntil && new Date(heldUntil) <= new Date(nowIso)) {
                expiredDocs.push(doc);
            }
        });

        if (expiredDocs.length === 0) {
            logger.info('cleanupExpiredHolds.none');
            return { ok: true, count: 0 };
        }

        const batch = adminDb.batch();
        let count = 0;
        for (const doc of expiredDocs.slice(0, limit)) {
            batch.update(doc.ref, { status: 'expired', expiredAt: new Date().toISOString() });
            count++;
        }
        await batch.commit();
        logger.info('cleanupExpiredHolds.done', { count });
        return { ok: true, count };
    } catch (error) {
        logger.error?.('cleanupExpiredHolds.error', { error: String(error) });
        // Return a structured error; the API route will surface it with 200 by default.
        return { ok: false, error: String(error) } as const;
    }
}

export default cleanupExpiredHolds;
