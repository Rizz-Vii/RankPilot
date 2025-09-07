const { expect } = require("chai");

describe("API team invite endpoint (live)", () => {
  it("GET /api/team/invite should return 200 or 401 (auth gated)", async () => {
    const base = process.env.TEST_BASE_URL || "http://localhost:3000";
    const resp = await fetch(`${base}/api/team/invite`);
    // Accept 200 (public listing) or 401/403 for gated endpoints
    expect(resp.status).to.be.oneOf([200, 401, 403]);
  });

  it("POST /api/team/invite without auth should be rejected", async () => {
    const base = process.env.TEST_BASE_URL || "http://localhost:3000";
    const resp = await fetch(`${base}/api/team/invite`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" }),
    });
    expect(resp.status).to.be.oneOf([401, 403, 400]); // Some servers reply 400 for missing fields, but ensure no 200
  });
});
