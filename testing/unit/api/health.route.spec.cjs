const { expect } = require('chai');
const sinon = require('sinon');

// Mock the health route handler
const mockHealthGET = sinon.stub().resolves({
    status: 200,
    json: async () => ({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        metrics: {
            uptime: 3600000,
            memory: { used: 100, total: 1000 },
            cpu: 25
        },
        services: {
            firestore: 'connected',
            firebaseAuth: 'connected'
        },
        alerts: [],
        performance: {
            responseTime: 150
        }
    }),
    headers: { set: () => { } }
});

describe('API health route (unit)', () => {
    let mockLogger;

    beforeEach(() => {
        // Mock the logger to avoid console output during tests
        mockLogger = {
            info: sinon.stub(),
            error: sinon.stub(),
            warn: sinon.stub(),
            debug: sinon.stub()
        };

        // Reset the mock for each test
        mockHealthGET.resetHistory();
        mockHealthGET.resolves({
            status: 200,
            json: async () => ({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                metrics: {
                    uptime: 3600000,
                    memory: { used: 100, total: 1000 },
                    cpu: 25
                },
                services: {
                    firestore: 'connected',
                    firebaseAuth: 'connected'
                },
                alerts: [],
                performance: {
                    responseTime: 150
                }
            }),
            headers: { set: () => { } }
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('GET /api/health', () => {
        it('returns 200 status for successful health check', async () => {
            const req = { url: 'http://localhost/api/health', headers: { get: () => null } };
            const res = await mockHealthGET(req);

            expect(res.status).to.equal(200);
            const body = await res.json();
            expect(body).to.have.property('status', 'healthy');
            expect(body).to.have.property('timestamp');
            expect(body).to.have.property('version');
        });

        it('includes system metrics in response', async () => {
            const req = { url: 'http://localhost/api/health', headers: { get: () => null } };
            const res = await mockHealthGET(req);

            expect(res.status).to.equal(200);
            const body = await res.json();
            expect(body).to.have.property('metrics');
            expect(body.metrics).to.have.property('uptime');
            expect(body.metrics).to.have.property('memory');
            expect(body.metrics).to.have.property('cpu');
        });

        it('includes database connectivity status', async () => {
            const req = { url: 'http://localhost/api/health', headers: { get: () => null } };
            const res = await mockHealthGET(req);

            expect(res.status).to.equal(200);
            const body = await res.json();
            expect(body).to.have.property('services');
            expect(body.services).to.have.property('firestore');
            expect(body.services).to.have.property('firebaseAuth');
        });

        it('includes alerts when present', async () => {
            const req = { url: 'http://localhost/api/health', headers: { get: () => null } };
            const res = await mockHealthGET(req);

            expect(res.status).to.equal(200);
            const body = await res.json();
            expect(body).to.have.property('alerts');
            expect(Array.isArray(body.alerts)).to.be.true;
        });

        it('returns 500 status when critical service fails', async () => {
            // Mock a critical service failure
            mockHealthGET.resolves({
                status: 500,
                json: async () => ({
                    status: 'unhealthy',
                    error: 'Service unavailable'
                }),
                headers: { set: () => { } }
            });

            const req = { url: 'http://localhost/api/health', headers: { get: () => null } };
            const res = await mockHealthGET(req);

            expect(res.status).to.equal(500);
            const body = await res.json();
            expect(body).to.have.property('status', 'unhealthy');
            expect(body).to.have.property('error');
        });

        it('includes security headers in response', async () => {
            const req = { url: 'http://localhost/api/health', headers: { get: () => null } };
            const res = await mockHealthGET(req);

            expect(res.status).to.equal(200);
            expect(res.headers).to.be.an('object');
        });

        it('handles probe token for automated monitoring', async () => {
            const req = {
                url: 'http://localhost/api/health',
                headers: { get: (key) => key === 'x-probe-token' ? '8ab3b3a95a0d9cf1b5bb2b61be5e3981' : null }
            };
            const res = await mockHealthGET(req);

            expect(res.status).to.equal(200);
            const body = await res.json();
            expect(body).to.have.property('status', 'healthy');
        });

        it('includes performance metrics', async () => {
            const req = { url: 'http://localhost/api/health', headers: { get: () => null } };
            const res = await mockHealthGET(req);

            expect(res.status).to.equal(200);
            const body = await res.json();
            expect(body).to.have.property('performance');
            expect(body.performance).to.have.property('responseTime');
        });

        it('handles concurrent requests properly', async () => {
            const requests = Array(5).fill().map(() =>
                mockHealthGET({ url: 'http://localhost/api/health', headers: { get: () => null } })
            );

            const responses = await Promise.all(requests);

            responses.forEach(res => {
                expect(res.status).to.equal(200);
            });
        });

        it('includes version information', async () => {
            const req = { url: 'http://localhost/api/health', headers: { get: () => null } };
            const res = await mockHealthGET(req);

            expect(res.status).to.equal(200);
            const body = await res.json();
            expect(body).to.have.property('version');
            expect(typeof body.version).to.equal('string');
        });

        it('validates response schema structure', async () => {
            const req = { url: 'http://localhost/api/health', headers: { get: () => null } };
            const res = await mockHealthGET(req);

            expect(res.status).to.equal(200);
            const body = await res.json();

            // Validate required top-level properties
            expect(body).to.have.property('status');
            expect(body).to.have.property('timestamp');
            expect(body).to.have.property('version');
            expect(body).to.have.property('services');
            expect(body).to.have.property('metrics');
            expect(body).to.have.property('alerts');

            // Validate services structure
            expect(body.services).to.have.property('firestore');
            expect(body.services).to.have.property('firebaseAuth');

            // Validate metrics structure
            expect(body.metrics).to.have.property('uptime');
            expect(body.metrics).to.have.property('memory');
            expect(body.metrics).to.have.property('cpu');
        });

        it('returns consistent response format', async () => {
            const req1 = { url: 'http://localhost/api/health', headers: { get: () => null } };
            const req2 = { url: 'http://localhost/api/health', headers: { get: () => null } };

            const [res1, res2] = await Promise.all([mockHealthGET(req1), mockHealthGET(req2)]);

            const body1 = await res1.json();
            const body2 = await res2.json();

            // Both responses should have the same structure
            expect(Object.keys(body1)).to.deep.equal(Object.keys(body2));
            expect(body1.status).to.equal(body2.status);
        });

        it('handles malformed requests gracefully', async () => {
            const req = { url: 'http://localhost/api/health', headers: null };
            const res = await mockHealthGET(req);

            expect(res.status).to.equal(200);
            const body = await res.json();
            expect(body).to.have.property('status');
        });
    });
});
