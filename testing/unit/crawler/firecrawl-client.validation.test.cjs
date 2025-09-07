require("ts-node/register/transpile-only");
const { expect } = require("chai");
const path = require("path");
const Module = require("module");
const __origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "@/lib/metrics/unified-metrics") {
    return {
      recordRouteLatency: () => {},
      recordError: () => {},
      recordFallback: () => {},
    };
  }
  return __origLoad(request, parent, isMain);
};
const clientPath = path.resolve(
  __dirname,
  "../../../src/lib/crawler/firecrawl-client.ts"
);
function purge(p) {
  try {
    delete require.cache[require.resolve(p)];
  } catch {}
}

describe("firecrawl-client validation", () => {
  beforeEach(() => {
    purge(clientPath);
    process.env.FIRECRAWL_API_KEY = "test";
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        pages: [{ url: "https://example.com", status: 9999 }],
      }),
    });
  });
  it("falls back (validation) on invalid page shape", async () => {
    const { runFirecrawl } = require(clientPath);
    const res = await runFirecrawl("https://example.com");
    expect(res.fallback).to.equal(true);
    expect(res.degradedReason).to.equal("validation");
  });
  it("passes canonicalUrl and metaDescription when present", async () => {
    purge(clientPath);
    process.env.FIRECRAWL_API_KEY = "test";
    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        pages: [
          {
            url: "https://example.com",
            markdown: "content",
            status: 200,
            title: "Title",
            links: ["https://a"],
            canonicalUrl: "https://example.com",
            metaDescription: "Example description",
          },
        ],
      }),
    });
    const { runFirecrawl } = require(clientPath);
    const res = await runFirecrawl("https://example.com");
    global.fetch = originalFetch;
    expect(res.fallback).to.not.equal(true);
    expect(res.pages[0].canonicalUrl).to.equal("https://example.com");
    expect(res.pages[0].metaDescription).to.equal("Example description");
  });
});
