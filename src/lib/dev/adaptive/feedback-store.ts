import { recordDeveloperFeedbackRecord } from '../../metrics/unified-metrics';
// ADP-01: Historical feedback store (in-memory, process-local)
// Records patch acceptance outcomes for lightweight adaptive planning.

export type FeedbackOutcome = 'accepted' | 'rejected' | 'deferred' | 'skipped';

export interface FeedbackRecord {
    id: string; // task or diff id
    at: number; // epoch ms
    outcome: FeedbackOutcome;
    reason?: string; // short code or note
}

const MAX = 500;
const records: FeedbackRecord[] = [];

export function recordFeedback(input: Omit<FeedbackRecord, 'at'> & { at?: number }) {
    const at = typeof input.at === 'number' ? input.at : Date.now();
    const rec: FeedbackRecord = { id: input.id, at, outcome: input.outcome, reason: input.reason };
    records.push(rec);
    // metrics: advisory record count
    try { recordDeveloperFeedbackRecord(1); } catch { /* optional */ }
    if (records.length > MAX) records.splice(0, records.length - MAX);
    return rec;
}

export function getRecentFeedback(limit = 50): FeedbackRecord[] {
    const n = Math.max(0, Math.min(limit, records.length));
    return records.slice(records.length - n);
}

export function getOutcomeStats(windowMs = 7 * 24 * 3600 * 1000) {
    const now = Date.now();
    const windowed = records.filter(r => now - r.at <= windowMs);
    const counts: Record<FeedbackOutcome, number> = { accepted: 0, rejected: 0, deferred: 0, skipped: 0 };
    for (const r of windowed) counts[r.outcome] += 1;
    const total = windowed.length || 1;
    return {
        counts,
        rateAccepted: counts.accepted / total,
        total: windowed.length,
    };
}

// Test-only reset
export function __resetFeedbackTestOnly() { records.length = 0; }
