export interface Task {
  id: string;
  title: string;
  raw: string;
  domain: string;
  status: 'TODO' | 'IN-PROGRESS' | 'DONE';
  metadata?: Record<string, any>;
}

export interface Planner { plan(batch: Task[], ctx: any): Promise<any>; }
export interface ToolRunner { name: string; supports(domain: string): boolean; run(plan: any, opts: any): Promise<any>; }
export interface Validator { name: string; run(ctx: any): Promise<any>; }

export interface RunRecord {
  ts: number; runId: string; mode: string;
  tasks: Task[]; domains: string[]; toolsInvoked: string[];
  diffs: { files: number; locAdded: number };
  validation?: { lint?: string; typecheck?: string; tests?: string; performance?: string };
  outcome: { status: 'OK' | 'FAIL'; failures?: string[] };
  followUps?: Task[];
  metrics: { batchCount: number; estTokens: number; elapsedMs: number };
}

export interface TaskSource { name: string; fetch(): Promise<Task[]>; }
export interface Guard { name: string; check(input: any, cfg: any): { ok: boolean; reason?: string } }
export interface Reporter { name: string; write(rec: RunRecord): Promise<void> }
