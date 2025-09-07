import fs from "fs";
import path from "path";

interface RouteFile {
  route: string;
  source: string;
  file: string;
}

function collectPagesApi(root: string): RouteFile[] {
  const base = path.join(root, "src/pages/api");
  if (!fs.existsSync(base)) return [];
  const out: RouteFile[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (/\.(t|j)sx?$/.test(entry)) {
        const rel = path.relative(base, full).replace(/\\/g, "/");
        const noExt = rel.replace(/\.(t|j)sx?$/, "");
        const route = "/api/" + noExt;
        out.push({ route, source: "pages", file: full });
      }
    }
  };
  walk(base);
  return out;
}

function collectAppApi(root: string): RouteFile[] {
  const base = path.join(root, "src/app/api");
  if (!fs.existsSync(base)) return [];
  const out: RouteFile[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (/^route\.(t|j)sx?$/.test(entry)) {
        const relDir = path.relative(base, dir).replace(/\\/g, "/");
        const route = "/api/" + relDir;
        out.push({ route, source: "app", file: full });
      }
    }
  };
  walk(base);
  return out;
}

function main() {
  const root = process.cwd();
  const pages = collectPagesApi(root);
  const app = collectAppApi(root);
  const byRoute: Record<string, RouteFile[]> = {};
  for (const rf of [...pages, ...app]) {
    byRoute[rf.route] = byRoute[rf.route] || [];
    byRoute[rf.route].push(rf);
  }
  const dupes = Object.entries(byRoute).filter(([_, arr]) => arr.length > 1);
  if (!dupes.length) {
    console.log("No duplicate API routes found.");
    return;
  }
  console.log("Duplicate API routes detected:");
  for (const [route, files] of dupes) {
    console.log(`  ${route}`);
    files.forEach((f) =>
      console.log(`    - (${f.source}) ${path.relative(root, f.file)}`)
    );
  }
  console.error(`Total duplicates: ${dupes.length}`);
  process.exitCode = 1;
}

main();
