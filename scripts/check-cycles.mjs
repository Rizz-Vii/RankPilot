#!/usr/bin/env node
import madge from "madge";

const entries = ["src/app/(app)/dashboard/page.tsx"];

(async () => {
  let hadIssue = false;
  for (const entry of entries) {
    try {
      const res = await madge(entry, {
        baseDir: process.cwd(),
        tsConfig: "tsconfig.json",
      });
      const cycles = res.circular();
      if (cycles.length) {
        console.log(`Circular dependencies detected for ${entry}:`);
        cycles.forEach((c) => console.log(" -", c.join(" -> ")));
        hadIssue = true;
      } else {
        console.log(`No circular dependencies detected for entry: ${entry}`);
      }
    } catch (e) {
      console.error("Cycle check failed for", entry, e.message);
      hadIssue = true;
    }
  }
  process.exitCode = hadIssue ? 1 : 0;
})();
