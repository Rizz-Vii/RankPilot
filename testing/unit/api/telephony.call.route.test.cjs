const { expect } = require('chai');
const Module = require('module');
const path = require('path');

// Mock next/server Response for route under test before requiring it
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === 'next/server') {
        class MockNextResponse {
            static json(body, init) {
                return {
                    status: init && typeof init.status === 'number' ? init.status : 200,
                    json: async () => body,
                    headers: { set: () => { } },
                };
            }
        }
        class MockNextRequest { }
        return { NextResponse: MockNextResponse, NextRequest: MockNextRequest };
    }
    return originalLoad(request, parent, isMain);
};

require('ts-node/register/transpile-only');
require('tsconfig-paths/register');

const { POST: callPOST } = require(path.resolve(__dirname, '../../../src/app/api/telephony/call/route.ts'));

function withEnv(env, fn) {
    const prev = {};
    for (const k of Object.keys(env)) { prev[k] = process.env[k]; process.env[k] = env[k]; }
    const done = () => { for (const k of Object.keys(env)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } };
    try { return Promise.resolve(fn()).finally(done); } catch (e) { done(); throw e; }
}

describe('API telephony/call route (unit)', () => {
    it('returns 400 when "to" is missing', async () => {
        const req = { json: async () => ({}) };
        const res = await callPOST(req);
        expect(res.status).to.equal(400);
        const body = await res.json();
        expect(body).to.have.property('error', 'to_required');
    });

    it('simulates a call in test mode when not configured', async () => {
        return withEnv({ TWILIO_TEST_MODE: '1' }, async () => {
            const req = { json: async () => ({ to: '+15555550123' }) };
            const res = await callPOST(req);
            expect(res.status).to.equal(200);
            const body = await res.json();
            expect(body).to.have.property('test', true);
            expect(body).to.have.property('callSid');
        });
    });

    it('returns 500 when not in test mode and missing client/from', async () => {
        return withEnv({ TWILIO_TEST_MODE: '' }, async () => {
            const req = { json: async () => ({ to: '+15555550123' }) };
            const res = await callPOST(req);
            expect(res.status).to.equal(500);
            const body = await res.json();
            expect(body).to.have.property('error', 'telephony_unavailable');
        });
    });
});
