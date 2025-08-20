This change set performs idempotent lint cleanups on src/components/ui/feature-gate.tsx:

- Remove unused imports (canAccessFeature, useAuth).
- Avoid unused local variables (subscription, user) by only destructuring what is used.
- Use type-only imports from React for ReactNode and ComponentType and update usages.
- Keep behavior unchanged; only addresses lint/warning noise.

Suggested commands to review/apply:
```bash
git add src/components/ui/feature-gate.tsx
```
```bash
git commit -m 'chore(lint): clean up feature-gate imports and unused vars'
```
