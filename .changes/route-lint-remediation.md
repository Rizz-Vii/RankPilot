# Summary of mechanical lint fixes applied to:

- src/app/api/stripe/webhook/route.ts

Changes:

- Consolidated imports to the top of the file and removed the unused NextRequest import.
- Replaced non-null assertion on STRIPE_WEBHOOK_SECRET with a safe fallback.
- Added runtime checks for missing stripe-signature header and missing webhook secret, returning appropriate HTTP errors.
- Minor formatting / whitespace adjustments to keep edits minimal and idempotent.

Suggested command to review & commit:
Run this from the repository root:

```bash
git add -A && git commit -m "chore(webhook): lint fixes - imports and webhook secret/header checks"
```
