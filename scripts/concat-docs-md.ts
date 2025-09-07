#!/usr/bin/env ts-node
/**
 * Concatenate all markdown files under ./docs (including subdirectories) into data.txt
 * ordered chronologically by leading ISO-like date in filename or top-level H1 heading.
 * Fallback ordering: file mtime, then path.
 *
 * Chronology heuristic:
 * 1. Match YYYY-MM-DD in filename.
 * 2. Else read first 20 lines looking for /^# .*?(\d{4}-\d{2}-\d{2})/.
 * 3. If no date, undefined -> sorted after dated files (by mtime asc then path).
 *
 * Output format:
 * === BEGIN <relativePath> (DATE:<date|N/A>) ===\n
 * <file contents>
 * === END <relativePath> ===\n\n
 * Skips binary‑looking files and >200KB safety cap per file to avoid huge blobs.
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, "docs");
const OUTPUT = path.join(ROOT, "data.txt");

interface FileEntry {
  rel: string;
  abs: string;
  date?: string;
  mtime: number;
}

function gather(dir: string, base: string, acc: FileEntry[]) {
  for (const entry of fs.readdirSync(dir)) {
    const abs = path.join(dir, entry);
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      gather(abs, base, acc);
      continue;
    }
    if (!entry.toLowerCase().endsWith(".md")) continue;
    const rel = path.relative(base, abs).replace(/\\/g, "/");
    const date = extractDate(entry, abs);
    acc.push({ rel, abs, date, mtime: stat.mtimeMs });
  }
}

function extractDate(filename: string, abs: string): string | undefined {
  const fileDateMatch = filename.match(/(20\d{2}-\d{2}-\d{2})/); // year 20xx
  if (fileDateMatch) return fileDateMatch[1];
  try {
    const fd = fs.openSync(abs, "r");
    const buf = Buffer.alloc(4096);
    const bytes = fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    const snippet = buf.slice(0, bytes).toString("utf8");
    const lines = snippet.split(/\r?\n/).slice(0, 20);
    for (const line of lines) {
      const m = line.match(/#.*?(20\d{2}-\d{2}-\d{2})/);
      if (m) return m[1];
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

function main() {
  if (!fs.existsSync(DOCS_DIR)) {
    console.error("docs directory not found");
    process.exit(1);
  }
  const entries: FileEntry[] = [];
  gather(DOCS_DIR, DOCS_DIR, entries);

  entries.sort((a, b) => {
    if (a.date && b.date)
      return a.date.localeCompare(b.date) || a.rel.localeCompare(b.rel);
    if (a.date && !b.date) return -1;
    if (!a.date && b.date) return 1;
    // neither has date -> sort by mtime then path
    if (a.mtime !== b.mtime) return a.mtime - b.mtime;
    return a.rel.localeCompare(b.rel);
  });

  const lines: string[] = [];
  for (const e of entries) {
    let content = "";
    try {
      const stat = fs.statSync(e.abs);
      if (stat.size > 200 * 1024) {
        // 200KB safety cap
        content = `Skipped (size ${stat.size} > 200KB cap)`;
      } else {
        // naive binary detection: presence of many NUL bytes
        const raw = fs.readFileSync(e.abs);
        const slice = raw.slice(0, 1024);
        const nulCount = [...slice].filter((b) => b === 0).length;
        if (nulCount > 0) {
          content = "Skipped (binary-like file)";
        } else {
          content = raw.toString("utf8");
        }
      }
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === "object" &&
        "message" in (err as Record<string, unknown>)
          ? String((err as { message?: unknown }).message)
          : String(err);
      content = `Error reading file: ${msg}`;
    }
    lines.push(`=== BEGIN ${e.rel} (DATE:${e.date || "N/A"}) ===`);
    lines.push(content.trimEnd());
    lines.push(`=== END ${e.rel} ===`);
    lines.push("");
  }

  fs.writeFileSync(OUTPUT, lines.join("\n"), "utf8");
  console.log(
    `Wrote ${entries.length} markdown files into ${path.relative(ROOT, OUTPUT)}`
  );
}

if (require.main === module) {
  main();
}
