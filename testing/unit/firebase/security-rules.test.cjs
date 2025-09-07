/* eslint-env node */
// This CJS test file intentionally uses require(); TS ESLint plugin rules do not apply to CJS here.
const fs = require("fs");
const path = require("path");
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require("@firebase/rules-unit-testing");

const RULES = fs.readFileSync(
  path.join(process.cwd(), "firestore.rules"),
  "utf8"
);

describe("Firestore security rules - multi-tenant isolation", () => {
  let testEnv;
  const projectId = "rankpilot-rules-test";

  before(async function () {
    // Require Firestore emulator for rules tests; skip when not present
    const hostEnv = process.env.FIRESTORE_EMULATOR_HOST; // e.g., localhost:8080
    if (!hostEnv) {
      console.warn(
        "[rules-test] FIRESTORE_EMULATOR_HOST not set, skipping rules tests"
      );
      this.skip();
      return;
    }
    const [host, portStr] = hostEnv.split(":");
    const port = Number(portStr || 8080);
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: { rules: RULES, host, port },
    });
  });

  after(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it("denies unauthenticated access by default", async () => {
    const unauth = testEnv.unauthenticatedContext();
    const db = unauth.firestore();
    const ref = db.collection("users").doc("u1");
    await assertFails(ref.get());
  });

  it("allows user to read their own user doc, denies others", async () => {
    const admin = await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const adb = ctx.firestore();
      await adb
        .collection("users")
        .doc("alice")
        .set({ email: "alice@example.com" });
      await adb
        .collection("users")
        .doc("bob")
        .set({ email: "bob@example.com" });
    });
    void admin; // appease linter

    const alice = testEnv.authenticatedContext("alice", {});
    const bob = testEnv.authenticatedContext("bob", {});
    await assertSucceeds(
      alice.firestore().collection("users").doc("alice").get()
    );
    await assertFails(alice.firestore().collection("users").doc("bob").get());
    await assertFails(bob.firestore().collection("users").doc("alice").get());
  });

  it("subscriptions readable by owner and team member when teamId present", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const adb = ctx.firestore();
      // Create team with owner and member bob
      await adb
        .collection("teams")
        .doc("team1")
        .set({ ownerId: "alice", memberIds: ["alice", "bob"] });
      await adb
        .collection("teams")
        .doc("team1")
        .collection("members")
        .doc("bob")
        .set({ role: "member" });
      // Subscriptions doc keyed by userId per rules
      await adb
        .collection("subscriptions")
        .doc("alice")
        .set({ userId: "alice", tier: "starter", teamId: "team1" });
    });

    const alice = testEnv.authenticatedContext("alice", {});
    const bob = testEnv.authenticatedContext("bob", {});
    const charlie = testEnv.authenticatedContext("charlie", {});
    await assertSucceeds(
      alice.firestore().collection("subscriptions").doc("alice").get()
    );
    await assertSucceeds(
      bob.firestore().collection("subscriptions").doc("alice").get()
    );
    await assertFails(
      charlie.firestore().collection("subscriptions").doc("alice").get()
    );
  });

  it("invites_index is server-only (deny client writes)", async () => {
    const alice = testEnv.authenticatedContext("alice", {});
    await assertFails(
      alice.firestore().collection("invites_index").doc("x").set({ foo: "bar" })
    );
  });
});
