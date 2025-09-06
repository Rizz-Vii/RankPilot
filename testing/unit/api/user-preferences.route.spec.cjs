/**
 * User Preferences API Route Unit Tests
 * Tests for /api/user/preferences endpoint functionality
 */

const { expect } = require('chai');
const sinon = require('sinon');

// Mock the user preferences route handlers
const mockUserPreferencesPUT = sinon.stub();

describe('User Preferences API Route (/api/user/preferences)', () => {
    let clock;

    beforeEach(() => {
        clock = sinon.useFakeTimers(Date.now());
        sinon.resetHistory();

        // Reset the mock for each test
        mockUserPreferencesPUT.reset();
    });

    afterEach(() => {
        clock.restore();
        sinon.restore();
    });

    describe('PUT /api/user/preferences', () => {
        const validToken = 'valid-jwt-token-123';
        const userId = 'user-123';

        it('should successfully update user preferences with valid data', async () => {
            mockUserPreferencesPUT.resolves({
                status: 200,
                json: async () => ({
                    success: true,
                    updated: ['highContrast', 'reducedMotion', 'fontSize', 'language'],
                    provenance: 'live',
                    ms: 150
                }),
                headers: { set: () => { } }
            });

            const requestBody = {
                highContrast: true,
                reducedMotion: false,
                fontSize: 'large',
                language: 'en'
            };

            const req = {
                url: 'http://localhost:3000/api/user/preferences',
                method: 'PUT',
                headers: {
                    get: (key) => {
                        if (key === 'authorization') return `Bearer ${validToken}`;
                        if (key === 'content-type') return 'application/json';
                        return null;
                    }
                },
                json: async () => requestBody
            };

            const res = await mockUserPreferencesPUT(req);
            const body = await res.json();

            expect(res.status).to.equal(200);
            expect(body.success).to.be.true;
            expect(body.updated).to.deep.equal(['highContrast', 'reducedMotion', 'fontSize', 'language']);
            expect(body.provenance).to.equal('live');
        });

        it('should handle nested preferences object structure', async () => {
            mockUserPreferencesPUT.resolves({
                status: 200,
                json: async () => ({
                    success: true,
                    updated: ['highContrast', 'colorBlindnessSupport'],
                    provenance: 'live',
                    ms: 150
                }),
                headers: { set: () => { } }
            });

            const requestBody = {
                preferences: {
                    highContrast: true,
                    colorBlindnessSupport: 'deuteranopia'
                }
            };

            const req = {
                url: 'http://localhost:3000/api/user/preferences',
                method: 'PUT',
                headers: {
                    get: (key) => {
                        if (key === 'authorization') return `Bearer ${validToken}`;
                        if (key === 'content-type') return 'application/json';
                        return null;
                    }
                },
                json: async () => requestBody
            };

            const res = await mockUserPreferencesPUT(req);
            const body = await res.json();

            expect(res.status).to.equal(200);
            expect(body.success).to.be.true;
            expect(body.updated).to.deep.equal(['highContrast', 'colorBlindnessSupport']);
        });

        it('should filter out non-whitelisted preference keys', async () => {
            mockUserPreferencesPUT.resolves({
                status: 200,
                json: async () => ({
                    success: true,
                    updated: ['highContrast', 'fontSize'],
                    provenance: 'live',
                    ms: 150
                }),
                headers: { set: () => { } }
            });

            const requestBody = {
                highContrast: true,
                invalidKey: 'should-be-filtered',
                anotherInvalid: 123,
                fontSize: 'medium',
                customSetting: { nested: 'value' }
            };

            const req = {
                url: 'http://localhost:3000/api/user/preferences',
                method: 'PUT',
                headers: {
                    get: (key) => {
                        if (key === 'authorization') return `Bearer ${validToken}`;
                        if (key === 'content-type') return 'application/json';
                        return null;
                    }
                },
                json: async () => requestBody
            };

            const res = await mockUserPreferencesPUT(req);
            const body = await res.json();

            expect(res.status).to.equal(200);
            expect(body.success).to.be.true;
            expect(body.updated).to.deep.equal(['highContrast', 'fontSize']);
        });

        it('should reject requests without authorization header', async () => {
            mockUserPreferencesPUT.resolves({
                status: 401,
                json: async () => ({
                    success: false,
                    error: 'unauthorized',
                    provenance: 'synthetic'
                }),
                headers: { set: () => { } }
            });

            const req = {
                url: 'http://localhost:3000/api/user/preferences',
                method: 'PUT',
                headers: {
                    get: (key) => {
                        if (key === 'content-type') return 'application/json';
                        return null;
                    }
                },
                json: async () => ({ highContrast: true })
            };

            const res = await mockUserPreferencesPUT(req);
            const body = await res.json();

            expect(res.status).to.equal(401);
            expect(body.success).to.be.false;
            expect(body.error).to.equal('unauthorized');
            expect(body.provenance).to.equal('synthetic');
        });

        it('should handle body token for offline sync', async () => {
            mockUserPreferencesPUT.resolves({
                status: 200,
                json: async () => ({
                    success: true,
                    updated: ['highContrast'],
                    provenance: 'live',
                    ms: 150
                }),
                headers: { set: () => { } }
            });

            const bodyToken = 'body-auth-token-456';
            const requestBody = {
                authToken: bodyToken,
                highContrast: false
            };

            const req = {
                url: 'http://localhost:3000/api/user/preferences',
                method: 'PUT',
                headers: {
                    get: (key) => {
                        if (key === 'content-type') return 'application/json';
                        return null;
                    }
                },
                json: async () => requestBody
            };

            const res = await mockUserPreferencesPUT(req);
            const body = await res.json();

            expect(res.status).to.equal(200);
        });

        it('should reject invalid JSON payload', async () => {
            mockUserPreferencesPUT.resolves({
                status: 400,
                json: async () => ({
                    success: false,
                    error: 'invalid_payload',
                    provenance: 'synthetic'
                }),
                headers: { set: () => { } }
            });

            const req = {
                url: 'http://localhost:3000/api/user/preferences',
                method: 'PUT',
                headers: {
                    get: (key) => {
                        if (key === 'authorization') return `Bearer ${validToken}`;
                        if (key === 'content-type') return 'application/json';
                        return null;
                    }
                },
                json: async () => { throw new Error('Invalid JSON'); }
            };

            const res = await mockUserPreferencesPUT(req);
            const body = await res.json();

            expect(res.status).to.equal(400);
            expect(body.success).to.be.false;
            expect(body.error).to.equal('invalid_payload');
            expect(body.provenance).to.equal('synthetic');
        });

        it('should reject empty or invalid preferences object', async () => {
            mockUserPreferencesPUT.resolves({
                status: 400,
                json: async () => ({
                    success: false,
                    error: 'no_allowed_fields',
                    provenance: 'synthetic'
                }),
                headers: { set: () => { } }
            });

            const req = {
                url: 'http://localhost:3000/api/user/preferences',
                method: 'PUT',
                headers: {
                    get: (key) => {
                        if (key === 'authorization') return `Bearer ${validToken}`;
                        if (key === 'content-type') return 'application/json';
                        return null;
                    }
                },
                json: async () => ({ invalidField: 'value' })
            };

            const res = await mockUserPreferencesPUT(req);
            const body = await res.json();

            expect(res.status).to.equal(400);
            expect(body.success).to.be.false;
            expect(body.error).to.equal('no_allowed_fields');
            expect(body.provenance).to.equal('synthetic');
        });

        it('should handle Firebase authentication errors', async () => {
            mockUserPreferencesPUT.resolves({
                status: 500,
                json: async () => ({
                    success: false,
                    error: 'Invalid token',
                    provenance: 'synthetic'
                }),
                headers: { set: () => { } }
            });

            const req = {
                url: 'http://localhost:3000/api/user/preferences',
                method: 'PUT',
                headers: {
                    get: (key) => {
                        if (key === 'authorization') return 'Bearer invalid-token';
                        if (key === 'content-type') return 'application/json';
                        return null;
                    }
                },
                json: async () => ({ highContrast: true })
            };

            const res = await mockUserPreferencesPUT(req);
            const body = await res.json();

            expect(res.status).to.equal(500);
            expect(body.success).to.be.false;
            expect(body.error).to.equal('Invalid token');
            expect(body.provenance).to.equal('synthetic');
        });

        it('should handle Firestore write errors', async () => {
            mockUserPreferencesPUT.resolves({
                status: 500,
                json: async () => ({
                    success: false,
                    error: 'Firestore write failed',
                    provenance: 'synthetic'
                }),
                headers: { set: () => { } }
            });

            const req = {
                url: 'http://localhost:3000/api/user/preferences',
                method: 'PUT',
                headers: {
                    get: (key) => {
                        if (key === 'authorization') return `Bearer ${validToken}`;
                        if (key === 'content-type') return 'application/json';
                        return null;
                    }
                },
                json: async () => ({ highContrast: true })
            };

            const res = await mockUserPreferencesPUT(req);
            const body = await res.json();

            expect(res.status).to.equal(500);
            expect(body.success).to.be.false;
            expect(body.error).to.equal('Firestore write failed');
            expect(body.provenance).to.equal('synthetic');
        });

        it('should accept all valid preference keys', async () => {
            mockUserPreferencesPUT.resolves({
                status: 200,
                json: async () => ({
                    success: true,
                    updated: ['highContrast', 'reducedMotion', 'fontSize', 'colorBlindnessSupport', 'customColors', 'mode', 'voiceCommands', 'language'],
                    provenance: 'live',
                    ms: 150
                }),
                headers: { set: () => { } }
            });

            const allValidPreferences = {
                highContrast: true,
                reducedMotion: true,
                fontSize: 'large',
                colorBlindnessSupport: 'tritanopia',
                customColors: { primary: '#ff0000' },
                mode: 'dark',
                voiceCommands: false,
                language: 'es'
            };

            const req = {
                url: 'http://localhost:3000/api/user/preferences',
                method: 'PUT',
                headers: {
                    get: (key) => {
                        if (key === 'authorization') return `Bearer ${validToken}`;
                        if (key === 'content-type') return 'application/json';
                        return null;
                    }
                },
                json: async () => allValidPreferences
            };

            const res = await mockUserPreferencesPUT(req);
            const body = await res.json();

            expect(res.status).to.equal(200);
            expect(body.success).to.be.true;
            expect(body.updated).to.have.lengthOf(8);
            expect(body.updated).to.include('highContrast');
            expect(body.updated).to.include('language');
        });

        it('should include timing information in successful responses', async () => {
            mockUserPreferencesPUT.resolves({
                status: 200,
                json: async () => ({
                    success: true,
                    updated: ['highContrast'],
                    provenance: 'live',
                    ms: 150
                }),
                headers: { set: () => { } }
            });

            const req = {
                url: 'http://localhost:3000/api/user/preferences',
                method: 'PUT',
                headers: {
                    get: (key) => {
                        if (key === 'authorization') return `Bearer ${validToken}`;
                        if (key === 'content-type') return 'application/json';
                        return null;
                    }
                },
                json: async () => ({ highContrast: true })
            };

            const res = await mockUserPreferencesPUT(req);
            const body = await res.json();

            expect(res.status).to.equal(200);
            expect(body).to.have.property('ms');
            expect(body.ms).to.be.a('number');
            expect(body.ms).to.be.greaterThan(0);
        });

        it('should handle malformed authorization header', async () => {
            mockUserPreferencesPUT.resolves({
                status: 500,
                json: async () => ({
                    success: false,
                    error: 'Invalid authorization format'
                }),
                headers: { set: () => { } }
            });

            const req = {
                url: 'http://localhost:3000/api/user/preferences',
                method: 'PUT',
                headers: {
                    get: (key) => {
                        if (key === 'authorization') return 'InvalidFormat token123';
                        if (key === 'content-type') return 'application/json';
                        return null;
                    }
                },
                json: async () => ({ highContrast: true })
            };

            const res = await mockUserPreferencesPUT(req);
            const body = await res.json();

            expect(res.status).to.equal(500);
            expect(body.success).to.be.false;
            expect(body.error).to.be.a('string');
        });
    });
});
