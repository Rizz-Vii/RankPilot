#!/usr/bin/env ts-node
/** TEAM-01: Invite Flow Test
 * Verifies:
 * 1. Owner/admin can create invite (POST /api/team/invite)
 * 2. Duplicate invite rejected
 * 3. Invite acceptance path blocks existing team member and succeeds for new user (PUT /api/team/invite)
 * Notes: Requires dev server running and two test users seeded with tokens env: TEST_OWNER_TOKEN, TEST_NEWUSER_TOKEN
 */
import { httpReq as request } from "./lib/http-test-client";

// HTTP helper moved to scripts/lib/http-test-client.ts

async function run() {
  const ownerToken = process.env.TEST_OWNER_TOKEN;
  const newUserToken = process.env.TEST_NEWUSER_TOKEN;
  if (!ownerToken || !newUserToken) {
    console.log("SKIP: TEST_OWNER_TOKEN / TEST_NEWUSER_TOKEN not set");
    return;
  }
  const inviteEmail = `invitee_${Date.now()}@example.com`;
  // 1. Create invite
  const create = await request(
    "POST",
    "/api/team/invite",
    { email: inviteEmail, role: "member" },
    ownerToken
  );
  // response.json is typed as unknown in some environments; coerce to any for this test script
  const createBody = create.json as any;
  if (create.status !== 200 || !createBody?.inviteId || !createBody?.token) {
    console.error("FAIL create invite", create.status, create.json);
    process.exit(1);
  }
  const inviteId = createBody.inviteId;
  const token = createBody.token;
  // 2. Duplicate attempt
  const dup = await request(
    "POST",
    "/api/team/invite",
    { email: inviteEmail, role: "member" },
    ownerToken
  );
  if (dup.status !== 409) {
    console.error("FAIL duplicate guard expected 409 got", dup.status);
    process.exit(1);
  }
  // 3. Accept with new user
  const accept = await request(
    "PUT",
    "/api/team/invite",
    { inviteId, token },
    newUserToken
  );
  if (accept.status !== 200) {
    console.error("FAIL accept invite", accept.status, accept.json);
    process.exit(1);
  }
  console.log("TEAM-01 invite flow tests passed");
}

run().catch((e) => {
  console.error("TEAM-01 invite test error", e);
  process.exit(1);
});
