import { collection, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { guardedAdd } from '@/lib/firebase/write-guard';
import { db } from '@/lib/firebase';
import { JournalEntry, JournalEntryLine, isBalanced } from '@/lib/accounting/accounts';

export async function fetchJournalEntries(userId: string, teamId?: string | null): Promise<JournalEntry[]> {
    const q = query(collection(db, 'accountingJournalEntries'), where(teamId ? 'teamId' : 'userId', '==', teamId || userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => mapJournalEntryDoc(d.id, d.data()));
}

export interface SeedOptions { months?: number; revenuePerMonth?: number; }

export async function seedSampleJournalEntries(userId: string, teamId?: string | null, opts: SeedOptions = {}) {
    const months = opts.months ?? 1;
    const baseRevenue = opts.revenuePerMonth ?? 50000;
    const now = new Date();
    for (let i = 0; i < months; i++) {
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 5));
        const period = d.toISOString().slice(0, 7);
        await addBalancedEntry(userId, teamId, d, period, [
            { account: 'ASSET_AR', side: 'debit', amount: baseRevenue },
            { account: 'REV_SUBS', side: 'credit', amount: baseRevenue }
        ], 'Monthly subscription revenue');
        await addBalancedEntry(userId, teamId, d, period, [
            { account: 'COGS_HOSTING', side: 'debit', amount: Math.round(baseRevenue * 0.12) },
            { account: 'LIAB_AP', side: 'credit', amount: Math.round(baseRevenue * 0.12) }
        ], 'Hosting costs');
        await addBalancedEntry(userId, teamId, d, period, [
            { account: 'OPEX_SAL', side: 'debit', amount: Math.round(baseRevenue * 0.30) },
            { account: 'ASSET_CASH', side: 'credit', amount: Math.round(baseRevenue * 0.30) }
        ], 'Salary expense');
    }
}

async function addBalancedEntry(userId: string, teamId: string | null | undefined, date: Date, period: string, lines: JournalEntryLine[], memo?: string) {
    if (!isBalanced(lines)) throw new Error('Unbalanced seed entry');
    await guardedAdd(collection(db, 'accountingJournalEntries'), {
        userId, teamId: teamId || null, date: date.toISOString().slice(0, 10), period, lines, memo: memo || null, source: 'seed', createdAt: Timestamp.fromDate(new Date()), updatedAt: Timestamp.fromDate(new Date())
    }, { stripUndefined: true });
}

function toDate(v: unknown): Date {
    if (v instanceof Date) return v;
    const maybeTs = v as { toDate?: () => Date };
    return typeof maybeTs.toDate === 'function' ? maybeTs.toDate() : new Date();
}

function mapJournalEntryDoc(id: string, raw: unknown): JournalEntry {
    const r = (raw as Record<string, unknown>) || {};
    return {
        id,
        userId: String(r.userId ?? ''),
        teamId: (r.teamId as string | null | undefined) ?? null,
        date: String(r.date ?? ''),
        period: String(r.period ?? ''),
        lines: (r.lines as JournalEntryLine[]) || [],
        memo: r.memo as string | undefined,
        source: r.source as string | undefined,
        createdAt: toDate(r.createdAt),
        updatedAt: toDate(r.updatedAt),
    };
}
