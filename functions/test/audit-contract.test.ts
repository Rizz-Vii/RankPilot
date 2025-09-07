import { expect } from "chai";
import type { AppOptions } from "firebase-admin/app";
import { getApps, initializeApp } from "firebase-admin/app";
import * as auditMod from "../src/api/audit";

// Contract test (T11) for runSeoAudit ensuring AI JSON path is parsed & schema validated.
// We monkey-patch getAI().generate to return compliant JSON.

describe("runSeoAudit contract (T11)", () => {
  before(() => {
    if (!getApps().length)
      initializeApp({ projectId: "demo-test" } as AppOptions);
  });

  it("parses AI JSON and surfaces items + overallScore", () => {
    const core = {
      score: 60,
      issues: { critical: [], major: [], minor: [] },
      recommendations: ["base rec"],
      performanceMetrics: { pageSpeed: 55 },
    };
    const json = JSON.stringify({
      overallScore: 82,
      issues: { critical: ["Missing meta description"], major: [], minor: [] },
      recommendations: ["Add meta"],
      performanceMetrics: { pageSpeed: 70 },
      items: [
        {
          id: "i1",
          name: "Issue1",
          title: "Issue1",
          description: "desc",
          details: "details",
          status: "fail",
          score: 40,
          impact: "high",
          recommendation: "fix",
        },
      ],
      summary: "OK",
    });
    const enriched = (
      auditMod as unknown as {
        __testApplyAiAudit: (
          base: typeof core,
          json: string,
          url: string
        ) => {
          overallScore: number;
          items: Array<{ id: string; status: string }>;
          recommendations: string[];
        };
      }
    ).__testApplyAiAudit(core, json, "https://example.com");
    expect(enriched.overallScore).to.equal(82);
    expect(enriched.items[0].id).to.equal("i1");
    expect(enriched.items[0].status).to.equal("fail");
    expect(enriched.recommendations[0]).to.equal("Add meta");
  });
});
