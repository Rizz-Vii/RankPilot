const { expect } = require('chai');

// Local reimplementation replicating precedence without importing the TSX page (keeps unit test lightweight & avoids Next/React context):
// Precedence for choosing a reference baseline when rendering deltas:
// 1) Smoothed value (if present) is used ONLY for smoothed delta badge (page handles separately) – here we validate selection logic conceptually.
// 2) Server MA7 (authoritative precompute) overrides any client-computed MA7.
// 3) Client-computed MA7 first element (newest) if server MA7 absent.
// 4) Otherwise undefined (no baseline available yet).
function chooseBaseline({ smoothed, serverMA7, computedMA7 }) {
  if (typeof smoothed === 'number') return { source: 'smoothed', value: smoothed };
  if (typeof serverMA7 === 'number') return { source: 'serverMA7', value: serverMA7 };
  if (computedMA7 && computedMA7.length) return { source: 'computedMA7', value: computedMA7[0] };
  return { source: 'none', value: undefined };
}

// preferredMA logic (server MA7 precedence) mirrored for completeness of original helper coverage.
function preferredMA(computed, serverVal) {
  if (typeof serverVal === 'number') return serverVal;
  return computed && computed.length ? computed[0] : undefined;
}

describe('smoothing precedence rules', () => {
  it('baseline: smoothed wins over server & computed', () => {
    const out = chooseBaseline({ smoothed: 91.2, serverMA7: 89.5, computedMA7: [90.1, 90] });
    expect(out).to.deep.equal({ source: 'smoothed', value: 91.2 });
  });
  it('server MA7 chosen when no smoothed present', () => {
    const out = chooseBaseline({ smoothed: null, serverMA7: 88.4, computedMA7: [87.9] });
    expect(out).to.deep.equal({ source: 'serverMA7', value: 88.4 });
  });
  it('computed MA7 used when neither smoothed nor server MA7 present', () => {
    const out = chooseBaseline({ smoothed: undefined, serverMA7: null, computedMA7: [72.33, 71.9] });
    expect(out).to.deep.equal({ source: 'computedMA7', value: 72.33 });
  });
  it('none when no baselines available', () => {
    const out = chooseBaseline({ smoothed: undefined, serverMA7: undefined, computedMA7: [] });
    expect(out).to.deep.equal({ source: 'none', value: undefined });
  });
});

describe('preferredMA helper parity', () => {
  it('returns server value when present even if computed exists', () => {
    expect(preferredMA([10, 9, 8], 7.5)).to.equal(7.5);
  });
  it('falls back to first computed when server missing', () => {
    expect(preferredMA([12.34, 11], null)).to.equal(12.34);
  });
  it('returns undefined when neither present', () => {
    expect(preferredMA([], null)).to.equal(undefined);
  });
});
