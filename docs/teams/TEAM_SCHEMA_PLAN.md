# TEAM-01 Phase 1 – Team Schema & Security Hardening Plan

Scope (This Phase):

- Tightened Firestore team doc read access (members or admin only).
- Restrict create to authenticated owner included in `memberIds`.
- Centralized structured logging via `app-logger` (LOG-01 P1) replacing ad-hoc console logging in NeuroSEO orchestrator.

Observed Team Document:

```
teams/{teamId} {
  name: string
  ownerId: string
  memberIds: string[]
  members: [{ userId, email, role, status, name, avatar, joinedAt, lastActive }]
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

Planned Phase 2:

1. Introduce `teams/{teamId}/members/{userId}` subcollection for scalable membership & granular rule enforcement.
2. Add invite workflow: `teamInvites/{inviteId}` (fields: email, teamId, role, tokenHash, expiresAt, createdBy, acceptedAt, revokedAt).
3. Role-based rules: owner/admin can update roles & remove members; member self-profile updates (avatar, lastActive) only.
4. Computed field guard (prevent client write of derived counts).

Planned Phase 3 (Optional Enhancements):

- `teamEvents` append-only audit (join, leave, role_change, ownership_transfer).
- Quota-enforced invites (limit outstanding invites per team).
- Background reconciliation job ensuring `memberIds` sync with subcollection.

Observability Alignment:

- `app-logger` emits JSON logs with trace IDs for future correlation (to be propagated via headers in API routes).
- Later integration: pipe combined traces into Functions `StructuredLogger` or OTEL exporter.

Rollback:

1. Revert `firestore.rules` team block to previous permissive variant if legitimate member reads fail.
2. Swap orchestrator logger back to inline console object if bundle regressions appear.
3. Remove `src/lib/logging/app-logger.ts` if duplication with server logger causes confusion (open follow-up issue first).

Validation Checklist:

- [ ] Member can still load team settings & members list.
- [ ] Non-member receives Firestore permission denied reading a team doc.
- [ ] New team creation succeeds when owner included in `memberIds`.
- [ ] NeuroSEO orchestrator emits structured JSON log lines (search for component `neuroseo-orchestrator`).
