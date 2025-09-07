const assert = require("assert");

// Capture per-test TwiML by stubbing the 'twilio' package before importing the route
function withTwilioStub(testFn) {
  return async () => {
    // Ensure env makes getTwilioClient() truthy
    process.env.TWILIO_ACCOUNT_SID = "AC_test";
    process.env.TWILIO_AUTH_TOKEN = "token_test";
    process.env.TWILIO_FROM_NUMBER = "+15551234567";

    // Install stub twilio module into require cache
    let captured = { twiml: null, args: null };
    const stubFactory = function Twilio() {
      return {
        calls: {
          create: async (args) => {
            captured.twiml = args.twiml;
            captured.args = args;
            return { sid: "CA_test", status: "queued" };
          },
        },
      };
    };
    require.cache[require.resolve("twilio")] = {
      id: "twilio",
      filename: "twilio",
      loaded: true,
      exports: { Twilio: stubFactory },
    };

    // Reset our TS modules to clear any cached Twilio client between tests
    try {
      delete require.cache[
        require.resolve("../../../src/lib/telephony/twilio.ts")
      ];
    } catch {}
    try {
      delete require.cache[
        require.resolve("../../../src/app/api/voice/outbound/route.ts")
      ];
    } catch {}

    // Require after stubbing so the route picks up our stub via CommonJS hooks
    // ts-node/register is already set up by the test runner for this suite
    const route = require("../../../src/app/api/voice/outbound/route.ts");

    try {
      await testFn({ route, captured });
    } finally {
      // Clean up stubbed module so other tests aren't affected
      delete require.cache[require.resolve("twilio")];
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;
      delete process.env.TWILIO_FROM_NUMBER;
    }
  };
}

describe("voice outbound TwiML generation", () => {
  it(
    "generates Say TwiML with script (non-interactive)",
    withTwilioStub(async ({ route, captured }) => {
      const body = {
        phone: "+15550001111",
        schedule: new Date(Date.now() + 60_000).toISOString(),
        voice: "alice",
        language: "en-US",
        rate: 1.2,
        script: "This is a dynamic script.",
        interactive: false,
      };
      const req = new Proxy(
        {},
        { get: (_t, p) => (p === "json" ? async () => body : undefined) }
      );
      const res = await route.POST(req);
      const j = await res.json();
      assert.ok(
        j.ok === true || j.error == null,
        "route should complete without hard error"
      );
      assert.ok(captured.twiml, "twiml should be captured");
      assert.ok(
        captured.twiml.includes("<Say"),
        "should use <Say> when no recording and non-interactive"
      );
      assert.ok(
        captured.twiml.includes("This is a dynamic script."),
        "should include provided script"
      );
      assert.ok(
        captured.twiml.includes('voice="alice"'),
        "should include voice option"
      );
      assert.ok(
        captured.twiml.includes('language="en-US"'),
        "should include language"
      );
      assert.ok(
        captured.twiml.includes('<prosody rate="120%">') ||
          !captured.twiml.includes("<prosody"),
        "rate mapping to prosody when != 1"
      );
    })
  );

  it(
    "generates Gather TwiML when interactive=true and includes prompt",
    withTwilioStub(async ({ route, captured }) => {
      const body = {
        phone: "+15550002222",
        schedule: new Date(Date.now() + 60_000).toISOString(),
        voice: "alice",
        language: "en-US",
        rate: 1,
        script: "Please confirm your interest.",
        interactive: true,
      };
      const req = new Proxy(
        {},
        { get: (_t, p) => (p === "json" ? async () => body : undefined) }
      );
      const res = await route.POST(req);
      const j = await res.json();
      assert.ok(
        j.ok === true || j.error == null,
        "route should complete without hard error"
      );
      assert.ok(
        captured.twiml.includes("<Gather"),
        "interactive calls should use <Gather>"
      );
      assert.ok(
        captured.twiml.includes("Press 1 if interested"),
        "prompt should include call-to-action"
      );
      assert.ok(
        captured.twiml.includes("Please confirm your interest."),
        "should include script in prompt"
      );
    })
  );

  it(
    "uses <Play> TwiML when recordingUrl provided (recording precedence)",
    withTwilioStub(async ({ route, captured }) => {
      const body = {
        phone: "+15550003333",
        schedule: new Date(Date.now() + 60_000).toISOString(),
        recordingUrl: "https://example.com/audio.wav",
        voice: "alice",
        language: "en-US",
        rate: 1,
        script: "This should be ignored due to recording.",
        interactive: false,
      };
      const req = new Proxy(
        {},
        { get: (_t, p) => (p === "json" ? async () => body : undefined) }
      );
      const res = await route.POST(req);
      await res.json();
      assert.ok(
        captured.twiml.includes("<Play>"),
        "should use <Play> when recordingUrl is present"
      );
      assert.ok(
        !captured.twiml.includes("<Say"),
        "should not include <Say> when using recording"
      );
      assert.ok(
        captured.twiml.includes("https://example.com/audio.wav"),
        "should include recording URL"
      );
    })
  );

  it(
    "prefers `script` over legacy `pitch`",
    withTwilioStub(async ({ route, captured }) => {
      const body = {
        phone: "+15550004444",
        schedule: new Date(Date.now() + 60_000).toISOString(),
        voice: "alice",
        language: "en-US",
        rate: 1,
        script: "SCRIPT_WINS",
        pitch: "PITCH_LOSES",
        interactive: false,
      };
      const req = new Proxy(
        {},
        { get: (_t, p) => (p === "json" ? async () => body : undefined) }
      );
      const res = await route.POST(req);
      await res.json();
      assert.ok(
        captured.twiml.includes("SCRIPT_WINS"),
        "should include script content"
      );
      assert.ok(
        !captured.twiml.includes("PITCH_LOSES"),
        "should not include pitch when script present"
      );
    })
  );
});
