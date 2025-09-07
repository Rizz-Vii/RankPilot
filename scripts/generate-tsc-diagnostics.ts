/*
 * Generates a lightweight JSON artifact of current TypeScript diagnostics
 * consumed by twoAgentOrchestration (artifacts/tsc-diagnostics.json).
 *
 * It shells out to `tsc --noEmit --pretty false` and parses lines like:
 * path/to/file.ts:10:5 - error TS2304: Cannot find name 'Foo'.
 */
import { exec } from "child_process";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

interface TSDiagnosticJSON {
  file: string;
  line: number;
  column: number;
  category: "error" | "warning" | "suggestion" | "message";
  code: number;
  message: string;
}

function stripAnsi(s: string) {
  return s.replace(/\u001b\[[0-9;]*m/g, "");
}

function parseDiagnostics(output: string): TSDiagnosticJSON[] {
  const lines = stripAnsi(output).split(/\r?\n/);
  const diags: TSDiagnosticJSON[] = [];
  // Patterns observed:
  // 1) path/to/file.ts:10:5 - error TS1234: Message (older formatter)
  // 2) path/to/file.ts(10,5): error TS1234: Message (current formatter)
  const patterns: RegExp[] = [
    /^(.*?):(\d+):(\d+) - (error|warning) TS(\d+): (.*)$/,
    /^(.*)\((\d+),(\d+)\): (error|warning) TS(\d+): (.*)$/,
  ];
  for (const line of lines) {
    let match: RegExpMatchArray | null = null;
    for (const r of patterns) {
      match = line.match(r);
      if (match) break;
    }
    if (!match) continue;
    const [, file, lineStr, colStr, category, codeStr, msg] = match;
    diags.push({
      file: path.normalize(file),
      line: Number(lineStr),
      column: Number(colStr),
      category: category as "error" | "warning",
      code: Number(codeStr),
      message: msg.trim(),
    });
  }
  return diags;
}

function ensureDir(file: string) {
  const dir = path.dirname(file);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// Resolve local TypeScript compiler (do NOT rely on a global tsc on PATH – codespace context may omit it)
const tscBin = (() => {
  try {
    return require.resolve("typescript/bin/tsc");
  } catch {
    return null;
  }
})();
const cmd = tscBin
  ? `node "${tscBin}" --noEmit --pretty false`
  : "npx -y tsc --noEmit --pretty false";

exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
  const combined = stdout + "\n" + stderr;
  const diagnostics = parseDiagnostics(combined);
  const outFile = path.resolve("artifacts/tsc-diagnostics.json");
  ensureDir(outFile);
  writeFileSync(outFile, JSON.stringify(diagnostics, null, 2), "utf8");
  // Emit summary to stdout for observability (logging acceptable for build script)
  const exitCode =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: unknown }).code ?? "unknown")
      : "";
  console.log(
    `Wrote ${diagnostics.length} TS diagnostics to artifacts/tsc-diagnostics.json (cmd=${cmd}${err ? " exitCode=" + exitCode : ""})`
  );
  process.exit(0); // Always exit 0 so pipeline can continue; consumers differentiate via artifact content.
});
