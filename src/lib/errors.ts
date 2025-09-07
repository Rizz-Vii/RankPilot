// Shared error normalization helpers to avoid any-casts and scattered guards
export type NormalizedError = {
  message?: string;
  code?: string;
};

export function getErrorInfo(e: unknown): NormalizedError {
  const info: NormalizedError = {};
  if (e && typeof e === "object") {
    if ("message" in (e as Record<string, unknown>)) {
      const m = (e as { message?: unknown }).message;
      if (typeof m === "string") info.message = m;
      else if (m != null) info.message = String(m);
    }
    if ("code" in (e as Record<string, unknown>)) {
      const c = (e as { code?: unknown }).code;
      if (typeof c === "string") info.code = c;
      else if (c != null) info.code = String(c);
    }
  } else if (typeof e === "string") {
    info.message = e;
  }
  return info;
}

export function getErrorMessage(e: unknown): string | undefined {
  return getErrorInfo(e).message;
}
