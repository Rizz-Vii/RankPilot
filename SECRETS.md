# Secrets & Environment Reference

**Names and purposes only — never put real values in this file or in any tracked file.**

- **Local dev:** copy `.env.example` → `.env.local` and fill values.
- **Production:** values live in **Firebase Secret Manager** (see the `secrets` array in `firebase.json`),
  not in any committed file.
- **Public vs secret:** keys prefixed `NEXT_PUBLIC_*` are compiled into client-side JS and are **public
  by design** (Firebase web config, reCAPTCHA site key, VAPID public key). They are *not* secrets — access
  is controlled by Firebase Security Rules + App Check, not by key secrecy. Everything else is a true
  secret and must never be committed.

> If a real secret is ever committed, treat it as compromised: **rotate it**, then remove it from the
> working tree. Purging it from git *history* is a separate, pre-publish step (it rewrites history and
> invalidates existing clones) — do it deliberately, not ad hoc.

---

## Core / app
| Key | Purpose | Secret? |
|---|---|---|
| `NODE_ENV`, `NEXT_PUBLIC_APP_ENV` | Runtime environment | No |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BASE_URL`, `API_BASE_URL`, `PUBLIC_BASE_URL` | App + callback base URLs | No |

## Auth
| Key | Purpose | Secret? |
|---|---|---|
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | **Legacy** — NextAuth. Firebase Auth is canonical; these are slated for removal in Phase 2 (single auth story). | Secret |

## Firebase
| Key | Purpose | Secret? |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` (API key, auth domain, project ID, bucket, sender ID, app ID, measurement ID) | Client web config | **No — public by design** |
| (server) Firebase Admin service account | Backend Admin SDK. Provided via runtime/Secret Manager, **never** a committed JSON. See `serviceAccount.example.json` for the shape only. | Secret |

## AI providers
| Key | Purpose | Secret? |
|---|---|---|
| `GEMINI_API_KEY`, `GOOGLE_AI_API_KEY`, `GOOGLE_API_KEY` | Google Gemini / Generative AI (primary) | Secret |
| `OPENAI_API_KEY`, `OPENAI_GPT5_KEY`, `OPENAI_ORGANIZATION` | OpenAI (fallback + chat) | Secret |
| `HUGGINGFACE_TOKEN` | Reserved (not yet integrated) | Secret |
| `USE_REAL_AI` | Flag: use real AI vs simulated flows | Secret (flag) |

## Payments
| Key | Purpose | Secret? |
|---|---|---|
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe API + webhook signature verification | Secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side Stripe | No — public |
| `STRIPE_PRICE_STARTER` / `_AGENCY` / `_ENTERPRISE` (+ interval variants) | Tier price IDs (env-backed, never hard-coded — see `functions/src/lib/billing/tiers.ts`) | Config |

## Email / telephony
| Key | Purpose | Secret? |
|---|---|---|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_FROM_EMAIL`, `CONTACT_RECEIVER_EMAIL` | Outbound email | Secret (SMTP_PASS) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | Twilio voice | Secret (auth token) |

## Bot protection / monitoring
| Key | Purpose | Secret? |
|---|---|---|
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | reCAPTCHA v3 site key | No — public |
| `RECAPTCHA_SECRET_KEY` | reCAPTCHA backend validation | Secret |
| `SENTRY_DSN` | Error tracking (public DSN ok) | No — public |
| `SENTRY_AUTH_TOKEN`, `SENTRY_CLIENT_SECRET` | Sentry release/source-map upload | Secret |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push public key | No — public |

## Reserved / future integrations (placeholders, not yet wired)
| Key | Purpose |
|---|---|
| `FIRECRAWL_API_KEY`, `ZAPIER_API_KEY`, `BRAVE_API_KEY`, `GITHUB_PERSONAL_ACCESS_TOKEN`, `CRAWL_PROBE_TOKEN` | Reserved for future crawl/search/automation work. Keep as placeholders until integrated. |

## Test accounts — **never hard-code passwords in source**
Passwords are resolved at runtime via `resolveTestPassword()` in the test-user configs
(`testing/specs/organized/unified-test-users.ts`, `testing/config/unified-test-users.ts`). A missing
value resolves to `""` so auth fails loudly rather than relying on a baked-in default.

| Key | Purpose |
|---|---|
| `TEST_USER_EMAIL`, `TEST_ADMIN_EMAIL` | Test-account logins |
| `TEST_USER_PASSWORD` | Shared password for non-admin tiers (fallback) |
| `TEST_ADMIN_PASSWORD` | Admin-tier password (fallback) |
| `TEST_PASSWORD_FREE` / `_STARTER` / `_AGENCY` / `_ENTERPRISE` / `_ADMIN` | Per-tier overrides |
| `TEST_BASE_URL` | Base URL the e2e suite targets |

> ⚠️ The test accounts (`admin@rankpilot.com`, etc.) are **real Firebase Auth accounts** that previously
> shipped with weak, source-committed passwords (`admin123`, …). Those passwords — and their scrypt
> hashes (formerly in `users.json`) — are exposed in git history. **Rotate them in Firebase Auth** and
> set the new values via the env vars above. This is a user action; Claude cannot rotate Firebase
> passwords.

## Never commit
- `users.json` / any `firebase auth:export` output (password hashes + salts + emails) — now gitignored.
- Real `serviceAccount.json` (only `serviceAccount.example.json` with a `REDACTED` key is tracked).
- `.env`, `.env.local`, `.env.*` (except the `*.example` templates).
- Generated artifacts (`lint-report*.json`, `typecheck-output.txt`, crawl reports) — now gitignored.
