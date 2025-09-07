#!/usr/bin/env node
// Lightweight enforcement: block reintroduction of useState<unknown (non-array) patterns.
// Rationale: All prior unknown state usages have been eliminated; future additions should use a typed interface.
const fs = require("fs");
const path = require("path");

const SRC = path.resolve(process.cwd(), "src");
let offenders = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === "node_modules" || e.name.startsWith(".next")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) {
      const txt = fs.readFileSync(full, "utf8");
      const regex = /useState<unknown(?!\s*\[)/g;
      let m;
      while ((m = regex.exec(txt))) {
        const line = txt.slice(0, m.index).split(/\n/).length;
        offenders.push({ file: path.relative(process.cwd(), full), line });
      }
    }
  }
}

try {
  if (!fs.existsSync(SRC)) {
    console.log("[scan-unknown-state] No src directory; skipping.");
    process.exit(0);
  }
  walk(SRC);
  if (offenders.length) {
    console.error(
      "\n❌ Unknown state usage detected (useState<unknown ...). Define an interface instead."
    );
    offenders.forEach((o) => console.error(` - ${o.file}:${o.line}`));
    process.exit(2);
  }
  console.log("[scan-unknown-state] ✅ No useState<unknown occurrences.");
} catch (e) {
  console.error("[scan-unknown-state] Error:", e.message);
  process.exit(1);
}
