# Entitlement Flags Externalization Plan (Phase 2)

Objective: Move in-code `ENTITLEMENT_FLAGS` (src/lib/access-control.ts) to an external metadata source to allow dynamic plan adjustments without redeploy.

## Drivers

- Reduce need for code changes when adjusting SLA / support entitlements.
- Enable admin UI & future billing sync to modify entitlements.
- Support experiment toggles per plan cohort.

## Target State

- Firestore doc: `planEntitlements/{planTier}` with shape:

  ```json
  { "tier": "agency", "entitlements": { "priority_support": true, "white_label": true, "enterprise_sla": false }, "updatedAt": "ISO" }
  ```

- Access layer caches entitlements in-memory (TTL 5m) with safe fallback to static defaults if fetch fails.
- `canAccessFeature` no longer checks `ENTITLEMENT_FLAGS`; consumer functions call new `hasEntitlement(userAccess, key)`.

## Phases

1. Introduce `src/lib/access/entitlements.ts` with:

- `DEFAULT_ENTITLEMENTS` (mirrors current constants)
- `loadEntitlements()` (server) + client stub returning embedded defaults
- `hasEntitlement(userAccess, key)` using loaded map (tier >= minimum + entitlement enabled)

2. Migrate call sites (search for `ENTITLEMENT_FLAGS` and related keys) -> replace with `hasEntitlement`.
3. Add Firestore seed script `scripts/seed-entitlements.ts` to create docs for each tier.
4. Update tests: deprecated/entitlement FeatureGate usage test still ensures no FeatureGate gating of entitlements.
5. Remove `ENTITLEMENT_FLAGS` export from `access-control.ts` after verifying zero references.
6. CHANGE_LOG entry + rollback instructions (re-add constant & revert import lines) if dynamic fetch causes outage.

## Caching & Failure Policy

- Failure to fetch: log warning, continue with DEFAULT_ENTITLEMENTS.
- Partial doc missing field: merge with defaults (never produce undefined entitlements).
- Provide diagnostic endpoint addition in `/api/health` -> `entitlementsSource: 'dynamic' | 'default'`.

## Security

- Read access restricted to server (admin SDK). Client surfaces only derived boolean via API responses.

## Rollback Plan

1. Reintroduce constant `ENTITLEMENT_FLAGS` in `access-control.ts`.
2. Replace `hasEntitlement` usages with direct tier comparisons.
3. Remove dynamic loader & scripts.

## Acceptance Criteria

- No FeatureGate usage of entitlement keys (already enforced).
- Health endpoint shows dynamic load success.
- Changing Firestore doc toggles entitlement without rebuild (manual test).

-- Prepared: 2025-08-14
