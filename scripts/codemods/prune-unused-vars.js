#!/usr/bin/env node
/**
 * prune-unused-vars.js
 * Dry-run friendly codemod that removes safe, clearly unused local variables & function parameters.
 * Safety heuristics:
 *  - Only acts on .ts / .tsx files (skip d.ts) inside src/ excluding test & story files.
 *  - Ignores exported declarations (looks for export keyword on same line).
 *  - Ignores React component first param (props) even if unused.
 *  - Skips any identifier starting with _ (conventionally intentional ignore).
 *  - Removes simple variable declarators "const foo = ...;" where foo never referenced.
 *  - Removes function parameters that are trailing and unused.
 *  - Dry-run by default: set APPLY=1 env to write changes.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const APPLY = process.env.APPLY === "1";

const targetDirs = [path.join(root, "src")];
const exts = new Set([".ts", ".tsx"]);

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, acc);
      continue;
    }
    const ext = path.extname(e.name);
    if (!exts.has(ext)) continue;
    if (e.name.endsWith(".d.ts")) continue;
    if (/(\.test|\.spec|stories)\./.test(e.name)) continue;
    acc.push(full);
  }
  return acc;
}

function collectRefs(code) {
  const refs = new Set();
  // crude identifier match (skip keywords)
  const re = /\b([a-zA-Z_$][\w$]*)\b/g;
  const keywords = new Set([
    "if",
    "for",
    "while",
    "return",
    "const",
    "let",
    "var",
    "function",
    "class",
    "switch",
    "case",
    "break",
    "import",
    "from",
    "export",
    "default",
    "extends",
    "implements",
    "new",
    "try",
    "catch",
    "finally",
    "throw",
    "await",
    "async",
    "type",
    "interface",
  ]);
  let m;
  while ((m = re.exec(code))) {
    if (!keywords.has(m[1])) refs.add(m[1]);
  }
  return refs;
}

function processFile(file) {
  const original = fs.readFileSync(file, "utf8");
  const lines = original.split(/\n/);
  const refs = collectRefs(original);
  const changes = [];
  let modified = false;
  // Pass 1: variable declarators
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/export\s+/.test(line)) continue; // exported surface
    // const foo = / let foo = / var foo =
    const m = /^(\s*)(const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=/.exec(line);
    if (m) {
      const name = m[3];
      if (name.startsWith("_")) continue;
      // ensure appears exactly once (this declarator) in file; remove if unused elsewhere
      let occurrences = 0;
      if (refs.has(name)) {
        const occRe = new RegExp("\\b" + name + "\\b", "g");
        // Count up to 2 occurrences without storing the match variable
        while (occRe.exec(original)) {
          occurrences++;
          if (occurrences > 1) break;
        }
      }
      if (occurrences === 1) {
        lines[i] = ""; // remove line
        modified = true;
        changes.push({ type: "var", name, line: i + 1 });
      }
    }
  }
  // NOTE: Parameter pruning disabled after discovering structural breakage in multi-line / complex signatures.
  // Future iteration could reintroduce with full parser (AST) rather than regex heuristics.
  // (Parameter pruning skipped)
  if (!modified) return null;
  const newContent = lines.join("\n");
  if (APPLY) fs.writeFileSync(file, newContent, "utf8");
  return { file, changes };
}

const files = targetDirs.flatMap((d) => walk(d, []));
const report = [];
for (const f of files) {
  const r = processFile(f);
  if (r) report.push(r);
}

const summary = {
  filesScanned: files.length,
  filesModified: report.length,
  totalRemovals: report.reduce((a, r) => a + r.changes.length, 0),
  apply: APPLY,
};
console.log(JSON.stringify(summary));
if (report.length) console.log(JSON.stringify(report, null, 2));
