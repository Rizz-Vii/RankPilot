// Twilio server-side client helper (Node runtime only)
// Lazy-imports the twilio SDK to avoid bundling in client builds.
import type { Twilio } from "twilio";

let cachedClient: Twilio | null = null;

export function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;

  if (cachedClient) return cachedClient;
  try {
    const twilio = require("twilio");
    cachedClient = new twilio.Twilio(accountSid, authToken);
    return cachedClient;
  } catch {
    return null;
  }
}

export function getTwilioFromNumber() {
  return process.env.TWILIO_FROM_NUMBER || null;
}

/**
 * Optional list of allowed outbound caller IDs. Comma-separated E.164 values.
 * If provided, API routes can validate an override `from` against this list.
 */
export function getTwilioFromNumbersList(): string[] {
  const raw = process.env.TWILIO_FROM_NUMBERS || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
