const assert = require('assert');

// Build a minimal fake Firestore-like API to inject
function makeFakeDb({ appts }) {
    const queueAdds = [];
    const updates = [];

    function makeDocSnap(id, data) {
        return {
            id,
            data: () => ({ ...data }),
            ref: {
                update: async (patch) => {
                    updates.push({ id, patch });
                },
            },
        };
    }

    const docs = appts.map((a, i) => makeDocSnap(`appt_${i + 1}`, a));

    return {
        __queueAdds: queueAdds,
        __updates: updates,
        collection(name) {
            if (name === 'appointments') {
                const query = {
                    where() { return query; },
                    orderBy() { return query; },
                    limit() { return query; },
                    async get() {
                        return { empty: docs.length === 0, docs };
                    },
                };
                return query;
            }
            if (name === 'voice_outbound_queue') {
                return {
                    async add(doc) { queueAdds.push(doc); return { id: `q_${queueAdds.length}` }; },
                };
            }
            throw new Error(`Unexpected collection: ${name}`);
        },
    };
}

describe('processVoiceRecurringTick (unit)', () => {
    it('returns processed:0 when no due appointments', async () => {
        const { processVoiceRecurringTick } = require('../../../functions/src/scheduled/voice-recurring');
        const fakeDb = makeFakeDb({ appts: [] });
        const res = await processVoiceRecurringTick(fakeDb, new Date('2025-09-01T00:00:00.000Z'));
        assert.deepStrictEqual(res, { processed: 0 });
        assert.strictEqual(fakeDb.__queueAdds.length, 0);
        assert.strictEqual(fakeDb.__updates.length, 0);
    });

    it('enqueues next occurrences and advances nextOccurrence for daily and weekly', async () => {
        const { processVoiceRecurringTick } = require('../../../functions/src/scheduled/voice-recurring');
        const now = new Date('2025-09-06T12:00:00.000Z');
        const appts = [
            {
                repeat: 'daily',
                nextOccurrence: { toDate: () => new Date('2025-09-06T11:00:00.000Z') },
                customer: { phone: '+15550001111', name: 'A' },
                from: '+15551234567',
                payload: { voice: 'alice', language: 'en-US', rate: 1, interactive: true },
            },
            {
                repeat: 'weekly',
                nextOccurrence: { toDate: () => new Date('2025-09-06T10:00:00.000Z') },
                customer: { phone: '+15550002222', name: 'B' },
                config: { voice: 'man', language: 'en-GB', rate: 0.9, recordingUrl: 'https://x/y.mp3', interactive: false },
            },
        ];
        const fakeDb = makeFakeDb({ appts });
        const res = await processVoiceRecurringTick(fakeDb, now);

        // processed count
        assert.strictEqual(res.processed, 2);

        // two queue items
        assert.strictEqual(fakeDb.__queueAdds.length, 2);
        const [q1, q2] = fakeDb.__queueAdds;
        assert.strictEqual(q1.to, '+15550001111');
        assert.strictEqual(q1.from, '+15551234567');
        assert.strictEqual(q1.repeat, 'daily');
        assert.strictEqual(q1.config.voice, 'alice');
        assert.strictEqual(q1.config.language, 'en-US');
        assert.strictEqual(q1.config.rate, 1);
        assert.strictEqual(q1.config.interactive, true);
        // schedule is now + 60s
        assert.ok(Math.abs(new Date(q1.schedule).getTime() - (now.getTime() + 60000)) <= 5);

        assert.strictEqual(q2.to, '+15550002222');
        assert.strictEqual(q2.repeat, 'weekly');
        assert.strictEqual(q2.config.voice, 'man');
        assert.strictEqual(q2.config.language, 'en-GB');
        assert.strictEqual(q2.config.rate, 0.9);
        assert.strictEqual(q2.config.recordingUrl, 'https://x/y.mp3');
        assert.strictEqual(q2.config.interactive, false);

        // updates to nextOccurrence were issued for both docs
        assert.strictEqual(fakeDb.__updates.length, 2);
        const [u1, u2] = fakeDb.__updates;
        // nextOccurrence advanced by 1 day and 7 days respectively
        assert.ok(new Date(u1.patch.nextOccurrence).getTime() - appts[0].nextOccurrence.toDate().getTime() === 86_400_000);
        assert.ok(new Date(u2.patch.nextOccurrence).getTime() - appts[1].nextOccurrence.toDate().getTime() === 7 * 86_400_000);
    });
});
