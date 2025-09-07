export function splitPlan(steps: unknown[], cfg: unknown): unknown[][] {
  const c = cfg as {
    governance?: { maxBatchTasks?: number; splitThresholdLoc?: number };
  };
  const maxTasks = (c?.governance?.maxBatchTasks ?? 10) || 10;
  const splitLoc = (c?.governance?.splitThresholdLoc ?? 300) || 300;
  const approxLoc = steps.length * 30;
  const chunkSize = Math.min(maxTasks, Math.max(1, Math.floor(splitLoc / 30)));
  if (approxLoc <= splitLoc && steps.length <= maxTasks) return [steps];
  const out: unknown[][] = [];
  for (let i = 0; i < steps.length; i += chunkSize)
    out.push(steps.slice(i, i + chunkSize));
  return out;
}
