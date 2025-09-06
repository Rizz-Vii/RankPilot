const { expect } = require('chai');

describe('email queue payload builder', function () {
    it('builds expected payload shape from customer and appointment data', function () {
        const tools = require('../../../src/lib/voice/agent-tools');
        const apptId = 'appt-123';
        const customer = { name: 'Alice', email: 'alice@example.com', phone: '+61412345678' };
        const payload = { start: '2025-09-05T10:00:00Z' };
        const res = tools.buildEmailQueuePayload({ apptId, customer, payload });

        expect(res).to.have.property('to', customer.email);
        expect(res).to.have.property('recipients');
        expect(res.recipients).to.deep.equal({ email: customer.email, phone: customer.phone });
        expect(res).to.have.property('subject').that.contains(apptId);
        expect(res).to.have.property('body').that.contains(customer.name);
        expect(res).to.have.property('type', 'appointment_confirmation');
        expect(res).to.have.property('meta');
        expect(res.meta).to.deep.equal({ apptId });
    });
});
