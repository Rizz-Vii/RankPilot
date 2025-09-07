const assert = require("assert");
process.env.PB_BRAIN_FORCE_SKIP_BIN = "1";
const tr = require("../../dist/brain/scripts/brain/execution/toolRegistry");
const cfg = { tools: { typecheck: true, eslint: true, playwright: true } };
const rs = tr.getRunnersFor("frontend", cfg);
(async () => {
  for (const r of rs) {
    if (
      ["TypecheckRunner", "ESLintRunner", "PlaywrightRunner"].includes(r.name)
    ) {
      const out = await r.run({}, { cfg });
      assert(
        out && out.note && out.note.startsWith("skipped"),
        "runner did not skip"
      );
    }
  }
  console.log("runners.skip: OK");
})();
