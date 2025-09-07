import { expect } from "chai";
import { _pubsubPublishImpl, mirrorEvent } from "../src/lib/event-mirror";

function makeSnap(docId: string, data: Record<string, unknown>) {
  return {
    id: docId,
    data: () => ({ ...data }),
  };
}

describe("T28 event mirroring scaffold", () => {
  const originalEnv = process.env.EVENT_MIRROR_ENABLED;
  let calls: Array<{ topic: string; payload: unknown }> = [];

  beforeEach(() => {
    calls = [];
    (process.env as unknown as Record<string, string>).EVENT_MIRROR_ENABLED =
      "0";
    // @ts-ignore override for test
    _pubsubPublishImpl = async (topic: string, payload: unknown) => {
      calls.push({ topic, payload });
    };
    // Touch the symbol to satisfy no-unused-vars rule for type-only analysis.
    void _pubsubPublishImpl;
  });

  afterEach(() => {
    // @ts-ignore reset
    _pubsubPublishImpl = null as unknown as typeof _pubsubPublishImpl;
    if (originalEnv === undefined)
      delete (process.env as unknown as Record<string, string>)
        .EVENT_MIRROR_ENABLED;
    else
      (process.env as unknown as Record<string, string>).EVENT_MIRROR_ENABLED =
        originalEnv as string;
  });

  it("does nothing when flag is disabled", async () => {
    const ts = new Date("2025-01-01T00:00:00.000Z");
    const snap = makeSnap("1735689600000-deadbeef", {
      orgId: "org_x",
      type: "automation.run.started",
      ts,
    });
    await mirrorEvent({
      snapshot: snap,
      context: { params: { orgId: "org_x", eventId: snap.id } },
    });
    expect(calls.length).to.equal(0);
  });

  it("publishes minimal payload when enabled", async () => {
    (process.env as unknown as Record<string, string>).EVENT_MIRROR_ENABLED =
      "1";
    const ts = new Date("2025-01-01T00:00:00.000Z");
    const snap = makeSnap("1735689600000-deadbeef", {
      orgId: "org_x",
      type: "automation.run.started",
      ts,
    });
    await mirrorEvent({
      snapshot: snap,
      context: { params: { orgId: "org_x", eventId: snap.id } },
    });
    expect(calls.length).to.equal(1);
    const { topic, payload } = calls[0];
    expect(topic).to.equal("events-raw");
    expect(payload).to.deep.equal({
      eventId: "1735689600000-deadbeef",
      type: "automation.run.started",
      orgId: "org_x",
      createdAt: "2025-01-01T00:00:00.000Z",
    });
  });
});
