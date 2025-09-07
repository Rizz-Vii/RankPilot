// Minimal Event Bus scaffold (Phase 2 – typed enum + emit/consume wiring)
import type { EventType } from "./event-types";

type EventPayload = {
  orgId?: string;
  source?: string;
  attrs?: Record<string, unknown>;
  ts?: number;
};

type Subscriber = (event: { type: EventType; payload?: EventPayload }) => void;

const subscribers = new Map<EventType, Set<Subscriber>>();

export function on(eventType: EventType, sub: Subscriber) {
  if (!subscribers.has(eventType)) subscribers.set(eventType, new Set());
  subscribers.get(eventType)!.add(sub);
  return () => subscribers.get(eventType)!.delete(sub);
}

export function emit(eventType: EventType, payload?: EventPayload) {
  const set = subscribers.get(eventType);
  if (!set || set.size === 0) return 0;
  for (const s of set) {
    try {
      s({ type: eventType, payload });
    } catch {
      /* isolate */
    }
  }
  return set.size;
}

// Test-only: observe current subscriber counts for assertions
export function __countsTestOnly(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of subscribers) out[k] = v.size;
  return out;
}
