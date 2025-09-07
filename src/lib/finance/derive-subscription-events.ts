import type { SubscriptionEvent } from "./revenue-metrics";

// Minimal invoice DTO (only required fields retained; no derived ratios persisted).
export interface InvoiceRecord {
  userId: string;
  period: string; // YYYY-MM
  status: "paid" | "unpaid" | "void" | string; // tolerate unknown statuses
  amount: number; // monthly amount for this invoice period
}

/**
 * Derive approximate subscription events from invoice history.
 * In-memory heuristic only; do not persist derived ratios.
 */
export function deriveSubscriptionEvents(
  invoices: unknown[]
): SubscriptionEvent[] {
  if (!Array.isArray(invoices) || invoices.length === 0) return [];
  // Narrow / sanitize invoices
  const valid: InvoiceRecord[] = invoices
    .map((i) => {
      const rec = i as Partial<InvoiceRecord>;
      return {
        userId: typeof rec.userId === "string" ? rec.userId : "unknown",
        period: typeof rec.period === "string" ? rec.period : "1970-01",
        status: typeof rec.status === "string" ? rec.status : "unknown",
        amount: typeof rec.amount === "number" ? rec.amount : 0,
      };
    })
    .filter((r) => r.userId !== "unknown");

  if (!valid.length) return [];

  const paid = valid.filter((i) => i.status === "paid");
  const globalPeriods = Array.from(new Set(valid.map((i) => i.period))).sort();
  const currentPeriod = globalPeriods[globalPeriods.length - 1];
  const userPeriods: Record<string, Set<string>> = {};
  paid.forEach((inv) => {
    (userPeriods[inv.userId] ||= new Set()).add(inv.period);
  });
  return Object.entries(userPeriods).map(([uid, periods]) => {
    const ordered = Array.from(periods).sort();
    const first = ordered[0];
    const startedAt = new Date(`${first}-01T00:00:00Z`);
    const isActive = periods.has(currentPeriod);
    const amountMonthly = paid
      .filter((i) => i.userId === uid && i.period === currentPeriod)
      .reduce((s, i) => s + (i.amount ?? 0), 0);
    return {
      userId: uid,
      amountMonthly,
      status: isActive ? "active" : "canceled",
      startedAt,
      canceledAt: !isActive
        ? new Date(`${currentPeriod}-15T00:00:00Z`)
        : undefined,
    } as SubscriptionEvent;
  });
}
