// TRACKD-GENERATED: consolidated unsafe dynamic types into single alias (defer precise modeling)
export type Unsafe = unknown; // TODO:TRACKD-DEFER:typing refine dynamic execution context & plan/result types

export interface Task {
  id: string;
  title: string;
  raw: string;
  domain: string;
  status: "TODO" | "IN-PROGRESS" | "DONE";
  metadata?: Record<string, Unsafe>; // previously Record<string, any>
}

export interface Planner {
  plan(batch: Task[], ctx: Unsafe): Promise<Unsafe>;
}
export interface ToolRunner {
  name: string;
  supports(domain: string): boolean;
  run(plan: Unsafe, opts: Unsafe): Promise<Unsafe>;
}
export interface Validator {
  name: string;
  run(ctx: Unsafe): Promise<Unsafe>;
}

export interface RunRecord {
  ts: number;
  runId: string;
  mode: string;
  tasks: Task[];
  domains: string[];
  toolsInvoked: string[];
  diffs: { files: number; locAdded: number };
  validation?: {
    lint?: string;
    typecheck?: string;
    tests?: string;
    performance?: string;
  };
  outcome: { status: "OK" | "FAIL"; failures?: string[] };
  followUps?: Task[];
}

export interface TaskSource {
  name: string;
  fetch(): Promise<Task[]>;
}
export interface Guard {
  name: string;
  check(input: Unsafe, cfg: Unsafe): { ok: boolean; reason?: string };
}
export interface Reporter {
  name: string;
  write(rec: RunRecord): Promise<void>;
}
