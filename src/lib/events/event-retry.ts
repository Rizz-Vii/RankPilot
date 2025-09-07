// EVT-02: Event fan-out with bounded retries
// Phase 3: exponential backoff + jitter, idempotency, and DLQ
import {
  recordEventDeadLetter,
  recordEventRetry,
  recordEventRetrySuccess,
} from "../metrics/unified-metrics";
import { pushDeadLetter } from "./dead-letter";
import { on } from "./event-bus";
import type { EventType } from "./event-types";

export type EventHandler = (evt: {
  type: EventType;
  payload?: { [k: string]: unknown };
}) => Promise<void> | void;

interface RetryOptions {
  maxAttempts?: number; // default 3
  backoffMs?: number; // base delay, default 50ms
  strategy?: "linear" | "exponential"; // default 'linear'
  jitterPct?: number; // 0..1 (e.g., 0.2 = +/-20% jitter), default 0.1
  // Optional idempotency: derive a key from the event to de-duplicate in-process deliveries per handler
  idempotencyKey?: (evt: {
    type: EventType;
    payload?: { [k: string]: unknown };
  }) => string | undefined;
  // Optional dead-letter sink: if provided, will be called on final failure; falls back to in-memory DLQ
  dlq?: (
    evt: { type: EventType; payload?: { [k: string]: unknown } },
    error: unknown,
    attempts: number
  ) => void;
}

export function registerWithRetry(
  eventType: EventType,
  handler: EventHandler,
  opts: RetryOptions = {}
) {
  const maxAttempts = Math.max(1, Math.min(5, opts.maxAttempts ?? 3));
  const base = Math.max(0, Math.min(2000, opts.backoffMs ?? 50));
  const strategy = opts.strategy ?? "linear";
  const jitterPct = Math.max(0, Math.min(1, opts.jitterPct ?? 0.1));
  // Per-handler idempotency key cache (bounded FIFO)
  const seenKeys: string[] = [];
  const seenSet = new Set<string>();
  const SEEN_MAX = 1000;

  const unsubscribe = on(eventType, ({ type, payload }) => {
    let attempt = 0;
    const evt = { type, payload } as const;
    // Idempotency guard
    if (typeof opts.idempotencyKey === "function") {
      try {
        const key = opts.idempotencyKey(evt);
        if (key) {
          if (seenSet.has(key)) return; // drop duplicate
          seenSet.add(key);
          seenKeys.push(key);
          if (seenKeys.length > SEEN_MAX) {
            const old = seenKeys.shift();
            if (old) seenSet.delete(old);
          }
        }
      } catch {
        /* ignore idempotency errors */
      }
    }
    const exec = async () => {
      attempt += 1;
      try {
        await handler(evt);
        if (attempt > 1) {
          try {
            recordEventRetrySuccess(1);
          } catch {
            /* optional */
          }
        }
      } catch (err) {
        if (attempt < maxAttempts) {
          try {
            recordEventRetry(1);
          } catch {
            /* optional */
          }
          const nextDelay = (() => {
            if (strategy === "exponential") {
              // base * 2^(attempt-1)
              return base * Math.pow(2, attempt - 1);
            }
            // linear: attempt * base
            return attempt * base;
          })();
          const jitter = nextDelay * jitterPct;
          const delta = Math.random() * (2 * jitter) - jitter; // +/- jitter
          const delay = Math.max(0, Math.round(nextDelay + delta));
          setTimeout(() => {
            void exec();
          }, delay);
        } else {
          // Exhausted: DLQ
          try {
            recordEventDeadLetter(1);
          } catch {
            /* optional */
          }
          try {
            if (typeof opts.dlq === "function") opts.dlq(evt, err, attempt);
            else pushDeadLetter(evt.type, evt.payload, err, attempt);
          } catch {
            /* swallow */
          }
        }
      }
    };
    void exec();
  });
  return unsubscribe;
}
