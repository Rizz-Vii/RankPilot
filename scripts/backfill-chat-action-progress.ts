/**
 * Backfill Script: Re-summarize / normalize pending actions to exclude completed ones.
 * Usage:
 *   npx ts-node scripts/backfill-chat-action-progress.ts            (fast filter only)
 *   npx ts-node scripts/backfill-chat-action-progress.ts --full     (re-run summarizer when mismatch)
 *
 * Behavior:
 * 1. Iterates chatLogs collection user docs and their nested session documents
 * 2. If actionProgress has completed items that still appear in pendingActions, removes them immediately.
 * 3. When --full flag supplied AND messageCount >= interval threshold, invokes maybeSummarizeSession for a richer refresh.
 * 4. Stores actionStats { totalCompleted, totalPending, completionRate, lastBackfill }.
 */
import 'dotenv/config';
import { adminDb } from '../src/lib/firebase-admin';
import { maybeSummarizeSession } from '../src/lib/chat/sessionSummarizer';

async function run() {
    const argv = process.argv.slice(2);
    const doFull = argv.includes('--full');
    const usersCol = await adminDb.collection('chatLogs').listDocuments();
    let examined = 0, modified = 0, summarized = 0;
    for (const userDoc of usersCol) {
        const sessionsColRef = userDoc.collection('sessions');
        const sessionDocs = await sessionsColRef.listDocuments();
        for (const sRef of sessionDocs) {
            examined++;
            const snap = await sRef.get();
            if (!snap.exists) continue;
            const data = snap.data() as any;
            const pending: string[] = Array.isArray(data?.pendingActions) ? data.pendingActions : [];
            const progress = data?.actionProgress || {};
            if (!pending.length || !progress || typeof progress !== 'object') continue;
            const completedSet = new Set(Object.entries(progress).filter(([, v]) => !!v).map(([k]) => k.toLowerCase().trim()));
            if (!completedSet.size) continue;
            const filtered = pending.filter(p => !completedSet.has(String(p).toLowerCase().trim()));
            let changed = filtered.length !== pending.length;
            if (changed) {
                const totalCompleted = completedSet.size;
                const totalPending = filtered.length;
                const denominator = totalCompleted + totalPending;
                const completionRate = denominator === 0 ? (totalCompleted > 0 ? 1 : 0) : totalCompleted / denominator;
                await sRef.set({
                    pendingActions: filtered,
                    actionStats: {
                        totalCompleted,
                        totalPending,
                        completionRate,
                        lastBackfill: new Date(),
                    },
                }, { merge: true });
                modified++;
            }
            if (doFull && data.messageCount >= 6) { // respect summarizer interval (MESSAGE_INTERVAL)
                try {
                    await maybeSummarizeSession({ uid: userDoc.id, sessionId: sRef.id });
                    summarized++;
                } catch { /* ignore */ }
            }
        }
    }
    console.log(JSON.stringify({ examined, modified, summarized, fullMode: doFull }, null, 2));
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
