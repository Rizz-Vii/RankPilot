# Firestore Real-Time Architecture & Best Practice Prompt

You are an AI IDE reviewing Firestore architecture for a SaaS AI‑SEO platform.

Ensure:

- Real‑time data on UI is driven exclusively by `onSnapshot` listeners (not polling).
- Listeners are cleaned up properly (unsubscribe in React hooks).
- Snapshot listeners include metadata options if needed to detect pending writes.
- Queries use shallow collections and denormalized fields to minimize read count.
- Document IDs are auto‑generated to avoid hotspotting; high‑write entities are partitioned by user or timestamp.
- Batch writes/transactions used for audit and analysis record updates.
- Offline persistence is enabled and UI shows fallback/wrong-network states.
- Write ramp-up rate follows Firestore’s “555 rule” to avoid throughput throttling.
- Firestore Rules align with real-time flows and ensure only authorized user data is read/written.



For each rule, output missing patterns and recommended code snippet.

Output:

- ✅ Best Practices Present
- ❌ Issues or omissions
- 🛠️ Fix suggestions with file path and snippet



