export function splitPlan(steps: any[], cfg: any): any[][] {
  const maxTasks = (cfg?.governance?.maxBatchTasks ?? 10) || 10;
  const splitLoc = (cfg?.governance?.splitThresholdLoc ?? 300) || 300;
  const approxLoc = steps.length * 30;
  const chunkSize = Math.min(maxTasks, Math.max(1, Math.floor(splitLoc / 30)));
  if (approxLoc <= splitLoc && steps.length <= maxTasks) return [steps];
  const out: any[][] = [];
  for (let i = 0; i < steps.length; i += chunkSize) out.push(steps.slice(i, i + chunkSize));
  return out;
}

