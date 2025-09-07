#!/usr/bin/env node
/**
 * Ingests workspace tool definitions into a single normalized registry for agents.
 * - Reads tools.toolsets.jsonc (JSONC with comments) at repo root
 * - Reads .github/tools.json (plain JSON list of CLI tools)
 * - Emits scripts/agents/ingested-tools.json for downstream consumers
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const toolsetsPath = path.join(repoRoot, "tools.toolsets.jsonc");
const ghToolsPath = path.join(repoRoot, ".github", "tools.json");
const outPath = path.join(repoRoot, "scripts", "agents", "ingested-tools.json");

function stripJsonComments(input) {
  // Remove // and /* */ comments for simple JSONC support
  return input
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, (m) => (m.includes("http") ? m : ""));
}

function readJsonc(p) {
  const raw = fs.readFileSync(p, "utf8");
  const stripped = stripJsonComments(raw);
  return JSON.parse(stripped);
}

function main() {
  if (!fs.existsSync(toolsetsPath)) {
    console.error(`❌ Missing ${path.relative(repoRoot, toolsetsPath)}`);
    process.exit(1);
  }
  if (!fs.existsSync(ghToolsPath)) {
    console.error(`❌ Missing ${path.relative(repoRoot, ghToolsPath)}`);
    process.exit(1);
  }

  const toolsets = readJsonc(toolsetsPath);
  const gh = JSON.parse(fs.readFileSync(ghToolsPath, "utf8"));
  const tools = Array.isArray(gh.tools) ? gh.tools : [];
  const defaultTool = gh.defaultTool || (tools[0]?.name ?? null);

  const registry = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sources: {
      toolsets: path.relative(repoRoot, toolsetsPath),
      tools: path.relative(repoRoot, ghToolsPath),
    },
    toolsets,
    tools,
    defaultTool,
  };

  fs.writeFileSync(outPath, JSON.stringify(registry, null, 2));
  console.log(`✅ Wrote ${path.relative(repoRoot, outPath)}`);
}

try {
  main();
} catch (e) {
  console.error("❌ Ingest failed:", e?.message || e);
  process.exit(1);
}
