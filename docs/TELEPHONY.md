# Telephony (Twilio) Integration

This document covers setup and usage of the Twilio Voice integration used by RankPilot for outbound and inbound calls.

## Environment Variables

Set these in your environment or project secrets:

- TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
- TWILIO_AUTH_TOKEN=your_auth_token
- TWILIO_FROM_NUMBER=+15551234567 # Verified or purchased Twilio number
- TWILIO_DEFAULT_TWIML_URL=https://example.com/api/telephony/webhook # Optional default TwiML URL
- TWILIO_TEST_MODE=1 # Optional; when 1, outbound calls are simulated and no external requests are made

## Server Helpers

- `src/lib/telephony/twilio.ts`
  - `getTwilioClient()` – lazy-load Twilio SDK and return client when configured
  - `getTwilioFromNumber()` – returns `TWILIO_FROM_NUMBER`

## API Routes

- `POST /api/telephony/call`
  - Body: `{ to: string, twimlUrl?: string, testMode?: boolean }`
  - Response: `{ callSid: string, test: boolean }`
  - Behavior: if `testMode` is true or `TWILIO_TEST_MODE=1`, simulates a call and returns a fake SID. Otherwise, places a real call via Twilio.

- `POST /api/telephony/webhook`
  - Expected by Twilio as a status callback or inbound voice webhook. Accepts `application/x-www-form-urlencoded` and responds with 200 JSON for callbacks or simple TwiML for inbound calls.
  - Signature validation is supported when `TWILIO_AUTH_TOKEN` is set and `x-twilio-signature` is provided.

## Local Testing

- Unit tests: `testing/unit/api/telephony.call.route.test.cjs`, `testing/unit/api/telephony.webhook.route.test.cjs`.
  - These run without network I/O; the call route uses test mode, webhook accepts JSON for convenience.

## Notes

- In staging/production, disable test mode and set the webhook URL in the Twilio Console to point at `/api/telephony/webhook`.
- Ensure firewall/IP allowlists permit Twilio webhooks if applicable.
