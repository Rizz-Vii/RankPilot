import type { Task } from '../../../types/brain';

export function parseTasks(inputs: { checkList?: string; queues?: string; changeLog?: string; todos?: string }): Task[] {
  const out: Task[] = [];
  const push = (raw: string, idPrefix: string) => {
    const trimmed = (raw || '').trim();
    if (!trimmed) return;
    const lines = trimmed.split(/\r?\n/).filter(Boolean).slice(0, 50);
    lines.forEach((ln, i) => out.push({ id: `${idPrefix}-${i}`, title: ln.slice(0, 80), raw: ln, domain: 'unknown', status: 'TODO' }));
  };
  if (inputs.checkList) push(inputs.checkList, 'CL');
  if (inputs.queues) push(inputs.queues, 'Q');
  if (inputs.changeLog) push(inputs.changeLog, 'CH');
  if (inputs.todos) push(inputs.todos, 'TD');
  return out;
}

export default { parseTasks };

