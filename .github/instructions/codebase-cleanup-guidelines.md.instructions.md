---
applyTo: "src/app/api/**/*.ts,src/lib/**/*.{ts,tsx},src/**/*.d.ts,scripts/**/*.ts"
---
Objective
Eliminate leftover scaffolding artifacts (placeholders, markdown fences, redundant comments) and minor syntax / structural issues introduced by prior AI-assisted edits—without performing broad refactors, style churn, or semantic rewrites. Keep the diff minimal, targeted, and build-safe.

Core Principles
Minimal Surface Change: Touch only lines needed to fix syntax, provenance wrapping, or obvious placeholder artifacts.
No New Placeholders: Don’t insert “// existing code”, “// placeholder”, “// TODO” unless required to satisfy a non-void return type with a temporary stub.
Deterministic & Reversible: Each change should be clearly justifiable (e.g., unmatched brace, incorrect NextResponse.json signature, orphan variable, markdown fence).
Preserve Behavior: Do not alter logic paths or introduce new features.
Defer Lint Debt: Do not mass-convert any or rename unused parameters—only address syntax blockers or artifacts causing errors.
In-Scope Fix Types
Category	Examples to Fix	How to Fix
Unbalanced syntax	Missing ), }, ]	Add the minimal closing token; ensure formatting unchanged otherwise.
Misused NextResponse + provenance	NextResponse.json(enforceProvenance({...}, { path: 'x' }), { status: 200 }) is correct; fix cases where status was mistakenly passed inside enforceProvenance context or parentheses misaligned.	Introduce a const body = enforceProvenance(...); return NextResponse.json(body, { status }) if clarity needed.
Placeholder artifacts	Lines containing // ...existing code..., “```”, “/* existing code */”, comment-only bodies.	Remove line or the fence. If removal breaks return type, add minimal valid return.
Orphan identifiers	nextHandler, unused placeholder consts never referenced.	Replace with correct API (NextResponse.next()) or delete if truly unreferenced in that file.
Duplicate imports	Same symbol imported multiple times or now-unused after artifact removal.	Keep first occurrence; remove duplicates. Remove unused only if obviously introduced by placeholder (no speculative deletion).
Inline provenance omissions	API route returns raw object JSON with no provenance tag and not wrapped by withProvenance.	Wrap with enforceProvenance(obj, { path: '<route-id>' }). Use logical route path portion after /api/.
Broken comment fences	Stray backticks or partial markdown inserted in .ts/.tsx.	Remove fence markers only.
Out of Scope (Strictly Avoid)
Large-scale “any” replacement or typing improvements (tracked separately).
Reordering imports or applying project-wide formatting.
Renaming variables solely to silence lint warnings (unless they cause parse errors).
Changing runtime logic, adding new features, or altering data shapes.
Editing test files unless they fail to parse (syntax only).
Provenance Enforcement Rules
Use enforceProvenance() only when:

Route isn’t already wrapped with withProvenance.
Response is a standard JSON payload (not a streaming/Response object). Context object must contain path. Optional note for specific error conditions. Pattern (preferred):
Never put HTTP status inside the provenance context object.

File Selection Heuristics
Process all src/app/api/**/*.ts and key support libraries under src/lib/** plus any .d.ts where syntax artifacts appear. Skip:

node_modules, .next, dist, artifacts
testing & tests unless a syntax error is blocking typecheck.
Ordered Execution Workflow
Scan Pass (Non-Mutating):
Collect candidate files containing: ``` or ...existing code... or nextHandler.
Detect unmatched bracket/brace counts per file (quick stack approach).
Syntax Repair Phase:
Fix bracket/parentheses issues first (avoid cascading parse errors).
Provenance Normalization:
Adjust malformed NextResponse.json(enforceProvenance(... calls.
Insert provenance where missing (only API routes).
Artifact Purge:
Remove placeholder comments & markdown fences.
Delete or fix orphan identifiers.
Import Hygiene:
Remove duplicate imports and imports made unused solely by artifact removal.
Insert Minimal Returns:
For now-empty functions with declared return types, add minimal stub:
If return type is array-like: return []; // TODO: implement
If object: return {} as <Type>; // TODO: implement
If string/number: a neutral literal.
Validation:
Run tsc --noEmit (should pass).
Do NOT auto-run eslint --fix (avoid unintended broad reformat).
Report Summary:
Count files modified.
List routes where provenance was added.
Confirm zero parse errors remain.
Decision Guide
Situation	Action
Response already wrapped by withProvenance	Leave content; do not add enforceProvenance.
Response returns NextResponse.json(enforceProvenance(obj, { status: 200 }))	Split: const body = enforceProvenance(obj, { path: 'x' }); return NextResponse.json(body, { status: 200 });
Unknown path to use for provenance	Derive from folder path after /api/ (e.g. /api/admin/ai-usage/daily → admin/ai-usage/daily).
Comment-only function with required return type	Insert minimal stub + TODO.
Duplicate import with same specifier	Remove later duplicate.
Unused var introduced by placeholder (e.g., const unused = {};)	Remove safely if no references in file.
Examples
Before:

After:

Before (placeholder):

If return type void: remove line → function becomes empty body. If non-void:

Before (markdown fence):

Safety Checks
Run (manual or automated):

npm run typecheck
If failures appear, ensure no new placeholders or extraneous modifications were introduced.
Verify critical changed routes still export the same HTTP methods (GET, POST, etc.).
Reporting Format (Post-Run)
Produce a JSON (for logs) like:

Non-Goals
Reducing total lint error count (beyond side-effects of artifact removal).
Performance optimizations.
Concurrency or logic changes.
Test coverage adjustments.

Abort Conditions
Abort (and surface file + reason) if:

Removing a placeholder would require guessing complex domain logic.
A provenance path cannot be confidently inferred (leave untouched, log).
Quick Checklist
- All unmatched braces/parentheses fixed.
- No ``` fences remain in .ts/.tsx.
- No // ...existing code... markers remain.
- All malformed NextResponse.json(enforceProvenance(... corrected.
- Provenance added to previously untagged API JSON responses (not already wrapped).
- Orphan placeholders & nextHandler removed/replaced.
- Typecheck passes.