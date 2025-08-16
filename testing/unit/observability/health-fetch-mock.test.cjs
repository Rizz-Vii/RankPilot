const { expect } = require('chai');

// Ensure fetch mock active
if (process.env.TEST_MOCK_FETCH !== '1') {
  console.warn('TEST_MOCK_FETCH not set; skipping health-fetch-mock test.');
  describe('health fetch mock (skipped)', ()=> { it('skipped', ()=>{}); });
} else {
  describe('health fetch mock', () => {
    it('returns deterministic health payload', async () => {
      const res = await fetch('/api/health');
      const json = await res.json();
      expect(json.kpis).to.have.property('provenanceCoveragePct');
      expect(json.kpis.provenanceCoveragePct).to.equal(97);
    });
    it('returns deterministic alerts payload', async () => {
      const res = await fetch('/api/health/alerts?limit=5');
      const json = await res.json();
      expect(json.rows[0]).to.have.property('ma7Provenance');
    });
  });
}
