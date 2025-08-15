// Audit callable concurrency & quota/fallback scenarios (T13 enhancement)
require('ts-node/register/transpile-only');
const { expect } = require('chai');
const Module = require('module');
const path = require('path');
const originalLoad = Module._load;

// Stubs for firebase functions & admin to avoid real initialization
Module._load = function(request, parent, isMain){
  if (request === 'firebase-functions/v2/https') {
    class HttpsError extends Error { constructor(code, message){ super(message); this.code = code; } }
    const onCall = (_opts, handler) => (ctx) => handler(ctx);
    return { HttpsError, onCall };
  }
  if (request === 'firebase-admin/app') {
    return { getApps: () => [], initializeApp: () => ({}) };
  }
  if (request === 'firebase-admin/firestore') {
    const FieldValue = { serverTimestamp: () => new Date(), increment: (n) => ({ __inc: n }) };
    function fakeSnap(data){ return { exists: !!data, data: () => data }; }
    const store = new Map();
    const db = {
      collection: (name) => ({
        doc: (id) => ({
          collection: (sub) => ({ where: () => ({ orderBy: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }) }), add: async () => ({ id: 'x'}) }),
          set: async () => {},
          get: async () => fakeSnap(store.get(`${name}/${id}`)),
        })
      }),
      runTransaction: async (fn) => fn({ get: async () => fakeSnap(null), set: () => {} })
    };
    return { getFirestore: () => db, FieldValue };
  }
  if (request.endsWith('/ai/genkit')) {
    return { getAI: () => ({ generate: async () => ({ text: () => JSON.stringify({ overallScore: 75, issues: { critical: [], major: [], minor: [] }, recommendations: [], performanceMetrics: {} }) }) }) };
  }
  return originalLoad(request, parent, isMain);
};

const auditPath = path.resolve(__dirname, '../../../functions/src/api/audit.ts');

function purge(p){ try { delete require.cache[require.resolve(p)]; } catch {} }

describe('audit callable concurrency & quota (T13)', () => {
  it('handles 10 parallel audit calls successfully', async () => {
    purge(auditPath);
    global.fetch = async (url) => ({ ok: true, text: async () => '<html><title>Test</title><meta name="description" content="d"><h1>H1</h1></html>' });
    const { __testRunSeoAudit } = require(auditPath);
    const N = 10;
    const results = await Promise.all(Array.from({ length: N }, (_, i) => __testRunSeoAudit({ url: `https://example.com/page${i}`, depth: 1 }, { uid: 'user1' })));
    expect(results.length).to.equal(N);
    results.forEach(r => {
      expect(r).to.have.property('overallScore');
      expect(r).to.have.property('items');
    });
  });

  it('enforces per-user quota (plan free) and returns error on exceed', async () => {
    purge(auditPath);
    global.fetch = async () => ({ ok: true, text: async () => '<html><title>Test</title><meta name="description" content="d"><h1>H1</h1></html>' });
    const { __testRunSeoAudit } = require(auditPath);
    const limit = 5; // free plan defined in code
    let threw = 0;
    for (let i=0;i<limit+1;i++) {
      try { await __testRunSeoAudit({ url: `https://quota.com/${i}`, depth: 1, plan: 'free' }, { uid: 'userQuota' }); } catch (e) { threw++; }
    }
    expect(threw).to.equal(1);
  });
});
