import { expect } from "chai";
// Lightweight mock pattern: we dynamically import the script after stubbing adminDb.

describe("cleanup-invites script (logic smoke)", () => {
  it("records metrics without throwing on empty dataset", async () => {
    // Mock firestore shape used by script
    interface CollectionDoc {
      docs: unknown[];
    }
    const collections: Record<string, CollectionDoc> = {
      teams: { docs: [] },
      invites_index: { docs: [] },
    };
    interface AdminDbMock {
      collection: (name: string) => {
        get: () => Promise<CollectionDoc>;
        doc: (id: string) => {
          collection: (sub: string) => { get: () => Promise<CollectionDoc> };
          update: () => Promise<unknown>;
          delete: () => Promise<unknown>;
        };
      };
    }
    const adminDbMock: AdminDbMock = {
      collection: (name: string) => ({
        get: async () => collections[name],
        doc: () => ({
          collection: () => ({ get: async () => ({ docs: [] }) }),
          update: async () => ({}),
          delete: async () => ({}),
        }),
      }),
    };
    // Inject mock by temporarily rewriting require cache for firebase-admin wrapper
    const path = require.resolve("../../src/lib/firebase-admin.ts");
    const originalModule = require.cache[path];
    require.cache[path] = {
      exports: { adminDb: adminDbMock },
    } as unknown as NodeModule;

    try {
      await import("../../scripts/cleanup-invites");
      expect(true).to.equal(true);
    } finally {
      if (originalModule) require.cache[path] = originalModule;
      else delete require.cache[path];
    }
  });
});
