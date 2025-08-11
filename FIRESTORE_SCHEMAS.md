# Firestore Schemas (Baseline)

> GOV-01 Phase 1 baseline. Each collection lists: purpose, required fields, optional fields, forbidden (never stored), indexes, rollback note.

## Global Forbidden Fields (Derived Ratios)

`ctr`, `roi`, `conversionRate`, `winRate`, `lifetimeValue`, `arpu`

Persisting any above triggers guard/test failure (see MKT-01 / PROV-01 policies).

---

## teams

Purpose: Team container & embedded members (legacy alongside Phase 2 subcollections).
Required: `name`, `ownerId`, `memberIds[] (uid)`, `createdAt`, `updatedAt`
Optional: `members[]` (legacy embedded membership), `planTier`
Forbidden: derived ratios, PII beyond email/avatar.
Indexes: (ownerId), (memberIds array-contains)
Rollback: remove subcollections first; revert rules to permissive read if access lockout occurs.

## teams/{teamId}/members

Purpose: Normalized membership (Phase 2).
Required: `userId|email`, `role`, `status`, `joinedAt`
Optional: `avatar`, `lastActive`, `name`
Forbidden: billing metrics, derived ratios.
Indexes: (role), (status)
Rollback: export docs, repopulate `teams.members` array, delete subcollection.

## teams/{teamId}/invites

Purpose: Pending invitations with hashed token.
Required: `emailLower`, `tokenHash`, `role`, `status`, `invitedBy`, `invitedAt`
Optional: `message`, `expiresAt`, `acceptedAt`
Forbidden: plaintext token
Indexes: (emailLower), (status)
Rollback: delete subcollection (or specific invite docs) – no user-owned data.

## marketingCampaigns

Purpose: Store raw inputs only.
Required: `userId`, `teamId?`, `name`, `channel`, `spend`, `clicks`, `impressions`, `createdAt`
Optional: `metadata`
Forbidden: `ctr`, `roi`, `cpa`, `cpl` (compute at read)
Indexes: (userId, createdAt desc), (teamId, createdAt desc)
Rollback: export & purge invalid derived fields, re-import sanitized.

## workflows

Purpose: Persist user-defined automation workflows.
Required: `userId`, `metadata.updated`, `definition`
Optional: `status`, `__provenance`
Forbidden: secrets inline (store in secure vault)
Indexes: (userId, metadata.updated desc)
Rollback: delete collection after export; remove code references.

## dashboardTemplates / workflowTemplates

Purpose: Seedable templates (idempotent).
Required: `templateKey`, `version`, `__provenance`
Optional: `layout`, `widgets`
Forbidden: user PII
Indexes: (templateKey, version)
Rollback: remove persistence calls; keep local seed arrays.

## neuroSeoAnalyses

Purpose: Store compact NeuroSEO synthetic/live analysis docs (Phase 0 synthetic; NEU-02 persistence).
Required: `userId`, `overallScore`, `createdAt`, `__provenance`, `urls[]`, `hashKey`
Optional: `topKeywords[]` (<=10 objects: keyword, position, volume), `topGaps[]`
Forbidden: giant raw arrays (>5KB), derived ratios, full engine payloads (retain only compact slice)
Indexes: (userId, createdAt desc), (hashKey)
Notes: Doc ID deterministic from hashKey for idempotent upsert; provenance values: `live` | `synthetic`.
Rollback: Remove persistence call in `live-exec.ts`, optionally delete collection or prune by provenance.

## neuroseoRateLimits

Purpose: Track per-scope (user/team) NeuroSEO live executions for rate limiting.
Required: `count`, `windowStart`
Optional: none
Forbidden: user PII beyond implicit scope id (document id is scope)
Indexes: (implicit single doc lookups only; no composite index required)
Rollback: delete collection (stateless); remove rate limit enforcement call from `neuroseo/live` API route.

## subscriptions / financeInvoices

Purpose: Billing state & invoices.
Required (subscriptions): `userId`, `status`, `tier`, `currentPeriodEnd`
Required (financeInvoices): `userId`, `period`, `amount`, `status`, `createdAt`
Optional: `trialEnd`, `cancelAt`, `issuedAt`, `paidAt`, `teamId`, `currency`, `description`
Forbidden: pricing derived ratios
Indexes: (userId), (userId, period desc), (userId, period desc, createdAt desc) [composite cursor pagination], (teamId, period desc)
Rollback: re-fetch from Stripe source of truth; if composite cursor causes perf issues remove `(userId, period desc, createdAt desc)` and revert API ordering.

## salesDeals

Purpose: Pipeline deals.
Required: `userId`, `title`, `stage`, `value`, `createdAt`
Forbidden: `winRate`
Indexes: (userId, stage), (userId, createdAt desc)
Rollback: export deals JSON, drop collection.

## audit collections (audits, seoAudits, keywordResearch, competitorAnalyses, serpData)

Purpose: Store user-scoped analysis artifacts.
Required: `userId`, `createdAt`
Forbidden: cross-user refs, derived ratios
Indexes: (userId, createdAt desc)
Rollback: purge by user scope.

---
Validation: CI will later parse this file to ensure every referenced collection in rules is declared here.
Next: Add FEATURE_KEYS.md; implement validation scripts.
