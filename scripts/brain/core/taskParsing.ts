import fs from "fs";
import path from "path";
import type { Task } from "../../../types/brain";

export function parseTasks(inputs: {
  checkList?: string;
  queues?: string;
  changeLog?: string;
  todos?: string;
}): Task[] {
  const out: Task[] = [];
  const push = (raw: string, idPrefix: string) => {
    const trimmed = (raw || "").trim();
    if (!trimmed) return;
    const lines = trimmed.split(/\r?\n/).filter(Boolean).slice(0, 50);
    lines.forEach((ln, i) =>
      out.push({
        id: `${idPrefix}-${i}`,
        title: ln.slice(0, 80),
        raw: ln,
        domain: "unknown",
        status: "TODO",
      })
    );
  };
  if (inputs.checkList) push(inputs.checkList, "CL");
  if (inputs.queues) push(inputs.queues, "Q");
  if (inputs.changeLog) push(inputs.changeLog, "CH");
  if (inputs.todos) push(inputs.todos, "TD");
  // Auto-ingest from common sources if none provided
  if (!out.length) {
    const root = process.cwd();
    const safeRead = (p: string) => {
      try {
        return fs.readFileSync(path.join(root, p), "utf8");
      } catch {
        return "";
      }
    };
    const clRaw = safeRead("checkList.txt");
    if (clRaw) {
      // Extract actionable bullet lines (start with digit, dash, or asterisk) limited to 300 to avoid runaway.
      const bullets = clRaw
        .split(/\n/)
        .filter((l) => /^(\s*(\d+\.|-|\*)\s+)/.test(l) && !/\(DONE\)/i.test(l))
        .slice(0, 300);
      bullets.forEach((ln, i) =>
        out.push({
          id: `CLF-${i}`,
          title: ln.slice(0, 110),
          raw: ln,
          domain: "unknown",
          status: "TODO",
        })
      );
    }
    const ch = safeRead("docs/CHANGE_LOG.md");
    if (ch) {
      const todoLines = ch
        .split("\n")
        .filter((l) => /TODO|BACKLOG|PENDING/i.test(l));
      todoLines.slice(0, 120).forEach((ln, i) =>
        out.push({
          id: `CHD-${i}`,
          title: ln.slice(0, 110),
          raw: ln,
          domain: "unknown",
          status: "TODO",
        })
      );
    }
    const inc = safeRead("docs/INCOMPLETE_CODE_AUDIT.md");
    if (inc) {
      inc
        .split(/\n/)
        .filter((l) => l.trim().length > 6)
        .slice(0, 120)
        .forEach((ln, i) =>
          out.push({
            id: `INC-${i}`,
            title: ln.slice(0, 110),
            raw: ln,
            domain: "unknown",
            status: "TODO",
          })
        );
    }
  }
  // Lightweight domain heuristic
  for (const t of out) {
    const text = t.raw.toLowerCase();
    if (/firestore|api|backend|function|cloud|cron/.test(text))
      t.domain = "backend";
    else if (/ui|page|component|react|next\.js|route/.test(text))
      t.domain = "frontend";
    else if (/doc|spec|readme|reference/.test(text)) t.domain = "docs";
    else if (/infra|deployment|build|pipeline/.test(text)) t.domain = "infra";
    else if (/metric|telemetry|observability|kpi/.test(text)) t.domain = "ops";
    else if (/data|schema|event|analytics/.test(text)) t.domain = "data";
  }
  // Dedupe by title
  const seen = new Set<string>();
  const deduped: Task[] = [];
  for (const t of out) {
    const key = t.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(t);
  }
  return deduped;
}

export default { parseTasks };
