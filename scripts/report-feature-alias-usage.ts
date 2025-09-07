#!/usr/bin/env ts-node
/*
 * Feature Alias Usage Report
 * Goal: Detect lingering source references to transitional alias keys (e.g., ai_insights) before final removal.
 * Method: Walk src/ and scan .ts/.tsx/.js/.mjs/.cjs skipping common excluded dirs.
 * Output: Logs match lines; optional OUTPUT_FILE JSON.
 * Exit Code: 0 (always) unless STRICT=1 then 2 on unauthorized matches.
 */
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "fs";
import { join } from "path";

interface Match {
  file: string;
  line: number;
  alias: string;
  context: string;
  allowed: boolean;
}

const root = process.cwd();
const aliasKeys = (process.env.ALIAS_KEYS || "ai_insights")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const ignoreKnown = process.env.IGNORE_KNOWN === "1";
const strict = process.env.STRICT === "1";

const allowPatterns = [
  /ai_insights\s*:\s*"advanced_analytics"/, // mapping in access-control
  /transitional alias feature key/i,
];

function shouldScanDir(p: string) {
  return !/(node_modules|\.next|playwright-report|test-results|\.git)/.test(p);
}

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    try {
      const st = statSync(full);
      if (st.isDirectory()) {
        if (shouldScanDir(full)) walk(full, files);
      } else if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry)) files.push(full);
    } catch {
      /* ignore */
    }
  }
  return files;
}

function scanFile(file: string): Match[] {
  const content = readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);
  const matches: Match[] = [];
  lines.forEach((lineText, idx) => {
    for (const alias of aliasKeys) {
      if (!alias) continue;
      if (lineText.includes(alias)) {
        const allowed = allowPatterns.some((p) => p.test(lineText));
        if (allowed && ignoreKnown) return;
        const context = lineText.trim().slice(0, 160);
        matches.push({
          file: file.replace(root + "/", ""),
          line: idx + 1,
          alias,
          context,
          allowed,
        });
      }
    }
  });
  return matches;
}

async function main() {
  const files = walk(join(root, "src"));
  const results: Match[] = [];
  for (const f of files) results.push(...scanFile(f));
  const unauthorized = results.filter((r) => !r.allowed);
  console.log("[alias-usage] matches", results.length);
  unauthorized.forEach((m) =>
    console.log(`[alias-usage] ${m.file}:${m.line} ${m.alias} :: ${m.context}`)
  );
  if (results.length === 0) console.log("[alias-usage] No occurrences found.");
  const out = process.env.OUTPUT_FILE;
  if (out) {
    try {
      mkdirSync(require("path").dirname(out), { recursive: true });
      writeFileSync(
        out,
        JSON.stringify(
          { generatedAt: new Date().toISOString(), aliasKeys, results },
          null,
          2
        )
      );
      console.log("[alias-usage] wrote", out);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: unknown }).message)
          : String(e);
      console.error("[alias-usage] failed write", msg);
    }
  }
  if (strict && unauthorized.length > 0) process.exit(2);
}

main().catch((e) => {
  console.error("[alias-usage] FAILED", e);
  process.exit(1);
});
