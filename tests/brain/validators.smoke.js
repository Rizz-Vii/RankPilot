const assert = require("assert");
const mod = require("../../dist/brain/scripts/brain/validation/validators");
(async () => {
  const { runValidators } = mod;
  const v = await runValidators({
    cfg: {
      tools: {
        typecheck: false,
        eslint: false,
        unitTests: false,
        playwright: false,
        a11y: false,
        lighthouse: false,
        deadcode: false,
        secrets: false,
        depAudit: false,
      },
    },
  });
  assert(v.lint === "skipped");
  assert(v.typecheck === "skipped");
  assert(v.tests === "skipped");
  console.log("validators.smoke: OK");
})();
