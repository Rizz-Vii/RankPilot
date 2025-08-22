import { expect } from 'chai';
import * as admin from 'firebase-admin';

if (!admin.apps.length) { admin.initializeApp(); }
const db = admin.firestore();

// Unit test for daily usage range endpoint logic (seeding two docs and querying range)

describe('Daily AI usage endpoint (range)', () => {
    const today = new Date();
    const d1 = new Date(today.getTime() - 86400000); // yesterday
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const day1 = fmt(d1);
    const day2 = fmt(today);
    before(async () => {
        await db.collection('aiUsageDaily').doc(`${day1}_openai`).set({ date: day1, provider: 'openai', tokensIn: 10, tokensOut: 20, costEstimate: 0.01, models: { 'gpt-4o': { tokensIn: 10, tokensOut: 20 } }, seeded: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        await db.collection('aiUsageDaily').doc(`${day2}_openai`).set({ date: day2, provider: 'openai', tokensIn: 30, tokensOut: 40, costEstimate: 0.05, models: { 'gpt-4o': { tokensIn: 30, tokensOut: 40 } }, seeded: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    });
    it('returns both days in range', async () => {
        const res = await fetch(`http://localhost:3000/api/admin/ai-usage/daily?start=${day1}&end=${day2}`);
        expect(res.ok).to.equal(true);
        const body = await res.json() as Record<string, unknown>;
        const count = typeof body.count === 'number' ? body.count : 0;
        expect(count).to.be.greaterThan(0);
        const rows = Array.isArray(body.rows) ? (body.rows as unknown[]) : [];
        const dates = rows.map((r: unknown) => (r && typeof r === 'object' && 'date' in (r as Record<string, unknown>) ? String((r as Record<string, unknown>).date) : '')).filter(Boolean).sort();
        expect(dates).to.include(day1);
        expect(dates).to.include(day2);
    });
});
