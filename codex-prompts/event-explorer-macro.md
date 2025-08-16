# Codex Macro Prompt: Event Explorer Enhancements (T29)

Constraints:

- Keep total added LOC ≤ 450.
- No CHANGE_LOG edits this batch.
- Avoid unrelated formatting churn.

Objectives:

1. Enhance `src/app/(app)/admin/events/page.tsx` with filters (type select from registry, source substring, date range start/end) and pagination (limit 50, next/prev) using Firestore queries.
2. Add a utility `src/lib/events/listEvents.ts`:
   export interface ListEventsParams { db:any; orgId:string; limit:number; startAfter?:any; filters?: { type?:string; source?:string; startDate?:number; endDate?:number } }
   export async function listEvents(params: ListEventsParams): Promise<{ events:any[]; nextCursor?:any }>
3. CSV export button (client) generating current filtered page rows: columns timestamp,eventId,type,source,naturalKey(optional),attrs.step(optional).
4. Add minimal unit test `tests/events/listEvents.test.ts` mocking an in-memory store verifying filter+pagination.
5. Keep existing publishEvent test unchanged.
6. Idempotent: if file already contains placeholders, fill them instead of duplicating.

Final Output JSON only:
{
  "result":{
    "filesCreated":[...],
    "filesUpdated":[...],
    "testsAdded":true,
    "pagination":true,
    "csvExport":true
  }
}
