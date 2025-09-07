// Register ts-node for TS test support
require("ts-node").register({
  transpileOnly: true,
  compilerOptions: { module: "CommonJS", moduleResolution: "node10" },
});
// Alias support for @/
const Module = require("module");
const path = require("path");
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    const p = path.join(process.cwd(), "src", request.slice(2));
    return origResolve.call(this, p, parent, isMain, options);
  }
  return origResolve.call(this, request, parent, isMain, options);
};
require("./firecrawl-client.test.cjs");
require("./firecrawl-client.validation.test.cjs");
require("./firecrawl-concurrency.test.cjs");
