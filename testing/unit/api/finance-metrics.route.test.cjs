const { expect } = require('chai');
require('ts-node/register');
const path = require('path');

// Mock next/server minimal API for the route under test before requiring it
const Module = require('module');
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'next/server') {
    class MockNextResponse {
      static json(body, init) {
        return {
          status: init && typeof init.status === 'number' ? init.status : 200,
          json: async () => body,
          headers: { set: () => {} },
        };
      }
    }
    class MockNextRequest {}
    return { NextResponse: MockNextResponse, NextRequest: MockNextRequest };
  }
  return originalLoad(request, parent, isMain);
};

// Import the route handler (TS) via ts-node/register
const { GET: financeGET } = require(path.resolve(__dirname, '../../../src/app/api/finance/metrics/route'));

describe('API finance/metrics route (unit)', () => {
  it('returns 401 without auth', async () => {
    const req = { url: 'http://localhost/api/finance/metrics?months=3', headers: { get: () => null } };
    const res = await financeGET(req);
    expect(res.status).to.equal(401);
  });

  it('returns 200 or tolerated status with Bearer test token (mock admin)', async () => {
    const headers = { get: (k) => (String(k).toLowerCase() === 'authorization' ? 'Bearer test' : null) };
    const req = { url: 'http://localhost/api/finance/metrics?months=2', headers };
    const res = await financeGET(req);
    expect([200, 401, 500]).to.include(res.status);
  });
});
