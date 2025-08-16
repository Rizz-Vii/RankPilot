# Event Backbone Reference (Aug 15 2025)

Authoritative specification for the canonical business event stream powering analytics, orchestration, and Revenue Truth AI.

## Goals

- Unified immutable record of cross‑module domain activity.
- Deterministic, low‑cost enrichment and export to BigQuery / Pub/Sub.
- Foundation for automation triggers, attribution, anomaly detection.

## Collection Path

`/orgs/{orgId}/events/{eventId}`

## Immutability Policy

- Create only; updates & deletes rejected by Firestore security rules (T27).
- Any attempted mutation should surface test failure in security negative suite.

## Canonical Event Schema

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| orgId | string | yes | Derived from path; duplicated for query efficiency. |
| teamId | string | no | Present when event scoped to team subset. |
| userId | string | no | Actor (if user initiated). |
| source | string | yes | Subsystem origin (e.g. `automation`, `finance`, `marketing`, `sales`, `seo`, `system`). |
| type | string | yes | Namespaced semantic type (e.g. `automation.run.started`, `finance.invoice.created`). Registry (T27) enforce allow‑list. |
| ts | Timestamp | yes | Event occurrence time (server). |
| shard | number | yes | 0–63 hash shard for hot partition mitigation (pre‑computed from eventId). |
| attrs | object | no | Compact key/value payload (primitive scalars only, <= 20 keys). |
| provenance | string | yes | One of: live / synthetic / derived. |
| version | number | yes | Schema evolution (default 1). |
| hash | string | yes | Stable SHA256 of (orgId+type+ts+optional natural key) for idempotency detection. |

Constraints:

- No nested objects >1 level. No arrays of objects (only string[] or number[] if essential and <10 length). Avoid large text blobs.
- Derived ratios forbidden (compute at read).

## ID Strategy

`eventId = <ts_epoch_ms>-<shortHash>` ensuring chronological ordering while preserving uniqueness.

## Event Type Registry (T27)

Central module (`src/lib/events/types.ts`) exports a string literal union or enum consumed by publisher + lint script. CI / pre‑commit rejects unknown `type` strings via simple grep + parser.

## Publishing Flow

1. Domain code constructs payload (orgId, type, attrs minimal).
2. Calls `publishEvent({ orgId, type, source, attrs, userId?, teamId? })`.
3. Publisher adds ts, shard, version, provenance, hash and writes doc.
4. Cloud Function trigger (T28) streams subset fields to BigQuery & Pub/Sub.

## BigQuery Mirror

Table: `event_stream.events` (partitioned by DATE(ts), clustered on type, source). Fields parity with Firestore minus `shard` (kept if cardinality assists).

## Pub/Sub Topic

`event-stream` (JSON payload). Downstream subscribers implement automation triggers, anomaly detection, attribution.

## Automation Lifecycle Events

| Type | Description |
|------|-------------|
| automation.run.started | Execution queued or beginning |
| automation.run.step | Step completed (attrs.step, attrs.status) |
| automation.run.completed | Successful finish |
| automation.run.failed | Terminal failure (attrs.errorCode) |

## Sample Event Document

```json
{
  "orgId": "org_123",
  "teamId": "team_a",
  "userId": "user_42",
  "source": "automation",
  "type": "automation.run.started",
  "ts": { "_seconds": 1692100000, "_nanoseconds": 0 },
  "shard": 12,
  "attrs": { "runId": "run_abcd", "recipe": "daily_semantic_map" },
  "provenance": "live",
  "version": 1,
  "hash": "3f2ab0..."
}
```

## Security Rules Snippet (Planned)

```firestore
match /orgs/{orgId}/events/{eventId} {
  allow create: if request.auth != null && request.resource.data.orgId == orgId;
  allow update, delete: if false; // immutable
  allow get, list: if request.auth != null && request.auth.token.orgIds.hasAny([orgId]);
}
```

(Exact org membership expression to align with existing team/org access model.)

## Testing Strategy

- Unit: publisher populates required fields & hash stable under same inputs.
- Security negative: update/delete denied.
- Performance: write P95 latency snapshot vs threshold.
- Lint: new type added without registry entry causes failure.

## Evolution Plan

| Version | Change |
|---------|--------|
| 1 | Initial schema |
| 2 | (Reserved) Add lightweight `ingestId` for external connectors |

## Rollback Plan

If high write contention / cost spike: disable triggers, revert publisher calls to no‑op stub (feature flag), retain existing docs for audit; re‑enable after investigation.

---

Linked from architecture overview; do not duplicate full table elsewhere.
