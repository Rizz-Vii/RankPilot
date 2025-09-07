import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

export interface DiagnosticsResult {
  ts: number;
  typecheck: { errors: number; rawExcerpt: string };
  lint: { errors: number; warnings: number; rawExcerpt: string };
}

function run(label: string, cmd: string, args: string[], maxOutput = 8000) {
  const started = Date.now();
  const res = spawnSync(cmd, args, {
    encoding: "utf8",
    env: { ...process.env },
  });
  const out = (res.stdout || "") + "\n" + (res.stderr || "");
  const truncated =
    out.length > maxOutput
      ? out.slice(0, maxOutput) +
        `\n...<truncated ${out.length - maxOutput} chars>`
      : out;
  return {
    label,
    code: res.status ?? 0,
    out: truncated,
    durationMs: Date.now() - started,
  };
}

function extractTsErrorCount(raw: string): number {
  const m = raw.match(/Found (\d+) error/);
  if (m) return Number(m[1]);
  const lines = raw.split(/\n/).filter((l) => /error TS\d+:/.test(l));
  return lines.length;
}
function extractLintCounts(raw: string): { errors: number; warnings: number } {
  const m = raw.match(/(\d+) problems? \((\d+) errors?, (\d+) warnings?\)/i);
  if (m) return { errors: Number(m[2]), warnings: Number(m[3]) };
  const err = raw.split(/\n/).filter((l) => l.includes("error  ")).length;
  const warn = raw.split(/\n/).filter((l) => l.includes("warning  ")).length;
  return { errors: err, warnings: warn };
}

export function collectDiagnostics(): DiagnosticsResult {
  const tc = run("typecheck", "npm", ["run", "typecheck"]);
  const lint = run("lint", "npm", ["run", "lint:flat:all"]);
  const tsErrors = extractTsErrorCount(tc.out);
  const { errors: lintErrors, warnings: lintWarnings } = extractLintCounts(
    lint.out
  );
  const diag: DiagnosticsResult = {
    ts: Date.now(),
    typecheck: { errors: tsErrors, rawExcerpt: tc.out },
    lint: { errors: lintErrors, warnings: lintWarnings, rawExcerpt: lint.out },
  };
  try {
    const dir = path.join(process.cwd(), "artifacts", "brain");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "diagnostics-latest.json"),
      JSON.stringify(diag, null, 2)
    );
  } catch {}
  return diag;
}

export default { collectDiagnostics };
