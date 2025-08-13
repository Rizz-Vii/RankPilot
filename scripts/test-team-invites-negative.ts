#!/usr/bin/env ts-node
/** TEAM-01: Negative Invite Flow Tests
 * Scenarios:
 * - Non-admin/member cannot create invite (expects 403)
 * - Token reuse after acceptance fails
 * - Expired invite cannot be accepted (server returns 410)
 * - Email mismatch (logged-in email differs from invite email) blocked (403)
 * Env Requirements:
 *   TEST_OWNER_TOKEN (owner/admin user)
 *   TEST_NEWUSER_TOKEN (fresh user accepting)
 *   TEST_MEMBER_TOKEN (regular member without admin rights)
 *   TEST_ALTUSER_TOKEN (different user for mismatch scenario)
 */
import { httpReq as req, assert } from './lib/http-test-client';

async function run() {
    const owner = process.env.TEST_OWNER_TOKEN;
    const newUser = process.env.TEST_NEWUSER_TOKEN;
    const member = process.env.TEST_MEMBER_TOKEN;
    const altUser = process.env.TEST_ALTUSER_TOKEN;
    if (!owner || !newUser || !member || !altUser) { console.log('SKIP: missing one of required tokens'); return; }

    // Non-admin invite attempt
    const attemptEmail = `neg_member_${Date.now()}@example.com`;
    const nonAdminInvite = await req('POST', '/api/team/invite', { email: attemptEmail, role: 'member' }, member);
    assert(nonAdminInvite.status === 403, `Expected 403 for non-admin invite, got ${nonAdminInvite.status}`);

    // Create valid invite by owner
    const targetEmail = `neg_accept_${Date.now()}@example.com`;
    const create = await req('POST', '/api/team/invite', { email: targetEmail, role: 'member' }, owner);
    assert(create.status === 200 && create.json.inviteId && create.json.token, 'Owner create invite failed');
    const inviteId = create.json.inviteId; const token = create.json.token;

    // Accept via new user (success)
    const accept = await req('PUT', '/api/team/invite', { inviteId, token }, newUser);
    assert(accept.status === 200, `First accept failed ${accept.status}`);

    // Reuse token (should fail: invite not pending)
    const reuse = await req('PUT', '/api/team/invite', { inviteId, token }, altUser);
    // Expect 400 (Invite not pending) specifically
    assert(reuse.status === 400, `Expected 400 on token reuse, got ${reuse.status}`);

    // Expired invite scenario: create second invite then expire
    const expEmail = `expired_${Date.now()}@example.com`;
    const createExp = await req('POST', '/api/team/invite', { email: expEmail, role: 'member' }, owner);
    assert(createExp.status === 200, 'Failed to create invite for expiry');
    const expId = createExp.json.inviteId; const expToken = createExp.json.token;
    // Expire (PATCH helper) - need teamId; require TEAM_ID env (owner's team)
    const teamId = process.env.TEST_OWNER_TEAM_ID;
    if (teamId) {
        const expire = await req('PATCH', '/api/team/invite', { inviteId: expId, teamId, minutesAgo: 120 }, owner);
        assert(expire.status === 200, 'Expire helper failed');
        const acceptExpired = await req('PUT', '/api/team/invite', { inviteId: expId, token: expToken }, newUser);
        assert(acceptExpired.status === 410, `Expected 410 for expired invite got ${acceptExpired.status}`);
    } else {
        console.log('NOTE: TEST_OWNER_TEAM_ID not set, skipping expiry check');
    }

    // Email mismatch: create invite for one email but attempt with alt user whose email differs
    const mismatchEmail = `mismatch_${Date.now()}@example.com`;
    const createMismatch = await req('POST', '/api/team/invite', { email: mismatchEmail, role: 'member' }, owner);
    assert(createMismatch.status === 200, 'Create mismatch invite failed');
    const mmId = createMismatch.json.inviteId; const mmToken = createMismatch.json.token;
    const mismatchAccept = await req('PUT', '/api/team/invite', { inviteId: mmId, token: mmToken }, altUser);
    assert(mismatchAccept.status === 403, `Expected 403 mismatch got ${mismatchAccept.status}`);

    // Index backfill validation: create invite, delete index doc, then accept (should fallback scan + recreate index)
    const backfillEmail = `backfill_${Date.now()}@example.com`;
    const createBackfill = await req('POST', '/api/team/invite', { email: backfillEmail, role: 'member' }, owner);
    assert(createBackfill.status === 200, 'Create backfill invite failed');
    const bfId = createBackfill.json.inviteId; const bfToken = createBackfill.json.token;
    // Delete index doc via admin endpoint
    const delIdx = await req('DELETE', `/api/admin/invites/index?inviteId=${bfId}`, undefined, owner);
    assert(delIdx.status === 200, `Index delete failed ${delIdx.status}`);
    // Accept with new user to force scan path
    const bfAccept = await req('PUT', '/api/team/invite', { inviteId: bfId, token: bfToken }, newUser);
    assert(bfAccept.status === 200, `Backfill accept failed ${bfAccept.status}`);

    if (process.exitCode) {
        console.error('TEAM-01 negative invite tests FAILED'); process.exit(1);
    } else {
        console.log('TEAM-01 negative invite tests passed');
    }
}

run().catch(e => { console.error('TEAM-01 negative invite test error', e); process.exit(1); });
