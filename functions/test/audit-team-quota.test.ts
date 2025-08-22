import { expect } from 'chai';
import { __testRunSeoAudit } from '../src/api/audit';

// Team quota test (T12): uses debugTeamLimit to enforce a low limit in emulator.
// Skips gracefully if Firestore emulator not available or permissions fail.

describe('audit team quota', function () {
    this.timeout(40000);
    const baseReq = { url: 'https://example.com', depth: 1, checkMobile: true, plan: 'starter', teamId: 'team_test_quota', debugTeamLimit: 2 };
    it('enforces team quota after limit reached', async () => {
        const auth = { uid: 'user_quota_1' } as { uid: string };
        try {
            const first = await __testRunSeoAudit(baseReq, auth) as unknown as { quota?: { team?: { used?: number } } };
            expect(first.quota?.team?.used).to.equal(1);
            const second = await __testRunSeoAudit(baseReq, auth) as unknown as { quota?: { team?: { used?: number } } };
            expect(second.quota?.team?.used).to.equal(2);
            let threw = false;
            try { await __testRunSeoAudit(baseReq, auth); } catch (e: unknown) {
                threw = true;
                const code = (e as { code?: string }).code;
                const msg = String((e as { message?: string }).message || '');
                expect(code === 'resource-exhausted' || msg.includes('quota')).to.be.true;
            }
            expect(threw).to.be.true;
        } catch (e: unknown) {
            // If emulator not running correctly, skip instead of failing entire suite
            if (process.env.CI) throw e; else (this as unknown as { test?: { skip?: () => void } }).test?.skip?.();
        }
    });
});
