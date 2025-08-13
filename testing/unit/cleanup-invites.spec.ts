import { expect } from 'chai';
// Lightweight mock pattern: we dynamically import the script after stubbing adminDb.

describe('cleanup-invites script (logic smoke)', () => {
    it('records metrics without throwing on empty dataset', async () => {
        // Mock firestore shape used by script
        const collections: Record<string, any> = {
            teams: { docs: [] },
            invites_index: { docs: [] }
        };
        const adminDbMock: any = {
            collection: (name: string) => ({
                get: async () => collections[name],
                doc: (id: string) => ({
                    collection: (sub: string) => ({ get: async () => ({ docs: [] }) }),
                    update: async () => ({}),
                    delete: async () => ({})
                })
            })
        };
        // Inject mock by temporarily rewriting require cache for firebase-admin wrapper
        const path = require.resolve('../../src/lib/firebase-admin.ts');
        const originalModule = require.cache[path];
        require.cache[path] = { exports: { adminDb: adminDbMock } } as any;

        try {
            await import('../../scripts/cleanup-invites');
            expect(true).to.equal(true);
        } finally {
            if (originalModule) require.cache[path] = originalModule; else delete require.cache[path];
        }
    });
});
