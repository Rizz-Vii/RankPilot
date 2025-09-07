// Forbidden Derived Field Guard (MKT-01)
// Strips forbidden persisted marketing / KPI derived ratio fields before write operations.
// Use in any Firestore write helper prior to persisting user or aggregated docs.

import { recordForbiddenFieldStrip } from "@/lib/metrics/unified-metrics";

// Central forbidden list (update scan script if modified). Used by marketing write guard & automation writers.
export const FORBIDDEN_DERIVED_FIELDS = [
  "roi",
  "ctr",
  "conversion",
  "winRate",
  "ltv",
] as const;
export type ForbiddenDerivedField = (typeof FORBIDDEN_DERIVED_FIELDS)[number];

export interface StripResult<T> {
  doc: T;
  stripped: ForbiddenDerivedField[];
}

export function stripForbiddenDerivedFields<T extends Record<string, unknown>>(
  input: T
): StripResult<T> {
  if (!input || typeof input !== "object") return { doc: input, stripped: [] };
  const stripped: ForbiddenDerivedField[] = [];
  FORBIDDEN_DERIVED_FIELDS.forEach((f) => {
    if (Object.prototype.hasOwnProperty.call(input, f)) {
      stripped.push(f as ForbiddenDerivedField);
      delete (input as Record<string, unknown>)[f];
    }
  });
  if (stripped.length) recordForbiddenFieldStrip(stripped.length);
  return { doc: input, stripped };
}

// Defensive clone variant (does not mutate original object)
export function cloneAndStripForbidden<T extends Record<string, unknown>>(
  input: T
): StripResult<T> {
  const cloned = { ...input } as T;
  return stripForbiddenDerivedFields(cloned);
}
