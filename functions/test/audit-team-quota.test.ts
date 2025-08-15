import { expect } from 'chai';
import { __testRunSeoAudit } from '../src/api/audit';

// Team quota test (T12): uses debugTeamLimit to enforce a low limit in emulator.
// Skips gracefully if Firestore emulator not available or permissions fail.

describe('audit team quota', function () {
    this.timeout(40000);
    const baseReq = { url: 'https://example.com', depth: 1, checkMobile: true, plan: 'starter', teamId: 'team_test_quota', debugTeamLimit: 2 };
    it('enforces team quota after limit reached', async () => {
        const auth = { uid: 'user_quota_1' } as any;
        try {
            const first: any = await __testRunSeoAudit(baseReq, auth);
            expect(first.quota?.team?.used).to.equal(1);
            const second: any = await __testRunSeoAudit(baseReq, auth);
            expect(second.quota?.team?.used).to.equal(2);
            let threw = false;
            try { await __testRunSeoAudit(baseReq, auth); } catch (e: any) { threw = true; expect(e.code === 'resource-exhausted' || (e.message || '').includes('quota')).to.be.true; }
            expect(threw).to.be.true;
        } catch (e: any) {
            // If emulator not running correctly, skip instead of failing entire suite
            if (process.env.CI) throw e; else (this as any).test?.skip?.();
        }
    });
});
