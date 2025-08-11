# Feature Key Registry (Baseline)

Purpose: Canonical list of stable string keys controlling feature flags, UI gating, metrics grouping, and provenance classification.

## Conventions

- snake_case for storage keys; camelCase allowed in code constants mapping.
- Prefix domains: `team_`, `marketing_`, `billing_`, `neuro_`, `workflow_`, `security_`.
- No dynamic concatenation in persisted docs; always store full key.

## Keys

| Key | Domain | Description | Status |
| --- | ------ | ----------- | ------ |
| team_invites | team | Enable new subcollection invite flow endpoints (GET/POST/PUT) | active |
| team_members_subcollection | team | Treat subcollection as source of truth for membership | rolling_out |
| marketing_guard_enforced | marketing | Block writes persisting derived metrics (ctr, roi, etc.) | active |
| marketing_guard_tests | marketing | Execute MKT-01 test suite (CI only) | planned |
| neuro_synthetic_phase0 | neuro | Use deterministic synthetic generation | active |
| neuro_live_backend | neuro | Switch to live aggregation pipeline (NEU-01) | rolling_out |
| neuro_live_persistence | neuro | Persist compact live analyses (NEU-02) | rolling_out |
| api_access | platform | Enable public API access & key management UI | rolling_out |
| white_label | reporting | White-label branding & custom logos | active |
| team_management | team | Team management dashboard & advanced roles | rolling_out |
| custom_integrations | platform | Custom integration connectors (webhooks/zapier) | planned |
| workflow_templates_persist | workflow | Persist user-modified templates | active |
| security_provenance_required | security | Require __provenance field on generated docs | active |
| security_negative_tests | security | Run SEC-01 negative Firestore rule tests | planned |
| billing_stripe_webhooks | billing | Enable Stripe webhook ingestion | planned |
| billing_portal_access | billing | Expose billing portal UI | rolling_out |

## Lifecycle States

- planned: Defined; not yet in code.
- active: Live and enforced.
- rolling_out: Partial adoption; legacy path still present.
- deprecated: Avoid in new code; removal scheduled.
- removed: No longer referenced.

## Usage Pattern

1. Define constant in code: e.g. `FEATURE_KEYS.team.invites`.
2. Reference in gating logic and tests.
3. Update this file when status changes (include CHANGE_LOG entry with rollback).

## Validation

Future CI script will parse this file ensuring all feature gate references exist and no removed keys are used.
