// Event Types Registry (T26/T27)
// Centralized allow-list of canonical event types.

export const EVENT_TYPES = [
  'automation.run.started',
  'automation.run.step',
  'automation.run.completed',
  'automation.run.failed',
  'finance.invoice.created',
  // BI & Metrics (Phase 2 minimal)
  'bi.snapshot.requested',
  'bi.export.requested',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export function isEventType(x: string): x is EventType {
  return (EVENT_TYPES as readonly string[]).includes(x);
}

