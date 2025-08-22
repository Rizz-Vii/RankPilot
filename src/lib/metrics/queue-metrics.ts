// Queue Metrics (DEV-QUEUE-01)
// Minimal counters to observe delegation queue health & throughput.
// Focus: depth visibility, success ratio, basic lifecycle counts.

export interface QueueMetricsSnapshot {
    enqueued: number;      // total tasks ever enqueued (since process start)
    started: number;       // tasks moved to running
    completed: number;     // tasks finished successfully
    failed: number;        // tasks finished unsuccessfully
    running: number;       // currently running tasks (best‑effort derived)
    depth: number;         // pending + running (observable load indicator)
    successRatio: number;  // completed / (completed + failed) (1 when no terminal tasks yet)
}

const counters = {
    enqueued: 0,
    started: 0,
    completed: 0,
    failed: 0,
    running: 0
};

export function recordQueueEnqueue(count = 1) {
    if (count > 0) counters.enqueued += count;
    // Depth increases by count (pending)
}

export function recordQueueStart(count = 1) {
    if (count > 0) {
        counters.started += count;
        counters.running += count; // now considered active
    }
}

export function recordQueueDone(success: boolean, count = 1) {
    if (count <= 0) return;
    if (success) counters.completed += count; else counters.failed += count;
    counters.running = Math.max(0, counters.running - count);
}

export function getQueueMetricsSnapshot(): QueueMetricsSnapshot {
    const terminal = counters.completed + counters.failed;
    const successRatio = terminal === 0 ? 1 : +(counters.completed / terminal * 1.0).toFixed(3);
    const depth = counters.running + (counters.enqueued - counters.started);
    return {
        enqueued: counters.enqueued,
        started: counters.started,
        completed: counters.completed,
        failed: counters.failed,
        running: counters.running,
        depth: depth < 0 ? 0 : depth,
        successRatio
    };
}

// Test helper (not exported in production bundlers, but harmless if tree‑shaken)
export function __resetQueueMetrics() {
    counters.enqueued = 0; counters.started = 0; counters.completed = 0; counters.failed = 0; counters.running = 0;
}
