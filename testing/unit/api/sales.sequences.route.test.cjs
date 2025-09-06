const { expect } = require('chai');
const sinon = require('sinon');
const Module = require('module');
const path = require('path');

// Mock next/server for API handlers
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === 'next/server') {
        class MockNextResponse {
            static json(body, init) {
                return { status: init && typeof init.status === 'number' ? init.status : 200, json: async () => body };
            }
        }
        class MockNextRequest { }
        return { NextResponse: MockNextResponse, NextRequest: MockNextRequest };
    }
    return originalLoad(request, parent, isMain);
};

require('ts-node/register/transpile-only');
require('tsconfig-paths/register');

// Load handlers
const salesRoute = require(path.resolve(__dirname, '../../../src/app/api/sales/sequences/route.ts'));
const runRoute = require(path.resolve(__dirname, '../../../src/app/api/sales/sequences/run/route.ts'));

const { adminAuth, adminDb } = require('@/lib/firebase-admin');

describe('API sales/sequences route (unit)', () => {
    afterEach(() => sinon.restore());

    function makeReq(method, body, headers) {
        return {
            method,
            headers: new Map([['authorization', 'Bearer FAKE'], ...(headers || [])]),
            json: async () => body || {},
            url: 'http://localhost/api/sales/sequences' + (method === 'DELETE' && body && body.query ? ('?' + body.query) : ''),
        };
    }

    function stubAuth(uid = 'u1') {
        sinon.stub(adminAuth, 'verifyIdToken').resolves({ uid });
    }

    function stubUserAccess(tier = 'agency', role = 'user') {
        const data = { subscriptionTier: tier, role, subscriptionStatus: 'active' };
        sinon.stub(adminDb, 'collection').callsFake((name) => {
            if (name === 'users') {
                return { doc: () => ({ get: async () => ({ exists: true, data: () => data }) }) };
            }
            if (name === 'teams') {
                const store = [];
                return {
                    where: () => ({ limit: () => ({ get: async () => ({ empty: false, docs: [{ id: 't1', data: () => ({ planTier: tier, ownerId: 'u1' }) }] }) }) }),
                    doc: (id) => ({
                        id,
                        collection: (sub) => {
                            if (sub === 'members') {
                                return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ role: 'admin' }) }) }) };
                            }
                            if (sub === 'salesSequences') {
                                return {
                                    orderBy: () => ({ limit: () => ({ get: async () => ({ docs: store.map((x) => ({ id: x.id, data: () => x })) }) }) }),
                                    add: async (doc) => { store.push({ id: 's1', ...doc }); return { id: 's1' }; },
                                    doc: () => ({ set: async () => ({}), delete: async () => ({}) })
                                };
                            }
                            if (sub === 'salesExecutions') {
                                return { add: async () => ({ id: 'e1', set: async () => ({}) }) };
                            }
                            return {};
                        }
                    })
                };
            }
            return {};
        });
    }

    it('denies access without feature', async () => {
        stubAuth();
        // user with free tier
        sinon.stub(adminDb, 'collection').callsFake((name) => {
            if (name === 'users') {
                return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ subscriptionTier: 'free', role: 'user', subscriptionStatus: 'active' }) }) }) };
            }
            if (name === 'teams') {
                return { where: () => ({ limit: () => ({ get: async () => ({ empty: false, docs: [{ id: 't1', data: () => ({ planTier: 'free', ownerId: 'u1' }) }] }) }) }) };
            }
            return {};
        });
        const res = await salesRoute.GET(makeReq('GET'));
        expect(res.status).to.equal(403);
    });

    it('creates a sequence (admin required)', async () => {
        stubAuth();
        stubUserAccess();
        const res = await salesRoute.POST(makeReq('POST', { name: 'Seq A', steps: [{ id: 'st1', type: 'call', delayMinutes: 0 }], targets: [{ id: 'c1', phone: '+15555550123' }] }));
        expect(res.status).to.equal(201);
        const body = await res.json();
        expect(body).to.have.property('id');
    });

    it('runs a sequence (test mode)', async () => {
        stubAuth();
        // For run, stub fetch to call telephony endpoint and return fake SID
        const fetchStub = sinon.stub(global, 'fetch').resolves({ ok: true, json: async () => ({ callSid: 'CA_TEST_1' }) });
        // comprehensive stub for user+team+sequence+exec
        const seqDoc = { name: 'S', createdAt: new Date(), createdBy: 'u1', status: 'draft', steps: [{ id: 'st1', type: 'call', delayMinutes: 0 }], targets: [{ id: 'c1', phone: '+1555' }] };
        sinon.stub(adminDb, 'collection').callsFake((name) => {
            if (name === 'users') {
                return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ subscriptionTier: 'agency', role: 'user', subscriptionStatus: 'active' }) }) }) };
            }
            if (name === 'teams') {
                return {
                    where: () => ({ limit: () => ({ get: async () => ({ empty: false, docs: [{ id: 't1', data: () => ({ planTier: 'agency', ownerId: 'u1' }) }] }) }) }),
                    doc: () => ({
                        id: 't1',
                        collection: (sub) => {
                            if (sub === 'members') { return { doc: () => ({ get: async () => ({ exists: true, data: () => ({ role: 'admin' }) }) }) }; }
                            if (sub === 'salesSequences') { return { doc: () => ({ get: async () => ({ exists: true, data: () => seqDoc }) }) }; }
                            if (sub === 'salesExecutions') { return { add: async () => ({ id: 'e1', set: async () => ({}) }) }; }
                            return {};
                        }
                    })
                };
            }
            return {};
        });

        const res = await runRoute.POST({
            headers: new Map([['authorization', 'Bearer FAKE']]),
            json: async () => ({ sequenceId: 's1', testMode: true }),
            url: 'http://localhost/api/sales/sequences/run'
        });
        expect(res.status).to.equal(200);
        const body = await res.json();
        expect(body).to.have.property('executionId');
        expect(body).to.have.property('attempted');
        fetchStub.restore();
    });
});
