// Sales sequences and executions types
// Minimal types to keep public API stable without heavy runtime coupling

export type SalesStepType = "call" | "sms" | "email";

export interface SalesSequenceStep {
    id: string;
    type: SalesStepType;
    delayMinutes: number; // delay from previous step
    script?: string; // voice script or message template
}

export interface SalesTarget {
    id: string; // target/contact id
    name?: string;
    phone?: string; // E.164 preferred
    email?: string;
    status?: "pending" | "in_progress" | "completed" | "failed";
    lastAttemptAt?: unknown;
}

export interface SalesSequenceDoc {
    name: string;
    description?: string;
    createdAt: unknown;
    createdBy: string;
    status: "draft" | "active" | "paused" | "archived";
    steps: SalesSequenceStep[];
    targets: SalesTarget[];
    schedule?: { timezone?: string; windowStart?: string; windowEnd?: string } | null;
}

export interface SalesExecutionResult {
    targetId: string;
    stepId: string;
    stepType: SalesStepType;
    callSid?: string;
    ok: boolean;
    error?: string;
    startedAt: unknown;
    completedAt?: unknown;
}

export interface SalesExecutionDoc {
    sequenceId: string;
    runBy: string;
    testMode?: boolean;
    startedAt: unknown;
    completedAt?: unknown;
    results: SalesExecutionResult[];
    stats: { attempted: number; succeeded: number; failed: number };
}
