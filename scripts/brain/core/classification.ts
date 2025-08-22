import type { Task } from '../../../types/brain';

const domainKeywords: Record<string, string[]> = {
  backend: ['api', 'route', 'firestore', 'functions', 'server', 'events'],
  frontend: ['page.tsx', 'component', 'ui', 'nav', 'react'],
  infra: ['workflow', 'ci', 'deploy', 'docker', 'infra'],
  docs: ['docs', 'readme', 'guide', 'md'],
  data: ['schema', 'analytics', 'kpi', 'dataset'],
  ops: ['observability', 'alert', 'slo', 'rate limit'],
};

export function classifyTask(t: Task): string {
  const hay = `${t.title} ${t.raw}`.toLowerCase();
  for (const [domain, keys] of Object.entries(domainKeywords)) {
    if (keys.some((k) => hay.includes(k))) return domain;
  }
  return 'docs';
}

export function classifyBatch(tasks: Task[]): Task[] {
  return tasks.map((t) => ({ ...t, domain: classifyTask(t) }));
}

export function classify(text: string): string {
  const t: Task = { id: 'x', title: text, raw: text, domain: '', status: 'TODO' };
  return classifyTask(t);
}

export default { classifyTask, classifyBatch, classify };
