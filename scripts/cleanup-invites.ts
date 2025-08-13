#!/usr/bin/env ts-node
/** Cleanup Job: Prune Accepted / Expired Invites & Index Docs
 * Purpose: Reduce storage + keep invites_index lean.
 * Behavior:
 * 1. Mark pending invites whose expiresAt < now as status='expired' (if not already accepted/expired).
 * 2. Delete accepted invites older than ACCEPTED_RETENTION_DAYS (default 30) and their index docs.
 * 3. Delete expired invites older than EXPIRED_RETENTION_DAYS (default 14) and their index docs.
 * 4. Remove orphan index docs referencing missing invite docs.
 * Environment: Requires Firebase Admin initialized (uses src/lib/firebase-admin.ts)
 * Safe to run idempotently.
 */
// Using relative import to avoid ts-node path mapping issues in standalone script execution
import { adminDb } from '../src/lib/firebase-admin';
import { recordInviteMaintenance } from '../src/lib/metrics/unified-metrics';

const ACCEPTED_RETENTION_DAYS = Number(process.env.INVITES_ACCEPTED_RETENTION_DAYS || 30);
const EXPIRED_RETENTION_DAYS = Number(process.env.INVITES_EXPIRED_RETENTION_DAYS || 14);

function days(ms: number) { return ms / (1000 * 60 * 60 * 24); }

async function run() {
    const now = Date.now();
    let markedExpired = 0, deletedAccepted = 0, deletedExpired = 0, orphanIndexes = 0;
    const teams = await adminDb.collection('teams').get();
    for (const t of teams.docs) {
        const invitesSnap = await adminDb.collection('teams').doc(t.id).collection('invites').get();
        for (const inv of invitesSnap.docs) {
            const data: any = inv.data();
            const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate().getTime() : (data.expiresAt instanceof Date ? data.expiresAt.getTime() : undefined);
            if (data.status === 'pending' && expiresAt && expiresAt < now) {
                await inv.ref.update({ status: 'expired', expiredAt: new Date() });
                await adminDb.collection('invites_index').doc(inv.id).set({ status: 'expired', updatedAt: new Date() }, { merge: true });
                markedExpired++;
            }
            if (data.status === 'accepted') {
                const acceptedAt = data.acceptedAt?.toDate ? data.acceptedAt.toDate().getTime() : (data.acceptedAt instanceof Date ? data.acceptedAt.getTime() : 0);
                if (acceptedAt && days(now - acceptedAt) > ACCEPTED_RETENTION_DAYS) {
                    await inv.ref.delete();
                    await adminDb.collection('invites_index').doc(inv.id).delete().catch(() => { });
                    deletedAccepted++;
                }
            } else if (data.status === 'expired') {
                const expiredAt = data.expiredAt?.toDate ? data.expiredAt.toDate().getTime() : (data.expiredAt instanceof Date ? data.expiredAt.getTime() : (expiresAt || 0));
                if (expiredAt && days(now - expiredAt) > EXPIRED_RETENTION_DAYS) {
                    await inv.ref.delete();
                    await adminDb.collection('invites_index').doc(inv.id).delete().catch(() => { });
                    deletedExpired++;
                }
            }
        }
    }
    // Orphan indexes
    const indexSnap = await adminDb.collection('invites_index').get();
    for (const idx of indexSnap.docs) {
        const teamId = (idx.data() as any).teamId;
        if (!teamId) { orphanIndexes++; await idx.ref.delete().catch(() => { }); continue; }
        const invDoc = await adminDb.collection('teams').doc(teamId).collection('invites').doc(idx.id).get();
        if (!invDoc.exists) { await idx.ref.delete().catch(() => { }); orphanIndexes++; }
    }
    recordInviteMaintenance({ markedExpired, deletedAccepted, deletedExpired, orphanIndexes });
    console.log(JSON.stringify({ markedExpired, deletedAccepted, deletedExpired, orphanIndexes }, null, 2));
}

run().catch(e => { console.error('cleanup-invites error', e); process.exit(1); });
