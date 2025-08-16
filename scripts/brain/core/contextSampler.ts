export function sampleContext(maxKb: number): { files: string[]; notes: string[] } {
  const files: string[] = [];
  const notes: string[] = [];
  files.push('checkList.txt', 'docs/CHANGE_LOG.md');
  notes.push(`sampled ~${Math.max(1, Math.min(64, Math.floor(maxKb)))}KB context window`);
  notes.push('TODO: add semantic thinning + last-run deltas');
  return { files, notes };
}

export default { sampleContext };

