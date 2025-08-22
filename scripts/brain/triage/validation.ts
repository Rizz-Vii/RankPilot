// Triage validation & guardrail utilities extracted from watch-loop for reuse & testing.
export const ALLOWED_TRIAGE_ACTIONS = ['none', 'start_delegation', 'enqueue_ts_fixes', 'start_and_enqueue'] as const;
export type TriageAction = typeof ALLOWED_TRIAGE_ACTIONS[number];

export interface ParsedTriage { action: TriageAction; rationale: string; }

export function validateTriageParsed(obj: unknown): ParsedTriage | null {
    if (!obj || typeof obj !== 'object') return null;
    const rec = obj as Record<string, unknown>;
    const action = rec.action;
    const rationale = rec.rationale;
    if (typeof action !== 'string' || typeof rationale !== 'string') return null;
    if (!ALLOWED_TRIAGE_ACTIONS.includes(action as TriageAction)) return null;
    if (rationale.length < 3 || rationale.length > 160) return null;
    return { action: action as TriageAction, rationale };
}

export function evaluateAgentTriageOutput(raw: unknown, metrics?: { guardrailFailures: number }): ParsedTriage | null {
    // Resolve triage-util from either compiled dist sibling or original source path.
    let utilMod: unknown;
    let extractFirstJsonObject: (s: string) => unknown = () => undefined;
    try {
        utilMod = require('../triage-util.js');
    } catch {
        try { utilMod = require('../../../../scripts/brain/triage-util.js'); } catch { /* ignore */ }
    }
    if (utilMod && typeof (utilMod as Record<string, unknown>).extractFirstJsonObject === 'function') {
        extractFirstJsonObject = (utilMod as { extractFirstJsonObject: (s: string) => unknown }).extractFirstJsonObject;
    } else {
        extractFirstJsonObject = (s: string) => { try { return JSON.parse(s); } catch { return undefined; } }; // fallback: parse whole string
    }
    let parsed: unknown = raw;
    if (typeof raw === 'string') parsed = extractFirstJsonObject(raw);
    const validated = validateTriageParsed(parsed);
    if (!validated && metrics) metrics.guardrailFailures += 1;
    return validated;
}

export function buildTriageInstructions(diag: { tsErrors: number; lintErrors: number; lintWarnings: number }) {
    const allowed = ALLOWED_TRIAGE_ACTIONS.join('|');
    return `Return ONLY compact minified JSON {"action":"<one_of:${allowed}>","rationale":"<short>"}. Validation rules: action must be one of ${ALLOWED_TRIAGE_ACTIONS.join(', ')}; rationale 3-160 chars. Decision rules: (ts+lint)==0 => none; ts>10 & lint>50 => start_and_enqueue; ts>0 & lint>0 => start_delegation; ts>0 only => enqueue_ts_fixes; lint>0 only => start_delegation. Provide no explanations. Diagnostics: ${JSON.stringify(diag)}.`;
}
