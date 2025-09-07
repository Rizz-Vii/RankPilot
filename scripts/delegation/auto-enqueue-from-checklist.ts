#!/usr/bin/env ts-node
/**
 * Auto-enqueue mechanical delegation tasks by scanning checkList.txt for known TODO task IDs.
 * Scope: Safe, low-risk scaffolds or small doc/page insertions. Idempotent.
 * No external deps. Extend mapping as needed.
 */
import fs from "fs";
import path from "path";
import { readQueue, writeQueue } from "./queue-utils";

interface CandidateSpec {
  taskId: string;
  summary: string;
  files: string[];
  message?: string;
}

const ROOT = process.cwd();
const CHECKLIST = path.resolve(ROOT, "checkList.txt");

function fileExists(rel: string) {
  return fs.existsSync(path.resolve(ROOT, rel));
}

const TASK_MAPPINGS: Record<string, () => CandidateSpec | null> = {
  T29: () => ({
    taskId: "DEL-T29-EVENT-EXPLORER-FILTERS",
    summary:
      "Implement Event Explorer filters (type/source/date) + CSV export scaffolding",
    files: ["src/app/(app)/admin/events/page.tsx", "src/lib/events"],
    message:
      "Add client-side filters + CSV button to Event Explorer page. Keep diff minimal; no backend changes.",
  }),
  T53: () => ({
    taskId: "DEL-T53-ARCH-DELTA-DOC",
    summary: "Add architecture delta doc stub section for latest phases",
    files: ["docs/COMPREHENSIVE_SYSTEM_ARCHITECTURE.md"],
    message:
      "Insert short Architecture Delta section placeholder if not present; <40 LOC.",
  }),
  T54: () => ({
    taskId: "DEL-T54-EVENT-SCHEMA-REF",
    summary: "Add Event Schema reference stub",
    files: ["docs/FIRESTORE_SCHEMAS.md"],
    message:
      "Add brief /orgs/{orgId}/events schema block (fields list) if absent; no large rewrite.",
  }),
  T55: () => ({
    taskId: "DEL-T55-PR-TEMPLATE",
    summary: "Insert risk checklist into PR template",
    files: [".github/pull_request_template.md"],
    message:
      "Append or create risk checklist section; avoid changing existing text heavily.",
  }),
  T56: () => ({
    taskId: "DEL-T56-CONTEXT-INDEX-STUB",
    summary: "Context index generator job stub (ensure script exists)",
    files: ["scripts/generate-context-index.ts"],
    message:
      "If script missing TODO markers, add TODO comment about future indexing; no functional changes.",
  }),
  T57: () => ({
    taskId: "DEL-T57-CHANGELOG-HOOK",
    summary: "CHANGE_LOG enforcement pre-commit hook stub",
    files: ["scripts/validate-changelog.mjs", ".husky/pre-commit"],
    message:
      "Add/ensure stub that exits non-zero if docs/CHANGE_LOG.md missing required section header when behavior files changed.",
  }),
  T58: () => ({
    taskId: "DEL-T58-ONBOARDING-VALIDATION",
    summary: "Onboarding validation script stub",
    files: ["scripts/verify-env.ts"],
    message:
      "Ensure verify-env.ts includes placeholder for onboarding aggregate check; add TODO comment.",
  }),
};

function scanChecklistFor(ids: string[]): Set<string> {
  if (!fs.existsSync(CHECKLIST)) return new Set();
  const text = fs.readFileSync(CHECKLIST, "utf8");
  const found = new Set<string>();
  ids.forEach((id) => {
    if (new RegExp(`^${id}\\b`, "m").test(text)) found.add(id);
  });
  return found;
}

function main() {
  const targetIds = Object.keys(TASK_MAPPINGS);
  const present = scanChecklistFor(targetIds);
  const queue = readQueue();
  const existingIds = new Set(queue.map((t) => t.taskId));
  let added = 0;
  for (const id of present) {
    const specFn = TASK_MAPPINGS[id];
    if (!specFn) continue;
    const spec = specFn();
    if (!spec) continue;
    if (existingIds.has(spec.taskId)) continue;
    // Basic file presence filter: skip if none of the target dir/files exist yet (prevents noise)
    if (!spec.files.some((f) => fileExists(f) || f.endsWith("/"))) continue;
    const toPush = {
      taskId: spec.taskId,
      summary: spec.summary,
      files: spec.files,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(spec.message ? { notes: spec.message } : {}),
    };
    // queue utils expects DelegationQueueTask; notes is allowed and matches shape
    type DelegationQueueTask = {
      taskId: string;
      summary: string;
      files: string[];
      status: "pending" | "running" | "done" | "failed";
      createdAt: string;
      updatedAt: string;
      aideModel?: string;
      notes?: string;
    };
    queue.push(toPush as unknown as DelegationQueueTask);
    added++;
  }
  if (added) writeQueue(queue);
  console.log(
    JSON.stringify({
      autoEnqueue: {
        considered: targetIds.length,
        present: Array.from(present),
        enqueued: added,
      },
    })
  );
}

main();
