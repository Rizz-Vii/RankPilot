import { expect } from "chai";
import {
  normalizeUserAccess,
  type UserAccess,
} from "../../../src/lib/access-control";

describe("normalizeUserAccess", () => {
  it("maps legacy subscriptionTier=admin to role=admin and tier=enterprise", () => {
    const ua: UserAccess = normalizeUserAccess({
      subscriptionTier: "admin",
      role: "user",
      subscriptionStatus: "active",
    });
    expect(ua.role).to.equal("admin");
    expect(ua.tier).to.equal("enterprise");
  });

  it("elevates admin role to enterprise tier even if stored lower", () => {
    const ua: UserAccess = normalizeUserAccess({
      role: "admin",
      subscriptionTier: "starter",
      subscriptionStatus: "active",
    });
    expect(ua.role).to.equal("admin");
    expect(ua.tier).to.equal("enterprise");
  });

  it("coerces invalid role values to 'user' and defaults unknown tier to 'free'", () => {
    // role misused as 'enterprise' should coerce to 'user'; unknown tier -> free
    const ua: UserAccess = normalizeUserAccess({
      role: "enterprise" as unknown as string,
      subscriptionTier: "unknown" as unknown as string,
      subscriptionStatus: "active",
    });
    expect(ua.role).to.equal("user");
    expect(ua.tier).to.equal("free");
  });
});
