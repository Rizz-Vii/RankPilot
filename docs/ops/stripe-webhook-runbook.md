# Stripe Webhook Runbook

This runbook explains how RankPilot processes Stripe webhooks with idempotency and evidence logging.

## Where the code lives

- Cloud Functions handler: `functions/src/stripe-webhook.ts`
- Idempotency/evidence helpers: `functions/src/lib/billing/idempotency.ts`
- Unit test: `functions/src/test/idempotency.test.ts`

## Idempotency receipts

- Collection: `stripe_event_receipts`
- Document ID: Stripe `event.id`
- On each webhook, we check for an existing receipt before processing. If found, we short‑circuit with HTTP 200.

## Evidence logging

- Collection: `billing_evidence`
- Record minimal, non‑PII details such as `type`, `customerId`, and `ts`. No emails or card data are stored.

## Supported events (examples)

- `invoice.payment_succeeded`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Local testing

- Install deps and run on emulator:
  - `cd functions && npm ci`
  - `npm run test:emulator`
- The emulator will start Firestore and execute mocha tests including idempotency/evidence checks.

## Operations notes

- Safe to retry: handlers are idempotent via receipts.
- In case of backlog replays, duplicates are ignored.
- If evidence writes fail, webhook still returns 200 after core processing; errors are logged.

## Troubleshooting

- 400 invalid signature: confirm `STRIPE_WEBHOOK_SECRET` is set in Hosting secrets for the active environment.
- Duplicate processing detected: expected behavior; verify a single receipt exists for the `event.id`.
- Evidence missing: check function logs and ensure Firestore emulator/production has write permissions.
