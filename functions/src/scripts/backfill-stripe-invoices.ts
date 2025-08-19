/**
 * Backfill Stripe invoices into financeInvoices.
 * Usage (with env STRIPE_SECRET_KEY set):
 *  npx ts-node functions/src/scripts/backfill-stripe-invoices.ts [--limit=500] [--teamId=TEAM123] [--dryRun]
 */
import Stripe from 'stripe';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { upsertFinanceInvoice } from '../lib/billing/invoice-upsert';

if (!getApps().length) initializeApp();
getFirestore();

async function main() {
    const key = process.env.STRIPE_SECRET_KEY; if (!key) throw new Error('STRIPE_SECRET_KEY required');
    const stripe = new Stripe(key, {} as Stripe.StripeConfig);
    const limitArg = process.argv.find(a => a.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 200;
    const teamIdArg = process.argv.find(a => a.startsWith('--teamId='));
    const teamId = teamIdArg ? teamIdArg.split('=')[1] : undefined;
    const dryRun = process.argv.includes('--dryRun');
    let startingAfter: string | undefined;
    let processed = 0;
    let skipped = 0;
    console.log('[backfill] starting', { limit, teamFilter: teamId || null, dryRun });
    while (processed < limit) {
        const page = await stripe.invoices.list({ limit: Math.min(100, limit - processed), starting_after: startingAfter });
        if (!page.data.length) break;
        for (const inv of page.data) {
            if (!inv.id) continue; // safety guard
            const wouldPersist = await upsertFinanceInvoice(inv, { allowUnpaid: true, source: dryRun ? undefined : 'backfill', requireTeamId: teamId, dryRun });
            if (dryRun) {
                if (wouldPersist) processed++; else skipped++;
            } else {
                // For team-filtered runs we only increment processed when the invoice actually persisted (exists after upsert).
                if (teamId) {
                    const ref = getFirestore().collection('financeInvoices').doc(inv.id as string);
                    const snap = await ref.get();
                    if (!snap.exists) skipped++; else processed++;
                } else {
                    processed++;
                }
            }
            if (processed >= limit) break;
        }
        if (!page.has_more) break;
        startingAfter = page.data[page.data.length - 1].id;
    }
    console.log('[backfill] complete', { processed, skipped, teamFilter: teamId || null });
    process.exit(0);
}

main().catch(e => { console.error('[backfill] failed', e); process.exit(1); });
