This file documents the small, idempotent lint/cleanup edits applied to scripts/consolidate-all-docs.js:

- Added 'use strict' to enable strict mode.
- Introduced a single NOW constant to avoid repeated calls to new Date() when generating timestamps (used for BACKUP_DIR, consolidated headers, and the summary).
- Replaced two uses of new Date() in generated output with NOW to improve consistency and silence repetitive-lint warnings.

Suggested quick checks (run from the repository root):

```bash
node scripts/consolidate-all-docs.js
```

```bash
git add -A && git commit -m "chore: lint fixes for scripts/consolidate-all-docs.js"
```
