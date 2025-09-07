#!/usr/bin/env ts-node
import { recordQueueEnqueue } from "@/lib/metrics/queue-metrics";
import type { DelegationQueueTask } from "./queue-utils";
import { appendTask, readQueue } from "./queue-utils";

const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const p = "--" + name + "=";
  return args.find((a) => a.startsWith(p))?.slice(p.length);
}

const taskId = getArg("taskId");
const filesArg = getArg("files");
const summary = (getArg("summary") || "").trim();
if (!taskId || !filesArg || !summary) {
  console.error(
    'Usage: npm run delegate:enqueue -- --taskId=DEL-FOO --files=path1,path2 --summary="Short description"'
  );
  process.exit(1);
}

if (!/^DEL-[A-Z0-9\-]+$/.test(taskId)) {
  console.error(
    "taskId must start with DEL- and be uppercase alphanumerics/dashes"
  );
  process.exit(1);
}

const existing = readQueue().find((t) => t.taskId === taskId);
if (existing) {
  console.error("Task already exists in queue:", taskId);
  process.exit(1);
}

const files = filesArg
  .split(",")
  .map((f) => f.trim())
  .filter(Boolean);
if (!files.length) {
  console.error("At least one file required");
  process.exit(1);
}

const now = new Date().toISOString();
const task: DelegationQueueTask = {
  taskId,
  summary,
  files,
  status: "pending",
  createdAt: now,
  updatedAt: now,
};

appendTask(task);
try {
  recordQueueEnqueue(1);
} catch {
  /* metric optional */
}
console.log("Enqueued", taskId, "files:", files.length);
