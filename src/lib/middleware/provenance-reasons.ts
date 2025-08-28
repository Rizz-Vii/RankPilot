// Phase 3 – Centralized Provenance Reason Codes
// Extendable, but keep a stable core set to avoid taxonomy sprawl.

export const PROVENANCE_REASON_CODES = [
    'error-path',
    'disabled',
    'auth-required',
    'rate-limited',
    'cache-hit',
    'policy-skip',
    'validation-failed',
    'timeout',
    'backend-error',
    'unsupported',
    // Phase 3 additions (allow-listed taxonomy)
    'payload-too-large',
    'schema-mismatch',
    'quota-exceeded',
    'conflict',
    'dependency-failure',
    'idempotency-replay',
    'other',
] as const;

export type ProvenanceReasonCode = (typeof PROVENANCE_REASON_CODES)[number];

export function isProvenanceReasonCode(x: string | undefined | null): x is ProvenanceReasonCode {
    if (!x) return false;
    return (PROVENANCE_REASON_CODES as readonly string[]).includes(x);
}
