// Lightweight provenance enforcement helpers.
// Ensures every AI-related payload includes an allowed provenance tag.
import { recordProvenanceObservation } from '@/lib/metrics/unified-metrics';

export type ProvenanceTag = 'live' | 'cache' | 'synthetic' | 'hybrid' | 'mixed' | 'unknown';

const ALLOWED: ProvenanceTag[] = ['live', 'cache', 'synthetic', 'hybrid', 'mixed', 'unknown'];

interface EnforcementContext {
    path?: string; // logical route or feature path
    note?: string; // optional extra annotation
}

// Enforce provenance on a final (non-streaming) JSON response object.
export function enforceProvenance<T extends Record<string, any>>(obj: T, ctx: EnforcementContext = {}): T & { __provenance: ProvenanceTag; provenance?: never } {
    if (!obj || typeof obj !== 'object') {
        return { __provenance: 'unknown' } as any;
    }

    const direct = (obj as any).provenance || (obj as any).__provenance;
    let tag: ProvenanceTag = 'unknown';
    if (direct && typeof direct === 'string' && ALLOWED.includes(direct as ProvenanceTag)) {
        tag = direct as ProvenanceTag;
    }
    // Normalize common out-of-policy values to allowed set.
    if (direct === 'error') tag = 'synthetic';

    const cloned: any = { ...obj };
    delete cloned.provenance; // prevent dual-field confusion
    cloned.__provenance = tag;
    if (ctx.path) cloned.__prov_path = ctx.path;
    if (ctx.note) cloned.__prov_note = ctx.note;
    recordProvenanceObservation(true);
    return cloned;
}

// Enforce provenance on a streaming chunk; keeps original shape but guarantees provenance tag (provenance or __provenance) present.
export function enforceProvenanceOnChunk<T extends Record<string, any>>(chunk: T, ctx: EnforcementContext = {}): T {
    if (!chunk || typeof chunk !== 'object') {
        return { provenance: 'unknown' } as any;
    }
    let tag: ProvenanceTag = 'unknown';
    const existing = (chunk as any).provenance || (chunk as any).__provenance;
    if (existing && ALLOWED.includes(existing)) tag = existing as ProvenanceTag;
    if (existing === 'error') tag = 'synthetic';
    if (!existing) {
        // Heuristics: pass through cached/live detection if flags exist
        if ((chunk as any).cached === true) tag = 'cache';
        else if ((chunk as any).synthetic === true) tag = 'synthetic';
    }
    (chunk as any).provenance = tag; // for streaming we retain 'provenance'
    if (ctx.path) (chunk as any).prov_path = ctx.path;
    if (ctx.note) (chunk as any).prov_note = ctx.note;
    recordProvenanceObservation(true);
    return chunk;
}

// Simple coverage helper – can be expanded later.
export function hasProvenance(obj: any): boolean {
    return !!obj && (typeof obj === 'object') && (('__provenance' in obj) || ('provenance' in obj));
}

export function provenanceTag(obj: any): string | undefined {
    if (!obj || typeof obj !== 'object') return undefined;
    return (obj as any).__provenance || (obj as any).provenance;
}

// Higher-order handler wrapper for Next.js route handlers returning JSON.
// Usage: export const GET = withProvenance(async (req) => { return { data: ... , __provenance: 'live' } });
// If handler forgets to set provenance, it will be injected as 'unknown' and counted.
export function withProvenance<T extends (...args: any[]) => Promise<any>>(handler: T, ctx: EnforcementContext = {}) {
    return (async (...args: Parameters<T>) => {
        try {
            const res = await handler(...args);
            // Pass through native Response/NextResponse instances unchanged
            try {
                if (typeof Response !== 'undefined' && res instanceof Response) {
                    return res as any;
                }
            } catch { }
            if (res && typeof res === 'object') {
                if (!hasProvenance(res)) {
                    return enforceProvenance(res, ctx);
                }
            }
            return res;
        } catch (e) {
            // Return a synthetic provenance for error paths (without leaking internal error)
            return enforceProvenance({ error: 'internal', message: (e as any)?.message?.slice(0, 120) }, { ...ctx, note: 'error-path' });
        }
    }) as T;
}
