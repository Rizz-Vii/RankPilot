/**
 * Hex Color Scan Script
 * Fails if disallowed raw hex color literals are found outside of approved palette variables.
 * Heuristic: flags #RRGGBB or #RGB not appearing in tailwind config, global CSS variables, or within allowed palette comment allowlist.
 */
import fs from "fs";
import path from "path";

const ALLOWLIST_FILE_SNIPPETS = ["tailwind.config", "globals.css", "theme.css"];

const HEX_REGEX = /#[0-9a-fA-F]{3,6}\b/g;

function scan(root: string): string[] {
  const violations: string[] = [];
  function walk(p: string) {
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      for (const e of fs.readdirSync(p)) walk(path.join(p, e));
      return;
    }
    if (!/\.(ts|tsx|js|jsx|css|scss|mjs|cjs)$/i.test(p)) return;
    const text = fs.readFileSync(p, "utf8");
    const matches = text.match(HEX_REGEX);
    if (!matches) return;
    if (ALLOWLIST_FILE_SNIPPETS.some((sn) => p.includes(sn))) return; // skip palette sources
    matches.forEach((hex) => {
      if (/ALLOW_HEX/.test(text)) return; // allow file-level opt-out
      violations.push(`${p}: ${hex}`);
    });
  }
  walk(root);
  return violations;
}

const root = path.join(process.cwd(), "src");
const v = scan(root);
if (v.length) {
  console.error(
    "\x1b[31mHex color scan FAILED (raw hex literals found)\x1b[0m"
  );
  v.slice(0, 50).forEach((x) => console.error(" -", x));
  if (v.length > 50) console.error(` ... (${v.length - 50} more)`);
  process.exit(1);
} else {
  console.log("Hex color scan passed (no disallowed raw hex literals).");
}
