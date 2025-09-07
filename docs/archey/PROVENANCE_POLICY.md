# Provenance Policy (PROV-01)

Status: Enforced (100% AI route coverage required)

## Goals

Guarantee every AI / ML generated or transformed response leaving the platform carries an explicit provenance tag to:

1. Enable downstream trust & auditability.
2. Support observability (coverage %, fallback patterns).
3. Prevent silent drift when new AI endpoints are introduced.

## Allowed Tags

| Tag         | Meaning                                            | Typical Source                    |
| ----------- | -------------------------------------------------- | --------------------------------- |
| `live`      | Fresh model inference or real-time analysis        | Direct LLM or orchestrator result |
| `cache`     | Retrieved from internal cache layer                | Cached response reuse             |
| `synthetic` | Fabricated fallback or error-safe substitute       | Graceful degradation path         |
| `hybrid`    | Merged cached + live fragments                     | Partial refresh strategy          |
| `mixed`     | Multiple heterogeneous live sources combined       | Multi-model ensemble result       |
| `unknown`   | Middleware injected default (should be eliminated) | Missing explicit tag in handler   |

## Enforcement Primitives

`enforceProvenance(obj, { path, note })` – Clones + injects `__provenance`. Use for explicit construction and error paths.

`enforceProvenanceOnChunk(chunk, { path, note })` – Ensures each streaming chunk includes `provenance`.

`withProvenance(async (req)=>{ ... })` – HOF that auto-injects `__provenance:'unknown'` if absent and records coverage. Preferred for non-streaming routes.

## Required Pattern

All AI / analysis / automation endpoints matching heuristic directories:

```
src/app/api/ai/**
src/app/api/neuroseo/** (excluding metrics & export helpers)
src/app/api/automation/**
src/app/api/intelligence/competitive/**
src/app/api/seo-audit/run/**
src/app/api/mcp/neuroseo/enhanced/**
```

Must:

1. Import a provenance helper.
2. Tag success payloads with a non-`unknown` tag (`live`, `cache`, etc.).
3. Tag validation / auth / rate-limit / error branches with `synthetic`.
4. For streaming: tag every chunk via `enforceProvenanceOnChunk`.

## Exemptions

Operational / metrics endpoints (health, diagnostics, metrics export) are exempt unless embedding AI generated content. Any exemption for a path matching AI heuristics must include:

```ts
// PROVENANCE-EXEMPT: reason
```

(Planned: central EXEMPTIONS list in `audit-provenance-coverage.ts`).

## CI Gates

Scripts:

- `npm run test:provenance` – behavioral tests.
- `npm run test:provenance-coverage` – code pattern enforcement.
- `npm run test:provenance-audit` – path heuristic audit.
- `npm run test:provenance-negative` – ensures absence detection still works.

Deploy must fail if coverage < 100% (critical alert also raised in `/api/health`).

## Health Exposure

`/api/health` returns:

```
provenanceCoverage
kpis.provenanceCoveragePct
alerts[] entry if < 100%
```

Target: 100%.

## Tag Guidance

- `live`: Fresh inference / analysis.
- `cache`: Entire result reused intact.
- `hybrid`: Some sections refreshed, some reused.
- `mixed`: Multi-source ensemble.
- `synthetic`: Fallback (timeouts, upstream failure, validation or auth rejection).
- `unknown`: Development defect – fix immediately.

## New AI Route Checklist

1. Implement handler + wrap or explicit enforcement.
2. Add explicit success tag (avoid default unknown).
3. Tag all error/validation branches (`synthetic`).
4. Streaming? Use `enforceProvenanceOnChunk` per chunk.
5. Run `npm run test:provenance-audit` & `npm run test:provenance-negative`.
6. Confirm `/api/health` coverage 100%.

## Future Enhancements

- AST-based audit.
- Exemption registry with hashed file content.
- Daily coverage trend snapshots.
- ESLint rule for untagged AI responses.

## Ownership

Observability Lead (TBD) – metrics integrity.
Platform Lead (TBD) – middleware evolution.

---

Version: 1.0.0 (2025-08-11)
