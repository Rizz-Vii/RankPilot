# Developer AI Agent (Aider) – Optional Local Workflow

Purpose: Speed up low‑risk repetitive refactors (tests, FeatureGate insertions, smoothing extensions, CRUD scaffolds) with an opt‑in terminal pair programmer. This integration is intentionally lightweight: no repo dependency, no runtime code changes.

## Why Aider

- Git diff discipline (auto commits per change, easy /undo)
- Repo map scales better than naive directory dumps
- Model agnostic (Claude, OpenAI, DeepSeek, local via OpenRouter)
- Easy rollback (each change is a small commit)

### Non‑Goals

- No autonomous long‑running edits
- No production secret exposure
- No adding Python env artifacts to the repo

### Install (Local Only)

Pick one method (Python 3.8–3.13 already installed in most dev containers):

```bash
python -m pip install aider-install && aider-install
# or (one-liner)
curl -LsSf https://aider.chat/install.sh | sh
```

Verify:

```bash
aider --version
```

Optional: isolate into a virtualenv (prevents global site-packages churn):

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install aider-install && aider-install
```

### Delegation Queue (Optional)

Workflow:

1. Create Delegation Block.
2. Enqueue:

```bash
npm run delegate:enqueue -- --taskId=DEL-COLORS --files=src/lib/metrics/status-colors.ts,testing/unit/metrics/metrics-colors.spec.cjs --summary="Extend semantic status colors mapping"
```

3. Process queue (manual): `npm run delegate:process`
4. Autorun (if aider installed): `AIDER_AUTORUN=1 npm run delegate:process`
5. Append aide outcome to `sessions/aider-log.jsonl`.

Queue file: `sessions/aider-queue.jsonl`.

### Safe Usage Policy

1. Add ONLY the files you intend to modify (avoid huge context):

   ```bash
   aider src/lib/access-control.ts testing/unit/access/feature-gate-alias-usage.spec.cjs
   ```

2. Keep diffs ≤ 180 lines per commit (soft). If >180, split. Hard cap: 220 (abort & split if exceeded).
3. After each aider commit run fast checks:

   ```bash
   npm run lint && npm run typecheck || echo "Fix issues before continuing"
   ```

4. Run targeted tests before stacking more edits (example):

   ```bash
   npm run test:unit:observability-mocked
   ```

5. Never add secrets: aider is blocked by `.aiderignore` but also visually confirm `git diff`.
6. Use `/undo` immediately if unrelated files appear in a proposed diff.

### Quick Commands

| Task                         | Example Prompt                                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Extend smoothing to adoption | “Replicate existing exponential smoothing (alpha=0.3) for crawler & semantic adoption metrics. Update interface + unit test. Keep diff minimal.” |
| Add marketing CRUD skeleton  | “Create /src/app/(app)/marketing/campaigns/page.tsx with FeatureGate marketing_dashboard and placeholder list component.”                        |
| Harden test                  | “Open feature-observability-smoothing.spec.ts and remove DOM injection fallback; adjust waits to assert native smoothed badge.”                  |

### Guardrails (/help inside Aider)

- `/files` list current tracked files
- `/add <file>` add another file
- `/drop <file>` remove from chat context
- `/undo` revert last AI commit
- `/model sonnet` switch model

### .aiderignore

We ship a project‑scoped `.aiderignore` to prevent large or sensitive files from being slurped. Review before first run.

### Review Checklist (Before Pushing AI Changes)

1. All changes logically related
2. No secrets / env / serviceAccount paths changed
3. Lint + typecheck pass
4. Affected tests updated & pass
5. CHANGE_LOG updated if behavior (not docs only)
6. If delegated: sessions/aider-log.jsonl line appended (size <200KB)

### Pre-Flight Guardrail

Run a lightweight prep to ensure you start from a clean, up-to-date tree:

```bash
npm run ai:aider:prep
```

If you see unrelated staged changes, stash or commit them before launching aider.

### Recommended Initial Trial

1. Optional branch: `git checkout -b chore/aider-trial`
2. Run aider on a trivial doc update (this file) to confirm workflow
3. Use it to draft Observability smoothing adoption extension (T16 follow‑up)
4. Append aide task summary to sessions/aider-log.jsonl (taskId, locAdded, locRemoved, status)

### Rollback

Delete this file, `.aiderignore`, remove `ai:aider` script & CHANGE_LOG entry. No application code touched.

---

Document version: 2025-08-15. Keep updates additive & minimal.
