const { expect } = require("chai");

describe("API health alerts (live)", () => {
  it("GET /api/health/alerts returns JSON array or object", async () => {
    const base = process.env.TEST_BASE_URL || "http://localhost:3000";
    const resp = await fetch(`${base}/api/health/alerts`);
    expect(resp.status).to.be.oneOf([200, 404]);
    if (resp.status === 200) {
      const body = await resp.json();
      expect(body).to.satisfy(
        (v) => Array.isArray(v) || (typeof v === "object" && v !== null)
      );
    }
  });
});
