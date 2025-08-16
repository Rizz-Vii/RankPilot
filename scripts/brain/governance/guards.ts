export interface LimitConfig { maxLocAdded: number; maxFiles: number }
export interface BatchChange { locAdded: number; filesTouched: number }

export function checkLimits(change: BatchChange, cfg: LimitConfig) {
  const overLoc = change.locAdded > cfg.maxLocAdded;
  const overFiles = change.filesTouched > cfg.maxFiles;
  return { ok: !(overLoc || overFiles), overLoc, overFiles };
}

export function checkBatchLimits(stats: { locAdded: number; files: number }, limits: LimitConfig): { ok: boolean; reason?: string } {
  const overLoc = stats.locAdded > limits.maxLocAdded;
  const overFiles = stats.files > limits.maxFiles;
  if (overLoc) return { ok: false, reason: 'locAdded' };
  if (overFiles) return { ok: false, reason: 'files' };
  return { ok: true };
}
