const { strict: assert } = require("assert");
const utils = require("../../../src/lib/tool-badge-utils.ts");

describe("tool-badge-utils", () => {
  it("returns NeuroSEO badge for ai-visibility", () => {
    const badges = utils.getFeatureBadges("ai-visibility");
    assert.ok(Array.isArray(badges) && badges.length >= 1);
    assert.equal(badges[0].label.includes("NeuroSEO"), true);
  });

  it("composes Live Data provenance", () => {
    const badges = utils.composeToolHeaderBadges("dashboard", "live");
    const hasLive = badges.some((b) => b.label === "Live Data");
    assert.equal(hasLive, true);
  });

  it("composes Demo Data provenance for fallback", () => {
    const badges = utils.composeToolHeaderBadges("dashboard", "fallback");
    const hasDemo = badges.some((b) => b.label === "Demo Data");
    assert.equal(hasDemo, true);
  });
});
