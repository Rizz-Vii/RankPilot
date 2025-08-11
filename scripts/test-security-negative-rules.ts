#!/usr/bin/env tsx
/**
 * SEC-01 Negative Firestore Rule Tests
 * Verifies that cross-tenant and mismatched userId/teamId operations are denied.
 * Skips if FIRESTORE_EMULATOR_HOST not set.
 */
import fs from 'fs';
if (!process.env.FIRESTORE_EMULATOR_HOST) {
    console.warn('SEC-01 security negative tests skipped (FIRESTORE_EMULATOR_HOST not set).');
    process.exit(0);
}
import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { setLogLevel, Timestamp } from 'firebase/firestore';

(async () => {
    setLogLevel('error');
    const rules = fs.readFileSync('firestore.rules', 'utf8');
    const [host, portStr] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
    const testEnv: RulesTestEnvironment = await initializeTestEnvironment({ projectId: 'demo-rankpilot', firestore: { rules, host, port: Number(portStr) } });
    try {
        const user1 = testEnv.authenticatedContext('user1', { email: 'u1@example.com' }).firestore();
        const user2 = testEnv.authenticatedContext('user2', { email: 'u2@example.com' }).firestore();
        const admin = testEnv.authenticatedContext('adminUser', { email: 'admin@example.com' }).firestore();

        // Seed user docs (admin role for adminUser)
        await admin.collection('users').doc('user1').set({ email: 'u1@example.com', role: 'user' } as any);
        await admin.collection('users').doc('user2').set({ email: 'u2@example.com', role: 'user' } as any);
        await admin.collection('users').doc('adminUser').set({ email: 'admin@example.com', role: 'admin' } as any);

        const failures: string[] = [];

        // 1. User1 cannot read user2 profile
        try { await assertFails(user1.collection('users').doc('user2').get()); } catch { failures.push('user1 should be denied reading user2'); }

        // 2. User1 cannot create user2 doc
        try { await assertFails(user1.collection('users').doc('user2').set({ email: 'hack@example.com', role: 'user' } as any)); } catch { failures.push('user1 should be denied creating user2 doc'); }

        // 3. NeuroSEO analysis create with mismatched userId blocked
        try { await assertFails(user1.collection('neuroSeoAnalyses').doc('a1').set({ userId: 'user2', overallScore: 50, createdAt: new Date(), urls: [], hashKey: 'hk', __provenance: 'test' } as any)); } catch { failures.push('mismatched neuroSeoAnalyses create should fail'); }

        // 4. Marketing campaign create with mismatched userId blocked
        try { await assertFails(user1.collection('marketingCampaigns').doc('c1').set({ userId: 'user2', name: 'x', createdAt: new Date() } as any)); } catch { failures.push('mismatched marketingCampaigns create should fail'); }

        // 5. Team membership privilege escalation
        // Owner creates team; outsider cannot read; owner adds member; member cannot add another member
        await admin.collection('teams').doc('teamA').set({ ownerId: 'user1', memberIds: ['user1'], name: 'Alpha' } as any);
        try { await assertFails(user2.collection('teams').doc('teamA').get()); } catch { failures.push('user2 should not read team before membership'); }
        await assertSucceeds(user1.collection('teams').doc('teamA').collection('members').doc('user2').set({ userId: 'user2', role: 'member', status: 'active', joinedAt: Timestamp.now() } as any));
        // user2 (now member) cannot add another member
        try { await assertFails(user2.collection('teams').doc('teamA').collection('members').doc('userX').set({ userId: 'userX', role: 'member', status: 'active', joinedAt: Timestamp.now() } as any)); } catch { failures.push('member should not add other members'); }

        // 6. Invite creation restricted to owner/admin; member attempt denied
        try { await assertFails(user2.collection('teams').doc('teamA').collection('invites').doc('invite1').set({ email: 'new@example.com', createdAt: Timestamp.now() } as any)); } catch { failures.push('member should not create invites'); }
        await assertSucceeds(user1.collection('teams').doc('teamA').collection('invites').doc('invite2').set({ email: 'new@example.com', createdAt: Timestamp.now() } as any));
        // Owner cannot delete invite (admin only)
        try { await assertFails(user1.collection('teams').doc('teamA').collection('invites').doc('invite2').delete()); } catch { failures.push('owner deleting invite should fail (admin only)'); }

        // 7. Finance invoice read blocked for outsider (team restricted)
        // Create team with memberIds = ['user1']
        // user1 creates invoice referencing teamA (already created above)
        await assertSucceeds(user1.collection('financeInvoices').doc('inv1').set({ userId: 'user1', teamId: 'teamA', amount: 100, createdAt: Timestamp.now() } as any));
        // user2 (not member) attempts to read
        try { await assertFails(user2.collection('financeInvoices').doc('inv1').get()); } catch { failures.push('user2 should be denied reading team invoice'); }

        // 8. Presence write blocked for mismatched userId
        try { await assertFails(user1.collection('presence').doc('user2').set({ state: 'online', ts: Timestamp.now() } as any)); } catch { failures.push('user1 should not write presence for user2'); }

        // 9. User1 cannot create usage doc under users/user2/usage
        try { await assertFails(user1.collection('users').doc('user2').collection('usage').doc('u1').set({ m: 1 } as any)); } catch { failures.push('user1 should not create usage for user2'); }

        // 10. Cross-user audits access denied
        await assertSucceeds(user2.collection('audits').doc('a2').set({ userId: 'user2', createdAt: Timestamp.now() } as any));
        try { await assertFails(user1.collection('audits').doc('a2').get()); } catch { failures.push('user1 should not read user2 audit'); }

        // 11. Projects: outsider cannot read team project; member can after join
        await assertSucceeds(user1.collection('projects').doc('p1').set({ userId: 'user1', teamId: 'teamA', createdAt: Timestamp.now() } as any));
        try { await assertFails(user2.collection('projects').doc('p1').get()); } catch { failures.push('user2 should not read project before membership'); }
        // Add user2 as member via owner (already member from earlier test?) ensure membership exists
        await assertSucceeds(user1.collection('teams').doc('teamA').collection('members').doc('user2').set({ userId: 'user2', role: 'member', status: 'active', joinedAt: Timestamp.now() } as any));
        // After membership user2 still should not update project (only owner/admin)
        try { await assertFails(user2.collection('projects').doc('p1').update({ name: 'NewName' })); } catch { failures.push('user2 should not update project (not owner/admin)'); }

        // 12. Support messages restricted to admin
        try { await assertFails(user1.collection('supportMessages').doc('m1').get()); } catch { failures.push('user1 should not read supportMessages'); }
        try { await assertFails(user1.collection('supportMessages').doc('m1').set({ any: 'x' } as any)); } catch { failures.push('user1 should not create supportMessages'); }
        await assertSucceeds(admin.collection('supportMessages').doc('m1').set({ createdAt: Timestamp.now(), subject: 's' } as any));
        await assertSucceeds(admin.collection('supportMessages').doc('m1').collection('replies').doc('r1').set({ body: 'reply', createdAt: Timestamp.now() } as any));
        try { await assertFails(user1.collection('supportMessages').doc('m1').collection('replies').doc('r1').get()); } catch { failures.push('user1 should not read support reply'); }

        // 13. Team reports: only members
        try { await assertFails(user2.collection('teams').doc('teamA').collection('reports').doc('r1').set({ createdAt: Timestamp.now() } as any)); } catch { failures.push('non-member should not create team report'); }
        await assertSucceeds(user1.collection('teams').doc('teamA').collection('reports').doc('r1').set({ createdAt: Timestamp.now(), title: 'T' } as any));
        try { await assertFails(user2.collection('teams').doc('teamA').collection('reports').doc('r1').get()); } catch { failures.push('user2 should not read report before membership update'); }

        // 14. Non-owner cannot create team with mismatched ownerId
        try { await assertFails(user2.collection('teams').doc('teamB').set({ ownerId: 'user1', memberIds: ['user1'], name: 'Beta' } as any)); } catch { failures.push('user2 should not create team with different ownerId'); }

        // 15. Member cannot delete invite (admin only)
        try { await assertFails(user2.collection('teams').doc('teamA').collection('invites').doc('invite2').delete()); } catch { failures.push('member should not delete invite'); }

        // 16. Member cannot elevate role via members update
        try { await assertFails(user2.collection('teams').doc('teamA').collection('members').doc('user2').update({ role: 'admin' })); } catch { failures.push('member should not elevate own role'); }

        // 17. Cross-user subscription read denied
        await assertSucceeds(user1.collection('subscriptions').doc('user1').set({ status: 'active', tier: 'starter' } as any));
        try { await assertFails(user1.collection('subscriptions').doc('user2').get()); } catch { failures.push('user1 should be denied reading user2 subscription'); }

        if (failures.length) {
            console.error('SEC-01 negative tests FAILED', { failures });
            process.exit(1);
        } else {
            console.log('SEC-01 negative tests passed');
        }
    } finally {
        await testEnv.cleanup();
    }
})();
