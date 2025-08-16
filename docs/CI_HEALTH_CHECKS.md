# CI / External Health Checks

Use the lightweight endpoint `/api/health/simple` for fast readiness and deployment validation.

## Endpoints

| Endpoint | Purpose | Cost | Notes |
|----------|---------|------|-------|
| `/api/health/simple` | Basic liveness + firebase-admin init + version/buildSha + uptime | Minimal | Use for k8s/uptime/edge monitors. Returns `{ ok, adminInitialized, version, buildSha, ts, uptimeMs }`. |
| `/api/health` | Full observability snapshot (latencies, KPIs, alerts, crawler metrics) | Higher | Avoid in tight polling loops; use manually or for scheduled dashboards (≥60s interval). |

## Example curl

```bash
curl -s https://your-host/api/health/simple | jq
```

## Interpreting Fields

- `ok`: Always true unless an unexpected internal error (rare). Use HTTP status for primary health (200 = healthy). 
- `adminInitialized`: False indicates Firebase Admin not fully configured (e.g., missing service account). Custom token issuance will fall back to stub in tests.
- `version`: Package version from `package.json` (semantic release pipeline can bump).
- `buildSha`: Set via `BUILD_SHA` env for traceability; defaults to `dev` locally.
- `uptimeMs`: Milliseconds since the lightweight probe module was first loaded (process uptime proxy for Next.js server worker).

## Recommended Monitoring Thresholds

- Alert if endpoint unreachable or non-200 for >2 consecutive checks.
- Warn if `adminInitialized=false` for >5 minutes in prod.
- (Optional) Track deployment success by ensuring `buildSha` or `version` matches expected release tag within rollout window.

## Enabling Real Custom Tokens in CI

Provide one of:

1. `FIREBASE_SERVICE_ACCOUNT_JSON` (preferred – entire JSON serialized) OR
2. Mount `serviceAccount.json` at repo root (ensuring it is not committed) OR
3. Env trio: `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` (escaped \n for newlines).

If absent, tests that need custom Firebase tokens will receive stub tokens; basic flows still pass.

 
## Graceful Degradation Policy

If Admin initialization fails, system serves stub tokens and limited Firestore-dependent metrics are marked degraded, but core navigation and most UI tests continue. Observability dashboards reflect reduced provenance / Firestore status.

---
Document last updated: {{DATE}}
