#!/usr/bin/env tsx
/**
 * FIN-02 Billing Data Fetch Test
 * Seeds subscription + invoices (financeInvoices) and verifies fetchBillingData computes effectiveMonthly and ordering.
 * Skips if FIRESTORE_EMULATOR_HOST not set.
 */
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, Timestamp, type Firestore } from 'firebase/firestore';
import fs from 'fs';
import { fetchBillingData } from '../src/lib/billing/fetch-billing-data';
if (!process.env.FIRESTORE_EMULATOR_HOST) {
    console.warn('FIN-02 billing test skipped (FIRESTORE_EMULATOR_HOST not set).');
    process.exit(0);
}

(async () => {
    const rules = fs.readFileSync('firestore.rules', 'utf8');
    const [host, portStr] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
    const testEnv: RulesTestEnvironment = await initializeTestEnvironment({ projectId: 'demo-rankpilot', firestore: { rules, host, port: Number(portStr) } });
    try {
        const userId = 'billingUser1';
        const ctx = testEnv.authenticatedContext(userId, { email: 'billing@example.com' });
        const db = ctx.firestore();

        // Seed subscription doc
        await setDoc(doc(db, 'subscriptions', userId), {
            status: 'active',
            tier: 'agency',
            currentPeriodEnd: Timestamp.fromDate(new Date('2025-09-01T00:00:00Z')),
    });

        // Seed invoices (latest period first lexicographically by YYYY-MM)
        const invoices = [
            { id: 'inv-sep', period: '2025-09', amount: 49, status: 'open', userId },
            { id: 'inv-aug-1', period: '2025-08', amount: 49, status: 'paid', userId },
            { id: 'inv-aug-2', period: '2025-08', amount: 10, status: 'paid', userId },
            { id: 'inv-jul', period: '2025-07', amount: 39, status: 'paid', userId },
        ];
        for (const inv of invoices) {
            await setDoc(doc(db, 'financeInvoices', inv.id), { ...inv, createdAt: Timestamp.now() });
        }

        // Narrow db to Firestore via runtime duck typing (has collection method)
        const dbMaybe: unknown = db;
        const dbIsFirestore = dbMaybe && typeof dbMaybe === 'object' && typeof (dbMaybe as { collection?: unknown }).collection !== 'undefined';
        if (!dbIsFirestore) { console.error('Emulator Firestore not available'); process.exit(1); }
        const result = await fetchBillingData(db as unknown as Firestore, userId, { invoiceLimit: 10 });

        const assertions: string[] = [];
        if (!result.subscription || result.subscription.tier !== 'agency') assertions.push('subscription tier mismatch');
        if (result.invoices.length !== invoices.length) assertions.push('invoice count mismatch');
        if (result.effectiveMonthly !== 49 + 10) assertions.push(`effectiveMonthly expected 59 got ${result.effectiveMonthly}`);
        if (!result.nextInvoice || result.nextInvoice.id !== 'inv-sep') assertions.push('nextInvoice should be upcoming open invoice');

        if (assertions.length) {
            console.error('FIN-02 billing fetch test FAILED', { assertions, result });
            process.exit(1);
        } else {
            console.log('FIN-02 billing fetch test passed');
        }
    } finally {
        await testEnv.cleanup();
    }
})();
