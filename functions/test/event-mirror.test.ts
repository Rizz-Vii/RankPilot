import { expect } from 'chai';
import { mirrorEvent, _pubsubPublishImpl } from '../src/lib/event-mirror';

function makeSnap(docId: string, data: any) {
  return {
    id: docId,
    data: () => ({ ...data }),
  };
}

describe('T28 event mirroring scaffold', () => {
  const originalEnv = process.env.EVENT_MIRROR_ENABLED;
  let calls: Array<{ topic: string; payload: any }> = [];

  beforeEach(() => {
    calls = [];
    (process.env as any).EVENT_MIRROR_ENABLED = '0';
    // @ts-ignore override for test
    _pubsubPublishImpl = async (topic: string, payload: unknown) => {
      calls.push({ topic, payload });
    };
  });

  afterEach(() => {
    // @ts-ignore reset
    _pubsubPublishImpl = null;
    if (originalEnv === undefined) delete (process.env as any).EVENT_MIRROR_ENABLED;
    else (process.env as any).EVENT_MIRROR_ENABLED = originalEnv;
  });

  it('does nothing when flag is disabled', async () => {
    const ts = new Date('2025-01-01T00:00:00.000Z');
    const snap: any = makeSnap('1735689600000-deadbeef', { orgId: 'org_x', type: 'automation.run.started', ts });
    await mirrorEvent({ snapshot: snap, context: { params: { orgId: 'org_x', eventId: snap.id } } });
    expect(calls.length).to.equal(0);
  });

  it('publishes minimal payload when enabled', async () => {
    (process.env as any).EVENT_MIRROR_ENABLED = '1';
    const ts = new Date('2025-01-01T00:00:00.000Z');
    const snap: any = makeSnap('1735689600000-deadbeef', { orgId: 'org_x', type: 'automation.run.started', ts });
    await mirrorEvent({ snapshot: snap, context: { params: { orgId: 'org_x', eventId: snap.id } } });
    expect(calls.length).to.equal(1);
    const { topic, payload } = calls[0];
    expect(topic).to.equal('events-raw');
    expect(payload).to.deep.equal({
      eventId: '1735689600000-deadbeef',
      type: 'automation.run.started',
      orgId: 'org_x',
      createdAt: '2025-01-01T00:00:00.000Z',
    });
  });
});

