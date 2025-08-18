# RUNBOOK (Draft) – Ops & Incident Response

Scope: NeuroSEO services, Billing (Stripe), Provenance & Data Integrity, Rate Limiting, Metrics.

## 1. Incident Classification

| Level | Criteria                                                        | Immediate Action                                            |
| ----- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| P1    | All analyses failing OR >50% synthetic fallback sustained 5m    | Enable maintenance banner; investigate backend connectivity |
| P2    | Fallback rate doubled vs 24h baseline OR p95 latency +40%       | Log degraded=true; open ticket; increase sampling logs      |
| P3    | Single feature partial outage (billing UI stale, metrics delay) | Log issue; schedule fix within sprint                       |

## 2. NeuroSEO Outage Procedure

1. Hit /api/internal/metrics – confirm counters updating.
2. Check logger for backend_error / timeout spikes.
3. If backend unreachable: force synthetic-only mode (feature flag) and emit audit log.
4. Persist incident start time; update status page (if available).

## 3. Elevated Synthetic Fallbacks

1. Categorize reasons (timeout vs backend_error vs rate_limited).
2. If timeout dominated: lower concurrency or shorten per-request scope.
3. If backend errors: capture errorCodes, escalate to backend provider.

## 4. Billing Webhook Failures / Duplicates

1. Query stripeProcessedEvents for eventId states.
2. For processing errors: re-run handler in dry-run mode (script TBD) to reproduce.
3. For duplicates incorrectly processed: adjust idempotency logic, mark duplicates invalid, reconcile subscription state manually.

## 5. Security / Cross-Tenant Breach Suspicion

1. Re-run negative rules test suite (npm run test:security-negative).
2. Audit logs for unexpected teamId/userId combinations.
3. Temporarily restrict high-risk routes; patch rule; add regression test.

## 6. KPIs & Thresholds

| KPI                     | Warn          | Critical                  | Action                                 |
| ----------------------- | ------------- | ------------------------- | -------------------------------------- |
| p95 live latency        | 15s           | 20s                       | Profile exec path; check rate limiter  |
| Cache hit ratio         | 35%           | 25%                       | Investigate hash consistency / TTL     |
| Synthetic fallback rate | 18%           | 25%                       | Inspect backend, timeouts, rate limits |
| Avg compact doc size    | 4.2KB         | 4.5KB                     | Trim fields; add compression plan      |
| Rate limit rejection %  | 3%            | 7%                        | Tune thresholds / burst bucket         |
| Team limit utilization  | <60%          | <40%                      | Investigate under-utilization / config |
| Provenance coverage     | 100% required | 100% required (fail if <) | Fix offending endpoint before deploy   |

## 7. Health Endpoint Expectations (/health)

Fields: status, buildSha, buildTime, firestoreOk, provenanceCoverage (raw % from unified metrics), kpis.provenanceCoveragePct (KPI normalized), kpis.teamRateLimitUtilizationPct, alerts[] (includes provenanceCoverage if <100% or utilization anomalies), metrics subset (neuro, unified.latency p95 map), timestamp.

Reference: see `PROVENANCE_POLICY.md` for enforcement details. Coverage must remain 100%; any degradation is CRITICAL (deployment should be blocked by CI gates `test:provenance-audit`).

## 8. Rollback Strategy

Code: git revert COMMIT_SHA (ensure tests pass).  
Schema: follow CHANGE_LOG rollback steps exactly.  
Config: restore previous env snapshot (.env.backup) and redeploy.

## 9. Logging & Tracing Quick Reference

Use getLogger(component).withTrace() for multi-step operations.  
Flags: audit() for compliance events, degraded() for fallback path.

## 10. Ownership (Placeholders)

Platform: TBD  
Backend: TBD  
Billing: TBD  
Security: TBD  
Observability: TBD

### Ownership Transfer & Role Escalation (TEAM-01)

Test Coverage: `scripts/test-team-ownership-and-roles.ts` (runs in `test:critical`).

Guards:

- Only current owner may update `teams/{teamId}.ownerId`.
- Members cannot elevate their own role field in `teams/{teamId}/members/{memberId}` from 'member' to 'admin' or 'owner'.

Operational Response:

1. If unauthorized ownership change detected, lock team writes (temporary rule hotfix) and restore prior owner from audit logs.
2. Run ownership & role test scripts against emulator to validate rule patch before redeploy.
3. Add regression rule ensuring historical vector (ownerId change) requires authenticated owner context.

Team Rate Limiter Metrics:

- `teamRateLimitAllows` (allowed increments) & `rateLimitRejections` (existing) feed KPI `teamRateLimitUtilizationPct`.
- Low utilization (<60% warn, <40% critical) with high rejection rate indicates misconfigured threshold or burstiness requiring adaptive algorithm (future token bucket).

## 11. Open TODOs (Promote to Final)

## Maintenance Jobs

### Invite Maintenance (TEAM-01)

Artifacts:

- Global index collection: `invites_index` (fields: teamId, emailLower, status, createdAt, updatedAt)
- Cleanup script: `npm run cleanup:invites` (alias for `ts-node scripts/cleanup-invites.ts`)
- Admin dev endpoint (non-production): `DELETE /api/admin/invites/index?inviteId=...` — removes an index doc to exercise backfill path in acceptance flow.

Flow:

1. Invite created -> index doc written `{ status: pending }`.
2. Acceptance -> transaction updates invite + sets index doc `{ status: accepted }`.
3. Cleanup script:

- Marks pending & expired invites ("status: expired").
- Deletes accepted invites older than 30 days (configurable via `INVITES_ACCEPTED_RETENTION_DAYS`).
- Deletes expired invites older than 14 days (configurable via `INVITES_EXPIRED_RETENTION_DAYS`).
- Removes orphan index docs.
- Records metrics via `recordInviteMaintenance` for surfaced health alerts.

Health Exposure:

- `/api/health` includes `unified.inviteMaintenance` and alerts:
  - `inviteOrphanIndexes` (warn if > 0)
  - `inviteExpirationsSpike` (warn if markedExpired > 50 in interval)

Cron / Scheduling:

- Recommended: Nightly Cloud Scheduler hit to a secured Cloud Function wrapper or CI workflow calling the script.
- Ensure production endpoint disablement remains (admin deletion endpoint blocked in prod).

Operational Playbook:

- Sudden spike in `inviteExpirationsSpike`: investigate abandoned invites → consider UX nudge or shorter retention.
- Non-zero `inviteOrphanIndexes`: run cleanup script manually then audit recent acceptance logs for transaction failures.

---

This draft will graduate to final when OBS-01 & PROV-01 are complete.
