const { spawnSync } = require("child_process");
const r = spawnSync(
  "node",
  [
    "dist/brain/scripts/brain/cli.js",
    "--mode",
    "auto",
    "--maxBatches",
    "1",
    "--maxMinutes",
    "1",
  ],
  { stdio: "pipe" }
);
if (r.status !== 0) process.exit(1);
console.log("auto.smoke: OK");
