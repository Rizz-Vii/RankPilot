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
interface ProvenanceObjectBase { [k: string]: unknown; provenance?: unknown; __provenance?: unknown; __prov_path?: string; __prov_note?: string; cached?: boolean; synthetic?: boolean; }

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
    if (ctx.note) cloned.__prov_note = ctx.note;
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
    (target as any).provenance = tag;
    if (ctx.path) (target as any).prov_path = ctx.path;
    if (ctx.note) (target as any).prov_note = ctx.note;
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
export function withProvenance<R>(handler: (...args: any[]) => Promise<R>, ctx: EnforcementContext = {}) {
    return (async (...args: any[]): Promise<R> => {
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
                    return enforceProvenance(res as Record<string, unknown>, ctx) as unknown as R;
                }
            }
            return res as R;
        } catch (e) {
            // Return a synthetic provenance for error paths (without leaking internal error)
            return enforceProvenance({ error: 'internal', message: (e as any)?.message?.slice(0, 120) } as Record<string, unknown>, { ...ctx, note: 'error-path' }) as unknown as R;
        }
    });
}
