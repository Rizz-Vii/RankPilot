const { expect } = require("chai");

describe("voice agent tools (unit)", () => {
  it("getAvailability returns slots structure", async () => {
    const tools = require("../../../src/lib/voice/agent-tools");
    const res = await tools.getAvailability({ serviceId: "svc-1" });
    expect(res).to.have.property("ok", true);
    expect(res).to.have.property("slots");
  });

  it("createAppointment writes placeholder appointment", async () => {
    const tools = require("../../../src/lib/voice/agent-tools");
    const payload = {
      serviceId: "svc-1",
      start: new Date().toISOString(),
      customer: { name: "Test", phone: "0412345678" },
    };
    const res = await tools.createAppointment(payload);
    // The test expects ok true and an apptId string
    expect(res).to.have.property("ok", true);
    expect(res.apptId).to.be.a("string");
  });
});
