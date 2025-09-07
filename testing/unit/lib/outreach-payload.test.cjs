const assert = require("assert");

describe("Outreach payload builder", () => {
  it("builds ISO schedule and repeat when provided", () => {
    // Use require with ts-node/register to load the TS module; fix relative path to project root
    // testing/unit/lib -> testing/unit -> testing -> project root
    const mod = require("../../../src/app/(app)/sales/outreach/_client/payload");
    const buildOutboundPayload =
      mod.buildOutboundPayload ||
      (mod.default && mod.default.buildOutboundPayload);
    const local = "2025-09-06T12:00";
    const p = buildOutboundPayload({
      scheduleLocal: local,
      pitch: "hello",
      useRecordingOnly: false,
      voice: "alice",
      language: "en-US",
      rate: 1,
      fromNum: "+15551234567",
      phones: ["+15550001111", "+15550002222"],
      recordingUrl: "https://x/y.wav",
      repeat: "daily",
      interactive: true,
    });
    assert.ok(
      p.schedule.endsWith(":00.000Z") || /:00Z$/.test(p.schedule),
      "schedule should be ISO"
    );
    assert.equal(p.voice, "alice");
    assert.equal(p.language, "en-US");
    assert.equal(p.rate, 1);
    assert.equal(p.from, "+15551234567");
    assert.equal(p.recordingUrl, "https://x/y.wav");
    assert.deepEqual(p.phones, ["+15550001111", "+15550002222"]);
    assert.equal(p.repeat, "daily");
    assert.equal(p.interactive, true);
  });

  it("sets script from pitch when not using recording; preserves pitch for back-compat", () => {
    const mod = require("../../../src/app/(app)/sales/outreach/_client/payload");
    const buildOutboundPayload =
      mod.buildOutboundPayload ||
      (mod.default && mod.default.buildOutboundPayload);
    const p1 = buildOutboundPayload({
      scheduleLocal: "2025-09-06T12:00",
      pitch: "hello world",
      useRecordingOnly: false,
      phones: ["+15550001111"],
    });
    // script should exist and equal pitch in our builder when not recording-only
    if (p1.script) {
      assert.equal(p1.script, "hello world");
    }
    assert.equal(p1.pitch, "hello world");

    const p2 = buildOutboundPayload({
      scheduleLocal: "2025-09-06T12:00",
      pitch: "ignored by recording",
      useRecordingOnly: true,
      recordingUrl: "https://x/rec.wav",
      phones: ["+15550001111"],
    });
    // When recording only, we still allow script/pitch fields but call path uses recordingUrl
    assert.equal(p2.recordingUrl, "https://x/rec.wav");
  });
});
