/**
 * Shared URL validation + normalization.
 *
 * Extracted from the identical `ensureHttpUrl()` helpers that were duplicated in
 * `seo-audit/page.tsx` and `competitors/page.tsx`. Single source of truth for the three
 * Site Intelligence systems (and anywhere else that accepts a user-entered URL).
 */

export interface UrlValidationResult {
  isValid: boolean;
  /** Normalized absolute URL (protocol guaranteed http/https) when valid. */
  normalized?: string;
  /** Human-readable reason when invalid. */
  error?: string;
}

/**
 * Validates and normalizes a user-entered URL. Adds an `https://` scheme when none is present,
 * and rejects anything that isn't a syntactically valid http/https URL.
 */
export function validateAndNormalizeUrl(raw: unknown): UrlValidationResult {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return { isValid: false, error: "URL cannot be empty" };

  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withProto);
    if (u.protocol === "http:" || u.protocol === "https:") {
      return { isValid: true, normalized: u.toString() };
    }
    return { isValid: false, error: "Only http/https URLs are supported" };
  } catch {
    return { isValid: false, error: "Invalid URL format" };
  }
}

/**
 * Convenience wrapper matching the legacy `ensureHttpUrl` signature (returns the normalized URL or
 * `null`). Lets existing call sites migrate with a one-line import change.
 */
export function ensureHttpUrl(raw: unknown): string | null {
  const result = validateAndNormalizeUrl(raw);
  return result.isValid ? (result.normalized ?? null) : null;
}
