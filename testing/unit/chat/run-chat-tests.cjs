// Register ts-node for TS test (tsx for TS/JSX)
require("ts-node").register({
  transpileOnly: true,
  compilerOptions: {
    jsx: "react-jsx",
    module: "CommonJS",
    moduleResolution: "node10",
  },
});
// Basic @ alias
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
// jsdom
require("../mocha-jsdom-setup.cjs");
// run spec
require("./customer-chat-attachments.spec.tsx");
