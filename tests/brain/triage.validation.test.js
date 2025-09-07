const {
  validateTriageParsed,
  evaluateAgentTriageOutput,
  ALLOWED_TRIAGE_ACTIONS,
} = require("../../dist/brain/scripts/brain/triage/validation.js");

function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}

expect(
  Array.isArray(ALLOWED_TRIAGE_ACTIONS) &&
    ALLOWED_TRIAGE_ACTIONS.includes("none"),
  "allowed actions includes none"
);

const valid = validateTriageParsed({ action: "none", rationale: "All clear" });
expect(valid && valid.action === "none", "valid object parses");

expect(
  validateTriageParsed({ action: "bad", rationale: "Nope" }) === null,
  "invalid action rejected"
);
expect(
  validateTriageParsed({ action: "none", rationale: "" }) === null,
  "short rationale rejected"
);

const metrics = { guardrailFailures: 0 };
const okParsed = evaluateAgentTriageOutput(
  '{"action":"none","rationale":"Looks good"}',
  metrics
);
expect(
  okParsed && metrics.guardrailFailures === 0,
  "valid JSON no failure increment"
);
const badParsed = evaluateAgentTriageOutput(
  '{"action":"bad","rationale":"Nope"}',
  metrics
);
expect(
  badParsed === null && metrics.guardrailFailures === 1,
  "bad action increments failures"
);
const shortParsed = evaluateAgentTriageOutput(
  '{"action":"none","rationale":""}',
  metrics
);
expect(
  shortParsed === null && metrics.guardrailFailures === 2,
  "short rationale increments again"
);

console.log("triage validation tests: PASS");
