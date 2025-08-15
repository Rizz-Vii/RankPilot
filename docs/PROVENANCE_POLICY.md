# Provenance Policy

This repo enforces provenance across AI-related routes. Static audits ensure wrappers and markers are present; runtime audits verify headers/fields.

## Configuration (.provenance-audit.json)

- extraHints: Array of regex strings to include in static AI route matching.
- extraRuntimeUrls: Runtime checks. Each has `path` and `type` (json|csv|sse).
- exemptions: Relative file paths exempted with rationale (document in this file).

Example:

```
{
  "extraHints": ["ai-tools"],
  "extraRuntimeUrls": [
    { "path": "/api/insights/run?sample=1", "type": "json" },
    { "path": "/api/chat/admin/stream", "type": "sse" },
    { "path": "/api/exports/metrics.csv", "type": "csv" }
  ],
  "exemptions": [
    "src/app/api/automation/run-due/route.ts"
  ]
}
```

## Adding Exemptions

1. Add the relative file path under `exemptions` in `.provenance-audit.json`.
2. Add a short rationale under “Exemptions” in this doc.

## Runtime Checks

- JSON: asserts `__provenance` in body.
- CSV: asserts `x-provenance` header.
- SSE: asserts `text/event-stream` content type and tries to read an initial chunk.
- Auth (401/403): runtime check is skipped and the static audit remains the source of truth.

## Strict Mode (PROV_STRICT=1)

- Non-stream AI routes must use `withProvenance`.
- Streaming endpoints should use `enforceProvenanceOnChunk`.

## CI

- Static audit runs on PRs (`.github/workflows/provenance-audit.yml`).
- Runtime audit can be triggered manually with a preview origin (`.github/workflows/provenance-audit-runtime.yml`).
