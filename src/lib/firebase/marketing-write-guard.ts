// Firestore marketingCampaigns write guard: strips forbidden derived fields (ctr, roi) and normalizes schema.
// Integrate in server-side create/update flows to enforce raw-only storage.
const DERIVED_FIELDS = ['ctr', 'roi'];

// MKT-02: strict period normalization utility (YYYY-MM)
export function normalizePeriod(value: any): string {
    if (typeof value !== 'string') throw new Error('period must be string');
    const trimmed = value.trim();
    if (!trimmed) throw new Error('period required');
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(trimmed)) return trimmed;
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) throw new Error('invalid period');
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function sanitizeMarketingCampaignDoc(raw: Record<string, any>) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(raw)) {
        if (DERIVED_FIELDS.includes(k)) continue;
        out[k] = v;
    }
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

export function stripDerivedInPlace(doc: any) { DERIVED_FIELDS.forEach(f => { if (f in doc) delete doc[f]; }); return doc; }
