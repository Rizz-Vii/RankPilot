const { expect } = require("chai");

describe("createAppointment -> sendConfirmation integration", function () {
  it("calls sendConfirmation (stubbed) when creating an appointment in fallback mode", async function () {
    // require the tools module and replace sendConfirmation with a spy
    const toolsPath = "../../../src/lib/voice/agent-tools";
    const tools = require(toolsPath);

    let called = false;
    const originalSetter = tools.__test_setSendConfirmationImpl;
    tools.__test_setSendConfirmationImpl(async function (opts) {
      called = true;
      return { ok: true };
    });

    try {
      const payload = {
        serviceId: "svc-x",
        start: new Date().toISOString(),
        customer: { email: "test@example.com" },
      };
      const res = await tools.createAppointment(payload);
      expect(res).to.have.property("ok", true);
      expect(called).to.equal(true);
    } finally {
      // restore default implementation
      tools.__test_setSendConfirmationImpl(undefined);
    }
  });
});
