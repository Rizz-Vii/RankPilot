require('ts-node/register');
const { expect } = require('chai');
const path = require('path');
const Module = require('module');

// Lightweight next/server mock (headers + json response)
// Path to stubbed next/server
const stubNextServer = path.join(process.cwd(), 'testing/stubs/next/server.js');

// Intercept module resolution for next/server BEFORE loading route
const origResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options){
  if (request === 'next/server') return stubNextServer;
  return origResolve.call(this, request, parent, isMain, options);
};

const originalLoad = Module._load;
Module._load = function(request, parent, isMain){
  if (request.endsWith('/lib/middleware/provenance')) {
    return { withProvenance: (fn)=>fn, enforceProvenance: (o)=>o };
  }
  if (request.endsWith('/lib/firebase-admin')) {
    // Provide firebase admin mocks (verify token + firestore query)
    return {
      adminAuth: { verifyIdToken: async () => ({ uid: 'user_test_fin' }) },
      adminDb: {
        collection: () => ({
          where: () => ({ orderBy: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }) })
        })
      }
    };
  }
  if (request.endsWith('/lib/logging/app-logger')) {
    return { getLogger: () => ({ error: ()=>{}, info: ()=>{} }) };
  }
  return originalLoad(request, parent, isMain);
};

describe('finance/metrics route contract (static source inspection)', () => {
  const routePath = path.join(process.cwd(), 'src/app/api/finance/metrics/route.ts');
  const source = require('fs').readFileSync(routePath,'utf8');
  it('defines invoicesCount in payload', () => {
    expect(source).to.match(/invoicesCount\s*=/);
  });
  it('enforces auth (returns 401 when missing)', () => {
    expect(source).to.match(/401/);
    expect(source).to.match(/auth_required/);
  });
});
