import { computeEffectiveTier } from "../src/lib/access-control";
import { resolveEffectiveTier } from "../src/lib/team/team-access";

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error("Assertion failed:", msg);
    process.exitCode = 1;
  }
}

function testEffectiveTier() {
  assert(
    computeEffectiveTier("free", "starter") === "starter",
    "team higher overrides"
  );
  assert(
    computeEffectiveTier("agency", "starter") === "agency",
    "lower team does not downgrade"
  );
  assert(
    computeEffectiveTier("agency", undefined) === "agency",
    "no team leaves user tier"
  );
  assert(
    computeEffectiveTier("starter", "enterprise") === "enterprise",
    "enterprise overrides"
  );
  // Duplicate coverage via resolveEffectiveTier wrapper
  assert(
    resolveEffectiveTier("free", "starter") === "starter",
    "wrapper: higher team overrides"
  );
  assert(
    resolveEffectiveTier("agency", "starter") === "agency",
    "wrapper: lower team ignored"
  );
}

function run() {
  testEffectiveTier();
  if (process.exitCode) {
    console.error("TEAM-01 effective tier tests FAILED");
    process.exit(process.exitCode);
  } else {
    console.log("TEAM-01 effective tier tests passed");
  }
}

run();
