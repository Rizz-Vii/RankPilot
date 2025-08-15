const { expect } = require('chai');
const { preferredMA } = require('../../../../src/app/(app)/admin/observability/page');

describe('smoothing precedence rules', () => {
  it('prefers server MA7 over computed', () => {
    const computed = [10, 9, 8];
    const serverVal = 7.5;
    expect(preferredMA(computed, serverVal)).to.equal(7.5);
  });

  it('uses first computed MA7 when no server value', () => {
    const computed = [12.34, 11];
    expect(preferredMA(computed, null)).to.equal(12.34);
  });

  it('returns undefined with no inputs', () => {
    expect(preferredMA([], null)).to.equal(undefined);
    expect(preferredMA(undefined, null)).to.equal(undefined);
  });

  it('ignores server MA7 if NaN', () => {
    const computed = [15];
    expect(preferredMA(computed, 'invalid')).to.equal(15);
  });
});
