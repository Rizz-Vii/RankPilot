#!/usr/bin/env node
/**
 * Guardrail for Codex Web environments: warn (or fail, when CODEX_WEB_STRICT_ENV=1)
 * if sensitive tokens are present in plain environment variables instead of Secrets.
 */
const SENSITIVE_PREFIXES = [
  "OPENAI_",
  "GEMINI_",
  "GOOGLE_API_KEY",
  "FIRECRAWL_",
  "STRIPE_",
  "SENTRY_",
  "RECAPTCHA_",
  "SMTP_",
  "GITHUB_TOKEN",
  "GITHUB_PERSONAL_ACCESS_TOKEN",
  "FIREBASE_",
  "HF_TOKEN",
  "HUGGINGFACE_",
];

const SAFE_TOGGLES = new Set([
  "NEXT_TELEMETRY_DISABLED",
  "NODE_OPTIONS",
  "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD",
  "HUSKY",
  "DISABLE_ESLINT_PLUGIN",
  "SKIP_ENV_VALIDATION",
  "RANKPILOT_AGENTS_ENABLED",
]);

function looksSensitive(key) {
  if (SAFE_TOGGLES.has(key)) return false;
  return SENSITIVE_PREFIXES.some((p) => key.startsWith(p));
}

const offenders = Object.keys(process.env)
  .filter((k) => looksSensitive(k))
  // Ignore empty values (not actually configured)
  .filter((k) => (process.env[k] ?? "").trim().length > 0);

if (offenders.length) {
  console.warn(
    "\n[validate-codex-env] ⚠️  Sensitive variables found in plain env:"
  );
  offenders.forEach((k) => console.warn(" - " + k));
  console.warn(
    '\nMove these to the environment "Secrets" store and remove from plain env.'
  );
  console.warn(
    "This check can be enforced by setting CODEX_WEB_STRICT_ENV=1.\n"
  );
}

if (process.env.CODEX_WEB_STRICT_ENV === "1" && offenders.length) {
  console.error("[validate-codex-env] Failing due to strict mode.");
  process.exit(2);
}

process.exit(0);
