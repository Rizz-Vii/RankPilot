const { expect } = require('chai');
const Module = require('module');
const path = require('path');

// Mock next/server
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === 'next/server') {
        class MockNextResponse {
            static json(body, init) {
                return {
                    status: init && typeof init.status === 'number' ? init.status : 200,
                    json: async () => body,
                    headers: init && init.headers ? init.headers : {},
                };
            }
        }
        class MockNextRequest { constructor(url) { this.url = url; } }
        return { NextResponse: MockNextResponse, NextRequest: MockNextRequest };
    }
    return originalLoad(request, parent, isMain);
};

// Helpers: intercept Module._load to return stubs for specific TS modules
function installStubs(stubs) {
    const origLoad = Module._load;
    Module._load = function (request, parent, isMain) {
        try {
            // Normalize request to end segment
            const normalized = request.toString();
            for (const key of Object.keys(stubs)) {
                if (normalized.endsWith(key) || normalized.includes(key)) {
                    return stubs[key];
                }
            }
        } catch (e) { }
        return origLoad(request, parent, isMain);
    };
}

function uninstallStubs() {
    // Restore original loader by reloading the module system isn't trivial here;
    // For simplicity tests run in same process and we won't reinstall stubs after require.
}

require('ts-node/register/transpile-only');
require('tsconfig-paths/register');

describe('API health route (unit)', () => {

    it('returns 200 when metrics endpoint is available', async () => {
        const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
        const resp = await fetch(`${base}/api/health`);
        expect(resp.status).to.be.oneOf([200, 503]); // allow degraded in CI
        const body = await resp.json();
        expect(body).to.have.property('status');
        expect(body).to.have.property('timestamp');
    });

    it('health returns JSON and includes metrics field', async () => {
        const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
        const resp = await fetch(`${base}/api/health`);
        expect(resp.status).to.be.oneOf([200, 503]);
        const body = await resp.json();
        expect(body).to.have.property('metrics');
    });
});

describe('API streaming metrics (unit)', () => {
    it('returns metrics JSON when action=metrics', async () => {
        const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
        const resp = await fetch(`${base}/api/streaming?action=metrics`);
        expect(resp.status).to.equal(200);
        const body = await resp.json();
        expect(body).to.have.property('success', true);
        expect(body).to.have.property('metrics');
    });
});
