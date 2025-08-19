// Firestore marketingCampaigns write guard: strips forbidden derived fields and normalizes schema.
// Delegates forbidden field stripping to central guard util (FORBIDDEN_DERIVED_FIELDS list) to keep list authoritative.
// Integrate in server-side create/update flows to enforce raw-only storage.
import { stripForbiddenDerivedFields } from '@/lib/guards/forbidden-derived-fields';

// MKT-02: strict period normalization utility (YYYY-MM)
export function normalizePeriod(value: unknown): string {
    if (typeof value !== 'string') throw new Error('period must be string');
    const trimmed = value.trim();
    if (!trimmed) throw new Error('period required');
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(trimmed)) return trimmed;
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) throw new Error('invalid period');
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function sanitizeMarketingCampaignDoc(raw: Record<string, unknown>) {
    const out: Record<string, unknown> = { ...raw };
    // Strip forbidden derived marketing KPI fields (roi, ctr, conversion, winRate, ltv ...)
    stripForbiddenDerivedFields(out);
    for (const numKey of ['impressions', 'clicks', 'leads', 'spend', 'revenue']) {
        if (out[numKey] != null && typeof out[numKey] !== 'number') {
            const parsed = Number(out[numKey]);
            out[numKey] = isNaN(parsed) ? 0 : parsed;
        }
    }
    if (out.period == null) throw new Error('period required');
    out.period = normalizePeriod(out.period);
    // Ensure provenance marker if caller supplied one (do not invent new provenance values here)
    if (raw.__provenance) {
        out.__provenance = raw.__provenance;
    }
    return out;
}

export function stripDerivedInPlace(doc: Record<string, unknown>) { return stripForbiddenDerivedFields(doc).doc; }
