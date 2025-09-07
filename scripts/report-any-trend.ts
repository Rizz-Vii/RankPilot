import fs from "fs";
import path from "path";

const baselinePath = path.resolve("artifacts/lint/any-baseline.json");
if (!fs.existsSync(baselinePath)) {
  console.error(
    "Baseline missing. Run scripts/generate-any-baseline.ts first."
  );
  process.exit(1);
}
const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const scan = (dir: string, acc: string[] = []) => {
  for (const e of fs.readdirSync(dir)) {
    const full = path.join(dir, e);
    if (fs.statSync(full).isDirectory()) {
      if (full.includes(`${path.sep}testing${path.sep}`)) continue;
      scan(full, acc);
    } else if (/\.(tsx?|jsx?)$/.test(e)) acc.push(full);
  }
  return acc;
};
const anyRegex = /:\s*any\b|any;/g;
let current = 0;
for (const f of scan(path.resolve("src"))) {
  const m = fs.readFileSync(f, "utf8").match(anyRegex);
  if (m) current += m.length;
}
console.log(`Baseline any=${baseline.totalAny} current any=${current}`);
if (current > baseline.totalAny) {
  console.error("Any count regression detected.");
  process.exit(1);
}
