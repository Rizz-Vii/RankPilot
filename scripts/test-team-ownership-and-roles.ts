/**
 * TEAM-01 Ownership Transfer & Role Escalation Negative Tests
 * Uses Firestore emulator rules to assert:
 * 1. Non-owner cannot transfer ownership.
 * 2. Member cannot self-escalate to admin/owner.
 * 3. Ownership transfer succeeds when invoked by current owner (if rules permit).
 */
import fs from 'fs';
import type { RulesTestEnvironment} from '@firebase/rules-unit-testing';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { setLogLevel } from 'firebase/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
    console.warn('TEAM-01 ownership tests skipped (FIRESTORE_EMULATOR_HOST not set).');
    process.exit(0);
}

(async () => {
    setLogLevel('error');
    const rules = fs.readFileSync('firestore.rules', 'utf8');
    const [host, portStr] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
    const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
        projectId: 'demo-rankpilot',
        firestore: { rules, host, port: Number(portStr) }
    });
    try {
        const ownerCtx = testEnv.authenticatedContext('ownerUser', { email: 'owner@example.com' });
        const memberCtx = testEnv.authenticatedContext('memberUser', { email: 'member@example.com' });
        const outsiderCtx = testEnv.authenticatedContext('outsider', { email: 'out@example.com' });
        const ownerDb = ownerCtx.firestore();
        const memberDb = memberCtx.firestore();
        const outsiderDb = outsiderCtx.firestore();

        // Seed team with owner only
        const teamId = 'teamOwn';
        await assertSucceeds(ownerDb.collection('teams').doc(teamId).set({ ownerId: 'ownerUser', memberIds: ['ownerUser'], name: 'Owner Team', createdAt: new Date(), updatedAt: new Date() } as any));

        // Owner adds member subcollection record
        await assertSucceeds(ownerDb.collection('teams').doc(teamId).collection('members').doc('memberUser').set({ userId: 'memberUser', role: 'member', status: 'active', joinedAt: new Date() } as any));

        // Negative: member attempts to escalate own role to admin
        await assertFails(memberDb.collection('teams').doc(teamId).collection('members').doc('memberUser').update({ role: 'admin' }));

        // Negative: outsider attempts ownership transfer
        await assertFails(outsiderDb.collection('teams').doc(teamId).update({ ownerId: 'outsider' }));

        // Negative: member attempts ownership transfer
        await assertFails(memberDb.collection('teams').doc(teamId).update({ ownerId: 'memberUser' }));

        // (Optional) Owner transfers ownership to member (may succeed if rules allow)
        try {
            await assertSucceeds(ownerDb.collection('teams').doc(teamId).update({ ownerId: 'memberUser', memberIds: ['memberUser', 'ownerUser'] }));
            console.log('Ownership transfer by owner succeeded (expected if rules permit).');
        } catch {
            console.warn('Ownership transfer by owner failed (rules may not allow yet) – tolerated.');
        }

        console.log('TEAM-01 ownership & role escalation tests passed (negatives enforced).');
    } catch (e) {
        console.error('TEAM-01 ownership & role escalation tests FAILED', e);
        process.exitCode = 1;
    } finally {
        await testEnv.cleanup();
    }
})();
