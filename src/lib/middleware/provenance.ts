// Lightweight provenance enforcement helpers.
// Ensures every AI-related payload includes an allowed provenance tag.
import { recordProvenanceInjection, recordProvenanceObservation, recordProvenanceReason } from '@/lib/metrics/unified-metrics';
import { isProvenanceReasonCode } from './provenance-reasons';

export type ProvenanceTag = 'live' | 'cache' | 'synthetic' | 'hybrid' | 'mixed' | 'unknown' | 'error'; // 'error' treated internally and normalized to 'synthetic'

const ALLOWED: ProvenanceTag[] = ['live', 'cache', 'synthetic', 'hybrid', 'mixed', 'unknown'];

interface EnforcementContext {
    path?: string; // logical route or feature path
    note?: string; // optional extra annotation
}

// Enforce provenance on a final (non-streaming) JSON response object.
interface ProvenanceObjectBase {
    [k: string]: unknown;
    provenance?: ProvenanceTag; // public facing provenance tag (may be injected)
    __provenance?: ProvenanceTag; // internal normalized provenance tag
    __prov_path?: string; // internal path annotation (legacy)
    __prov_note?: string; // internal note annotation (legacy)
    prov_path?: string; // streaming variant (without leading underscores)
    prov_note?: string; // streaming variant (without leading underscores)
    cached?: boolean;
    synthetic?: boolean;
}

export function enforceProvenance<T extends Record<string, unknown>>(obj: T, ctx: EnforcementContext = {}): T & { __provenance: ProvenanceTag; provenance?: never } {
    if (!obj || typeof obj !== 'object') {
        return { __provenance: 'unknown' } as T & { __provenance: ProvenanceTag };
    }

    const source = obj as ProvenanceObjectBase;
    const direct = (source.provenance || source.__provenance) as unknown;
    let tag: ProvenanceTag = 'unknown';
    if (typeof direct === 'string' && ALLOWED.includes(direct as ProvenanceTag)) tag = direct as ProvenanceTag;
    if (direct === 'error') tag = 'synthetic';

    const cloned: ProvenanceObjectBase = { ...source };
    delete cloned.provenance; // prevent dual-field confusion
    cloned.__provenance = tag;
    if (ctx.path) cloned.__prov_path = ctx.path;
    if (ctx.note) {
        const note = isProvenanceReasonCode(ctx.note) ? ctx.note : 'other';
        cloned.__prov_note = note;
        recordProvenanceReason(note);
    }
    recordProvenanceObservation(true);
    return cloned as T & { __provenance: ProvenanceTag; provenance?: never };
}

// Enforce provenance on a streaming chunk; keeps original shape but guarantees provenance tag (provenance or __provenance) present.
export function enforceProvenanceOnChunk<T extends Record<string, unknown>>(chunk: T, ctx: EnforcementContext = {}): T {
    if (!chunk || typeof chunk !== 'object') {
        return { provenance: 'unknown' } as unknown as T;
    }
    const target = chunk as ProvenanceObjectBase;
    let tag: ProvenanceTag = 'unknown';
    const existing = target.provenance || target.__provenance;
    if (typeof existing === 'string' && ALLOWED.includes(existing as ProvenanceTag)) tag = existing as ProvenanceTag;
    if (existing === 'error') tag = 'synthetic';
    if (!existing) {
        if (target.cached === true) tag = 'cache';
        else if (target.synthetic === true) tag = 'synthetic';
    }
    target.provenance = tag;
    if (ctx.path) target.prov_path = ctx.path;
    if (ctx.note) {
        const note = isProvenanceReasonCode(ctx.note) ? ctx.note : 'other';
        target.prov_note = note;
        recordProvenanceReason(note);
    }
    recordProvenanceObservation(true);
    return chunk;
}

// Simple coverage helper – can be expanded later.
export function hasProvenance(obj: unknown): boolean {
    return !!obj && (typeof obj === 'object') && (('__provenance' in obj) || ('provenance' in obj));
}

export function provenanceTag(obj: unknown): string | undefined {
    if (!obj || typeof obj !== 'object') return undefined;
    return (obj as Record<string, unknown>).__provenance as string | undefined
        || (obj as Record<string, unknown>).provenance as string | undefined;
}

// Higher-order handler wrapper for Next.js route handlers returning JSON.
// Usage: export const GET = withProvenance(async (req) => { return { data: ... , __provenance: 'live' } });
// If handler forgets to set provenance, it will be injected as 'unknown' and counted.
export function withProvenance<R, A extends unknown[]>(handler: (...args: A) => Promise<R>, ctx: EnforcementContext = {}) {
    return (async (...args: A): Promise<R> => {
        try {
            const res = await handler(...args);
            // Pass through native Response/NextResponse instances unchanged
            try {
                if (typeof Response !== 'undefined' && res instanceof Response) {
                    return res as unknown as R;
                }
            } catch { }
            if (res && typeof res === 'object') {
                if (!hasProvenance(res)) {
                    recordProvenanceInjection();
                    return enforceProvenance(res as Record<string, unknown>, ctx) as unknown as R;
                }
            }
            return res as R;
        } catch (e: unknown) {
            // Return a synthetic provenance for error paths (without leaking internal error)
            const message = (typeof e === 'object' && e && 'message' in e && typeof (e as { message?: unknown }).message === 'string')
                ? (e as { message: string }).message.slice(0, 120)
                : 'internal error';
            return enforceProvenance({ error: 'internal', message } as Record<string, unknown>, { ...ctx, note: 'error-path' }) as unknown as R;
        }
    });
}
