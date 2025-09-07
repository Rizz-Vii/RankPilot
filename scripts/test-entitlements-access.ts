/* Minimal runtime test for entitlement metadata access helpers */
import {
  canAccessEntitlement,
  listEntitlementsForTier,
  TIER_HIERARCHY,
  type SubscriptionTier,
} from "../src/lib/access-control";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error("Assertion failed: " + msg);
}

const tiers = TIER_HIERARCHY;

for (const tier of tiers) {
  const ents = listEntitlementsForTier(tier as SubscriptionTier);
  // priority_support should appear only for agency+
  if (tier === "agency" || tier === "enterprise") {
    assert(
      ents.includes("priority_support"),
      `${tier} should include priority_support`
    );
  } else {
    assert(
      !ents.includes("priority_support"),
      `${tier} should NOT include priority_support`
    );
  }
  // dedicated_support only enterprise
  if (tier === "enterprise") {
    assert(
      ents.includes("dedicated_support"),
      `${tier} should include dedicated_support`
    );
  } else {
    assert(
      !ents.includes("dedicated_support"),
      `${tier} should NOT include dedicated_support`
    );
  }
}

// Direct canAccessEntitlement checks
assert(
  canAccessEntitlement(
    { role: "user", tier: "agency", status: "active" },
    "priority_support"
  ),
  "agency should access priority_support"
);
assert(
  !canAccessEntitlement(
    { role: "user", tier: "starter", status: "active" },
    "priority_support"
  ),
  "starter should not access priority_support"
);
assert(
  !canAccessEntitlement(
    { role: "user", tier: "agency", status: "active" },
    "nonexistent_ent"
  ),
  "unknown entitlement false"
);

console.log("PASS test-entitlements-access");
