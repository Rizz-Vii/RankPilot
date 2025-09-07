/**
 * Unified error to message extraction helper.
 * Safely derives a human-readable message from unknown error inputs
 * without widening types. Centralizing this prevents repeated
 * `(err instanceof Error ? err.message : String(err))` patterns.
 */
export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error && typeof err.message === "string" && err.message) {
    return err.message;
  }
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/** Convenience wrapper for optional notes */
export function buildErrorDetail(err: unknown, note?: string): string {
  const base = extractErrorMessage(err);
  return note ? `${base} (${note})` : base;
}
