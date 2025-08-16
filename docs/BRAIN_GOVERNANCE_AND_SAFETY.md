# Brain Governance & Safety

Guards: per-batch LOC and file-count limits, secret redaction, idempotent planning, rollback. This stub documents initial guard behavior and will be expanded in later phases.

- Hard limits: LOC added ≤ 450, files touched ≤ 15 per batch.
- Secrets: never log secrets; redact sensitive values from artifacts.
