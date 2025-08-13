# CONFIGURATION COMPREHENSIVE

Last updated: 2025-08-12

- Source-of-truth for configuration details lives in `COMPREHENSIVE_SYSTEM_ARCHITECTURE.md` (Section: Configuration) and `COMPREHENSIVE_SECURITY_PROTOCOLS.md` (CSP/COOP/CORS/secrets).
- For the latest operational deltas, see `archey/ADDENDUM_2025-08-12.md`.
- Canonical chatmode: `.github/chatmodes/pilotBuddy.chatmode.md`.

Quick pointers:

- Firebase config: `firebase.json`, `firestore.rules`, `firestore.indexes.json`, functions runtime Node 20, region `australia-southeast2`.
- CSP/Headers: managed via `next.config.ts` headers and Firebase hosting headers; Stripe/PayPal domains whitelisted.
- Table Data API now Firestore-backed with CSV export; see `docs/CHANGE_LOG.md` (2025-08-12).
- Scheduler: manual `/api/automation/run-due` deprecated (410); use scheduled function; emulator tests pending.
