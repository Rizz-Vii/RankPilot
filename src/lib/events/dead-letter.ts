// Simple in-memory DLQ for event retries (development only)
// Provides minimal observability and inspection for tests.

export interface DeadLetterItem {
  type: string;
  payload?: { [k: string]: unknown };
  error: unknown;
  attempts: number;
  ts: number;
}

const DLQ_MAX = 200;
const dlq: DeadLetterItem[] = [];

export function pushDeadLetter(
  type: string,
  payload: { [k: string]: unknown } | undefined,
  error: unknown,
  attempts: number
) {
  dlq.push({ type, payload, error, attempts, ts: Date.now() });
  if (dlq.length > DLQ_MAX) dlq.splice(0, dlq.length - DLQ_MAX);
}

export function getDeadLetters(limit = 50): DeadLetterItem[] {
  const n = Math.max(0, Math.min(limit, dlq.length));
  return dlq.slice(dlq.length - n);
}

export function __resetDeadLettersTestOnly() {
  dlq.length = 0;
}
