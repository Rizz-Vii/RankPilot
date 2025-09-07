// Lightweight, conservative codemods using regex/string ops.
// Avoid AST libs to keep dependencies minimal; operate only within src/.

import fs from "fs";
import path from "path";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const SRC_DIR = path.join(repoRoot, "src");

type Change = { file: string; description: string };

function* walk(dir: string): Generator<string> {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      // Skip build outputs
      if (e.name === ".next" || e.name === "dist" || e.name === "out") continue;
      yield* walk(abs);
    } else if (e.isFile()) {
      if (abs.endsWith(".ts") || abs.endsWith(".tsx") || abs.endsWith(".js")) {
        yield abs;
      }
    }
  }
}

// Note: We intentionally avoid rewriting firebase-admin imports; server routes/services should use Admin SDK.

function planStripJsSuffix(): Change[] {
  const changes: Change[] = [];
  for (const file of walk(SRC_DIR)) {
    const txt = fs.readFileSync(file, "utf8");
    if (/import\(([^)]+)\)/.test(txt) && txt.includes(".js")) {
      // Heuristic match for dynamic imports with .js suffix
      const matches = txt.match(/import\(([^)]+)\)/g) || [];
      if (matches.some((m) => m.includes(".js"))) {
        changes.push({
          file,
          description:
            "Strip .js extension from dynamic import (NodeNext safe)",
        });
      }
    }
  }
  return changes;
}

function applyStripJsSuffix(): number {
  let edits = 0;
  for (const file of walk(SRC_DIR)) {
    const txt = fs.readFileSync(file, "utf8");
    // Replace import("./foo.js") -> import("./foo") conservatively
    const next = txt.replace(
      /import\((['"])((?:\.|..|\/)[^'")]+)\.js\1\)/g,
      (_m, q, p) => `import(${q}${p}${q})`
    );
    if (next !== txt) {
      fs.writeFileSync(file, next);
      edits++;
    }
  }
  return edits;
}

export function plan(): string[] {
  const pending: string[] = [];
  for (const c of planStripJsSuffix())
    pending.push(`${path.relative(repoRoot, c.file)} — ${c.description}`);
  if (pending.length === 0) return ["No codemod changes planned (clean)"];
  return pending;
}

export async function apply(): Promise<void> {
  const b = applyStripJsSuffix();
  console.log(`Codemods applied: strip-js-suffix=${b}`);
}
