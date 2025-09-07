const { spawnSync } = require("child_process");
const r1 = spawnSync("node", [
  "dist/brain/scripts/brain/cli.js",
  "--mode",
  "plan-only",
]);
if (r1.status !== 0) process.exit(1);
const r2 = spawnSync("node", [
  "dist/brain/scripts/brain/cli.js",
  "--mode",
  "dry-run",
]);
if (r2.status !== 0) process.exit(1);
console.log("cli.smoke: OK");
