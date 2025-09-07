import fs from "fs";
import path from "path";

/**
 * Prune brain artifacts to keep directory lean.
 * Policy (env overrides):
 *   KEEP_PLAN_FILES (default 5)
 *   KEEP_WATCH_TICKS (default 500)
 *   DRY_RUN=1 -> report only.
 */

const ART_DIR = path.resolve("artifacts/brain");
const KEEP_PLAN = Number(process.env.KEEP_PLAN_FILES || 5);
const KEEP_TICKS = Number(process.env.KEEP_WATCH_TICKS || 500);
const DRY = process.env.DRY_RUN === "1";

function log(msg: string) {
  console.log(`[brain:prune] ${msg}`);
}

function prunePlanFiles() {
  if (!fs.existsSync(ART_DIR)) return;
  const planFiles = fs
    .readdirSync(ART_DIR)
    .filter((f) => /^plan-cli-\d+\.txt$/.test(f))
    .map((f) => ({ f, m: fs.statSync(path.join(ART_DIR, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  if (planFiles.length <= KEEP_PLAN) {
    log(`plan files within limit (${planFiles.length}/${KEEP_PLAN})`);
    return;
  }
  const toDelete = planFiles.slice(KEEP_PLAN).map((x) => x.f);
  if (toDelete.length) {
    log(`removing ${toDelete.length} old plan files (keeping ${KEEP_PLAN})`);
    if (!DRY)
      toDelete.forEach((f) => {
        try {
          fs.unlinkSync(path.join(ART_DIR, f));
        } catch {}
      });
  }
}

function pruneWatchTicks() {
  const ticksFile = path.join(ART_DIR, "watch-ticks.jsonl");
  if (!fs.existsSync(ticksFile)) return;
  const data = fs.readFileSync(ticksFile, "utf8").trim();
  if (!data) return;
  const lines = data.split(/\n/);
  if (lines.length <= KEEP_TICKS) {
    log(`watch-ticks within limit (${lines.length}/${KEEP_TICKS})`);
    return;
  }
  const trimmed = lines.slice(-KEEP_TICKS);
  log(`truncating watch-ticks.jsonl from ${lines.length} -> ${trimmed.length}`);
  if (!DRY) fs.writeFileSync(ticksFile, trimmed.join("\n") + "\n");
}

prunePlanFiles();
pruneWatchTicks();
log("done");
