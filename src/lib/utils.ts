import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Safe error helpers for unknown error handling
export function asError(err: unknown): Error {
  if (err instanceof Error) return err;
  const message = typeof err === "string" ? err : JSON.stringify(err);
  return new Error(message);
}

export function safeErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

// Convert Firestore Timestamp or various inputs to a JS Date
export function toJsDate(value: unknown): Date {
  if (!value) return new Date();
  // Firestore Timestamp-like
  const anyVal: any = value as any;
  if (typeof anyVal?.toDate === "function") {
    try {
      const d = anyVal.toDate();
      if (d instanceof Date) return d;
    } catch {}
  }
  if (value instanceof Date) return value;
  const maybe = new Date(String(value));
  return isNaN(maybe.getTime()) ? new Date() : maybe;
}

// Browser clipboard helper with fallback
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return true;
  } catch {
    return false;
  }
}
