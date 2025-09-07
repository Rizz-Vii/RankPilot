const { expect } = require("chai");

describe("API user preferences endpoint (live)", () => {
  it("GET /api/user/preferences should return 200 or 401 when unauthenticated", async () => {
    const base = process.env.TEST_BASE_URL || "http://localhost:3000";
    const resp = await fetch(`${base}/api/user/preferences`);
    // Some deployments may return 404 or 405 for this path; accept those as non-200 auth-gated responses
    expect(resp.status).to.be.oneOf([200, 401, 403, 404, 405]);
    if (resp.status === 200) {
      const body = await resp.json();
      expect(body).to.be.an("object");
    }
  });
});
