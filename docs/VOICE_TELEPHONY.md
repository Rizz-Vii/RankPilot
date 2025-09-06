# Voice Telephony (Twilio)

Server routes:

- POST `/api/voice/outbound` — initiates outbound call (Twilio when configured) and books appointment.
- POST `/api/voice/twilio/inbound` — Twilio inbound voice webhook (responds with TwiML, records call).
- POST `/api/voice/twilio/status` — Twilio status callback webhook; updates `voice_calls`.

Environment:

- TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
- PUBLIC_BASE_URL (optional, enables status callbacks)

Collections:

- `voice_calls` — records callSid, to/from, status, direction and raw webhook payloads.
