#!/usr/bin/env ts-node
/*
  RankPilot Agents CLI
  - plan: dry-run; show diffs
  - apply: requires --yes; writes files with backups and manifest updates
*/
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import * as codemods from "./codemods/enforce-repo-patterns";

type Mode = "plan" | "apply";

interface ManifestEntry {
  file: string;
  hash: string;
}
interface Manifest {
  version: number;
  generated: ManifestEntry[];
  backupsDir: string;
}

const repoRoot = path.resolve(__dirname, "..", "..");
const manifestPath = path.join(repoRoot, "scripts", "agents", "manifest.json");
const backupsDirDefault = path.join(repoRoot, ".agent-backups");
const toolsRegistryPath = path.join(
  repoRoot,
  "scripts",
  "agents",
  "ingested-tools.json"
);

// Hard guardrails to avoid risky writes. Keep specific and minimal.
const DENYLIST_RELATIVE = new Set<string>([
  // Reserved: this route is intentionally 410 Gone and must not be recreated by generators
  "src/app/api/webhooks/stripe/route.ts",
]);

function isDeniedWrite(absTarget: string): boolean {
  const rel = path.relative(repoRoot, absTarget).replace(/\\/g, "/");
  return DENYLIST_RELATIVE.has(rel);
}

function requireAllowedWrite(absTarget: string) {
  if (isDeniedWrite(absTarget)) {
    const rel = path.relative(repoRoot, absTarget);
    throw new Error(`Write blocked by guardrail: ${rel}`);
  }
}

function readManifest(): Manifest {
  const json = fs.readFileSync(manifestPath, "utf8");
  return JSON.parse(json) as Manifest;
}

function writeManifest(m: Manifest) {
  fs.writeFileSync(manifestPath, JSON.stringify(m, null, 2));
}

function sha256(buf: Buffer | string) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function diffText(oldStr: string, newStr: string): string {
  // Minimal unified-like diff for preview
  if (oldStr === newStr) return "(no changes)";
  const oldLines = oldStr.split("\n");
  const newLines = newStr.split("\n");
  const max = Math.max(oldLines.length, newLines.length);
  const out: string[] = [];
  for (let i = 0; i < max; i++) {
    const a = oldLines[i] ?? "";
    const b = newLines[i] ?? "";
    if (a !== b) {
      if (a) out.push(`- ${a}`);
      if (b) out.push(`+ ${b}`);
    }
  }
  return out.join("\n");
}

function printHeader(title: string) {
  console.log(`\n=== ${title} ===`);
}

function runCmd(
  cmd: string,
  args: string[],
  cwd = repoRoot
): { code: number; stdout: string; stderr: string } {
  const res = spawnSync(cmd, args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  return {
    code: res.status ?? 1,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
  };
}

function runPreApplyValidations(): boolean {
  printHeader("Pre-apply validations");
  // Keep fast by default; opt-in extended tests via env flag
  const fast = runCmd("npm", ["run", "quality:fast"], repoRoot);
  if (fast.code !== 0) {
    console.error("✖ quality:fast failed — aborting apply");
    return false;
  }
  if (process.env.AGENT_PREAPPLY_TESTS === "1") {
    const unit = runCmd("npm", ["run", "test:unit:lib"], repoRoot);
    if (unit.code !== 0) {
      console.error("✖ unit tests failed — aborting apply");
      return false;
    }
  }
  console.log("✔ Validations passed");
  return true;
}

// Example generator: verify Stripe webhook path only (no duplicates)
function generateStripeWebhook(): { target: string; content: string } | null {
  const target = path.join(
    repoRoot,
    "src",
    "app",
    "api",
    "webhooks",
    "stripe",
    "route.ts"
  );
  // We decided to keep only /api/stripe/webhook; ensure duplicate path is gone.
  if (fs.existsSync(target)) {
    // Plan to remove deprecated route file instead of (re)generating.
    return null;
  }
  return null;
}

// Codemods integration
function runCodemodsPlan(): string[] {
  try {
    return codemods.plan();
  } catch (e) {
    return ["(codemods plan unavailable)"];
  }
}

// Tools registry integration
function ensureToolsRegistry(
  refresh = false
): { ok: true; data: any } | { ok: false; error: string } {
  const exists = fs.existsSync(toolsRegistryPath);
  if (refresh || !exists) {
    const res = runCmd("npm", ["run", "agents:tools:ingest"], repoRoot);
    if (res.code !== 0) {
      return { ok: false, error: "tools:ingest failed" };
    }
  }
  try {
    const raw = fs.readFileSync(toolsRegistryPath, "utf8");
    const data = JSON.parse(raw);
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

function printToolsRegistrySummary(reg: any) {
  printHeader("Tools registry");
  try {
    const version = reg.version ?? "?";
    const generatedAt = reg.generatedAt ?? "?";
    const sources = reg.sources || {};
    const toolsets = reg.toolsets || {};
    const toolsetNames = Object.keys(toolsets);
    const tools = Array.isArray(reg.tools) ? reg.tools : [];
    const defaultTool = reg.defaultTool ?? null;

    console.log(
      `version=${version} generatedAt=${generatedAt} sources(toolsets=${sources.toolsets || "?"}, tools=${sources.tools || "?"})`
    );
    const maxList = 6;
    const previewToolsets = toolsetNames.slice(0, maxList).join(", ");
    console.log(
      `toolsets: ${toolsetNames.length} categories${
        toolsetNames.length
          ? ` [${previewToolsets}${toolsetNames.length > maxList ? ", …" : ""}]`
          : ""
      }`
    );
    const toolNames = tools.map((t: any) => t?.name).filter(Boolean);
    const previewTools = toolNames.slice(0, maxList).join(", ");
    console.log(
      `cli tools: ${toolNames.length}${
        toolNames.length
          ? ` [${previewTools}${toolNames.length > maxList ? ", …" : ""}]`
          : ""
      } default=${defaultTool ?? "(none)"}`
    );
  } catch (e) {
    console.log("(unable to summarize tools registry)");
  }
}

async function main() {
  const args = process.argv.slice(2);
  const mode: Mode =
    (args.find((a) => a.startsWith("--mode="))?.split("=")[1] as Mode) ||
    "plan";
  const yes = args.includes("--yes");
  const backupsDir = backupsDirDefault;

  const manifest = readManifest();
  ensureDir(backupsDir);

  printHeader(`Agents ${mode.toUpperCase()}`);

  // Tools registry (refresh if caller passed --refresh-tools)
  const refreshTools = args.includes("--refresh-tools");
  const reg = ensureToolsRegistry(refreshTools);
  if (reg.ok) {
    printToolsRegistrySummary(reg.data);
  } else {
    printHeader("Tools registry");
    console.log(`(missing or failed to load) ${reg.error}`);
  }

  // Generators to consider (add more as needed)
  const gens = [generateStripeWebhook]
    .map((fn) => fn())
    .filter(Boolean) as Array<{ target: string; content: string }>;

  // Plan: show diffs or file create notices
  let pendingWrites = 0;
  for (const gen of gens) {
    const exists = fs.existsSync(gen.target);
    const nextHash = sha256(gen.content);
    if (exists) {
      const current = fs.readFileSync(gen.target, "utf8");
      const currentHash = sha256(current);
      console.log(`\nFile: ${path.relative(repoRoot, gen.target)} (exists)`);
      console.log(diffText(current, gen.content));
      if (mode === "apply" && yes && currentHash !== nextHash) {
        requireAllowedWrite(gen.target);
        const rel = path.relative(repoRoot, gen.target);
        const backupPath = path.join(
          backupsDir,
          rel.replace(/[\/]/g, "__") + "." + Date.now() + ".bak"
        );
        ensureDir(path.dirname(backupPath));
        fs.writeFileSync(backupPath, current);
        fs.writeFileSync(gen.target, gen.content);
        const entry = { file: rel, hash: nextHash };
        manifest.generated = manifest.generated.filter((e) => e.file !== rel);
        manifest.generated.push(entry);
        console.log(`✔ Updated ${rel} (backup: ${backupPath})`);
        pendingWrites++;
      }
    } else {
      console.log(`\nFile: ${path.relative(repoRoot, gen.target)} (new)`);
      console.log(diffText("", gen.content));
      if (mode === "apply" && yes) {
        requireAllowedWrite(gen.target);
        ensureDir(path.dirname(gen.target));
        fs.writeFileSync(gen.target, gen.content);
        const rel = path.relative(repoRoot, gen.target);
        manifest.generated.push({ file: rel, hash: nextHash });
        console.log(`✔ Created ${rel}`);
        pendingWrites++;
      }
    }
  }

  // Codemods preview
  printHeader("Codemods (plan)");
  for (const line of runCodemodsPlan()) console.log("• " + line);

  if (mode === "apply" && yes) {
    // Run validations before writing manifest and applying codemods
    if (!runPreApplyValidations()) {
      console.error("Apply aborted due to validation failures");
      process.exitCode = 1;
      return;
    }

    // Apply codemods (safe no-ops if not implemented)
    try {
      printHeader("Applying codemods");
      await codemods.apply();
      console.log("✔ Codemods apply complete");
    } catch (e) {
      console.error("✖ Codemods apply failed:", e);
      process.exitCode = 1;
      return;
    }

    writeManifest(manifest);
    console.log("\n✔ Manifest updated");

    // Post-apply quick validations (only if we actually wrote files or codemods ran)
    if (pendingWrites > 0 || true) {
      printHeader("Post-apply validations");
      const fast = runCmd("npm", ["run", "quality:fast"], repoRoot);
      if (fast.code !== 0) {
        console.error("✖ Post-apply validations failed");
        process.exitCode = 2;
        return;
      }
      console.log("✔ Post-apply validations passed");
    }
  } else if (mode === "apply" && !yes) {
    console.log("\nℹ Refusing to write without --yes");
  } else {
    console.log("\nℹ Plan complete (no files written)");
  }
}

main();
