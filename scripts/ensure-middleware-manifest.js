#!/usr/bin/env node
/*
  Ensure .next/server/middleware-manifest.json exists for Firebase Web Frameworks builder
  Next.js 15 may not emit this legacy manifest, but some deploy tools still expect the file.
  This script creates a minimal, compatible stub when missing.
*/
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const serverDir = path.join(root, ".next", "server");
const manifestPath = path.join(serverDir, "middleware-manifest.json");

function readTextSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function parseMatchersFromSource() {
  // Try to infer matcher(s) from src/middleware.ts or root middleware.ts
  const candidates = [
    path.join(root, "middleware.ts"),
    path.join(root, "middleware.js"),
    path.join(root, "src", "middleware.ts"),
    path.join(root, "src", "middleware.js"),
  ];
  for (const file of candidates) {
    const src = readTextSafe(file);
    if (!src) continue;
    // naive extraction of exported config.matcher
    const m = src.match(
      /export\s+const\s+config\s*=\s*\{[\s\S]*?matcher\s*:\s*([^\n;]+)[\s\S]*?\}/
    );
    if (m) {
      try {
        const val = eval(`(${m[1]})`);
        if (Array.isArray(val) && val.length) return val;
        if (typeof val === "string" && val) return [val];
      } catch {
        // fallthrough
      }
    }
  }
  // Default: apply to all paths
  return ["/:path*"];
}

function toBasicRegexp(matchers) {
  // Provide a coarse regex that covers common “match all but _next and static assets”
  // Firebase builder primarily needs the file to exist; the exact regex is less critical.
  return "^(?!/_next/|/static/|/favicon\\.ico).*$";
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function main() {
  try {
    // Only act after a Next build
    if (!fs.existsSync(path.join(root, ".next"))) return;

    // If a manifest already exists, leave it as-is
    if (fs.existsSync(manifestPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        if (existing && typeof existing === "object") {
          console.log(
            "[ensure-middleware-manifest] Existing middleware-manifest.json detected. Skipping."
          );
          return;
        }
      } catch {
        // continue to rewrite a valid stub
      }
    }

    const matchers = parseMatchersFromSource();
    const regexp = toBasicRegexp(matchers);

    const stub = {
      version: 1,
      middleware: {
        "/": {
          env: [],
          files: [],
          name: "middleware",
          page: "/",
          regexp,
        },
      },
      functions: {},
      sortedMiddleware: ["/"],
    };

    ensureDir(serverDir);
    fs.writeFileSync(manifestPath, JSON.stringify(stub, null, 2));
    console.log(
      "[ensure-middleware-manifest] Created minimal middleware-manifest.json"
    );
  } catch (err) {
    console.warn(
      "[ensure-middleware-manifest] Non-fatal error:",
      err && err.message ? err.message : err
    );
  }
}

main();
