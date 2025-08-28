// Accounting Automation Snapshot fetchers
// Collection: accountingReportSnapshots (types: pnl, balance_sheet, reconciliation)
import { db } from '@/lib/firebase';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';

export interface AccountingReportSnapshotDoc {
    id: string;
    userId: string;
    teamId?: string | null;
    type: 'pnl' | 'balance_sheet' | 'reconciliation';
    period: string; // YYYY-MM
    figures: Record<string, number>;
    createdAt?: unknown;
}

function scopeField(teamId?: string) { return teamId ? 'teamId' : 'userId'; }

export async function fetchRecentAccountingSnapshots(userId: string, teamId?: string, types?: string[], max = 6): Promise<AccountingReportSnapshotDoc[]> {
    const q = query(
        collection(db, 'accountingReportSnapshots'),
        where(scopeField(teamId), '==', teamId || userId),
        orderBy('createdAt', 'desc'),
        limit(max)
    );
    const snap = await getDocs(q);
    let rows = snap.docs.map(d => {
        const data = d.data() as Omit<AccountingReportSnapshotDoc, 'id'>;
        return { id: d.id, ...data };
    });
    if (types && types.length) rows = rows.filter(r => types.includes(r.type));
    return rows;
}
