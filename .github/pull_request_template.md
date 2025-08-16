# Pull Request Template (Enhanced for T55)

## Summary

Brief description of the change.

## Type

- [ ] Feature
- [ ] Fix
- [ ] Refactor
- [ ] Docs
- [ ] Chore

## Risk / Impact

Describe potential impact or risk areas.

## Risk Checklist (T55)

- [ ] Public API unchanged or versioned
- [ ] Data model unchanged (or migration + rollback plan documented)
- [ ] Firestore rules unaffected (or rules diff reviewed)
- [ ] No secrets added / leaked
- [ ] Performance impact assessed (adds <5% to critical path) or justified
- [ ] Error handling preserves deterministic fallbacks
- [ ] Feature flags / gating intact (no orphan keys)
- [ ] Added code paths have provenance coverage if analytics-related
- [ ] Derived ratios NOT persisted (computed at read)
- [ ] Large arrays / payloads avoided (data minimization upheld)
- [ ] Rollback path (single revert) feasible

## Checklist

- [ ] Tests added/updated (if behavior changed)
- [ ] CHANGE_LOG.md updated with rationale & rollback
- [ ] No derived ratios persisted
- [ ] Feature gating preserved
- [ ] Follows data minimization rules

## Screenshots / Notes

(Optional)
