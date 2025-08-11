import fs from 'fs';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
    console.warn('TEAM-01 Firestore rule tests skipped (FIRESTORE_EMULATOR_HOST not set).');
    process.exit(0);
}

import { initializeTestEnvironment, RulesTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { setLogLevel } from 'firebase/firestore';

(async () => {
    setLogLevel('error');
    const rules = fs.readFileSync('firestore.rules', 'utf8');
    const hostPort = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
    const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
        projectId: 'demo-rankpilot',
        firestore: { rules, host: hostPort[0], port: Number(hostPort[1]) }
    });
    try {
        const owner = testEnv.authenticatedContext('ownerUser', { email: 'owner@example.com' }).firestore();
        const member = testEnv.authenticatedContext('memberUser', { email: 'member@example.com' }).firestore();
        const outsider = testEnv.authenticatedContext('outsiderUser', { email: 'out@example.com' }).firestore();
        const usersCol = owner.collection('users');
        await usersCol.doc('ownerUser').set({ email: 'owner@example.com', role: 'user' } as any);
        await usersCol.doc('memberUser').set({ email: 'member@example.com', role: 'user' } as any);
        await usersCol.doc('outsiderUser').set({ email: 'out@example.com', role: 'user' } as any);

        const teamId = 'teamA';
        const teamsColOwner = owner.collection('teams');
        await assertSucceeds(teamsColOwner.doc(teamId).set({ ownerId: 'ownerUser', memberIds: ['ownerUser'], name: 'Alpha', createdAt: new Date(), updatedAt: new Date() } as any));
        await assertFails(outsider.collection('teams').doc(teamId).get());
        await assertSucceeds(owner.collection('teams').doc(teamId).collection('members').doc('memberUser').set({ userId: 'memberUser', role: 'member', status: 'active', joinedAt: new Date() } as any));
        await assertSucceeds(member.collection('teams').doc(teamId).get());
        await assertFails(member.collection('teams').doc(teamId).update({ name: 'New' }));
        await assertSucceeds(owner.collection('teams').doc(teamId).update({ name: 'OwnerEdit' }));
        console.log('TEAM-01 Firestore rule tests passed');
    } catch (e) {
        console.error('TEAM-01 Firestore rule tests FAILED', e);
        process.exitCode = 1;
    } finally {
        await testEnv.cleanup();
    }
})();
