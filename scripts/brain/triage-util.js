/** Plain JS fallback triage helpers (kept lightweight & build-free). */
function computeFallbackTriageAction(diagnostics) {
    const { tsErrors = 0, lintErrors = 0 } = diagnostics || {};
    if (tsErrors + lintErrors === 0) {
        return { action: 'none', rationale: 'No blocking diagnostics.' };
    }
    if (tsErrors > 10 && lintErrors > 50) {
        return { action: 'start_and_enqueue', rationale: `High combined debt ts=${tsErrors} lint=${lintErrors}.` };
    }
    if (tsErrors > 0 && lintErrors > 0) {
        return { action: 'start_delegation', rationale: `Both ts (${tsErrors}) & lint (${lintErrors}) errors present.` };
    }
    if (tsErrors > 0) {
        return { action: 'enqueue_ts_fixes', rationale: `Only ts errors (${tsErrors}).` };
    }
    return { action: 'start_delegation', rationale: `Only lint errors (${lintErrors}).` };
}

function extractFirstJsonObject(text) {
    if (!text || typeof text !== 'string') return undefined;
    const m = text.match(/\{[\s\S]*?\}/);
    if (!m) return undefined;
    try { return JSON.parse(m[0]); } catch { return undefined; }
}

module.exports = { computeFallbackTriageAction, extractFirstJsonObject };
