const { expect } = require('chai');

// Pure MA7 computation mirroring client sparkline overlay logic
function computeMA7(values) {
  const chronological = [...values].reverse();
  const out = [];
  for (let i = 0; i < chronological.length; i++) {
    const start = Math.max(0, i - 6);
    const slice = chronological.slice(start, i + 1);
    const avg = slice.reduce((s, v) => s + v, 0) / slice.length;
    out.push(+avg.toFixed(2));
  }
  return out.reverse();
}

describe('observability sparkline MA7 overlay', () => {
  it('produces MA7 array matching value length', () => {
    const input = [10,11,12,13,14,15,16,17];
    const ma = computeMA7(input);
    expect(ma).to.have.length(input.length);
  });
  it('handles shorter than 7 values', () => {
    const input = [5,6,7];
    const ma = computeMA7(input);
    // Algorithm reverses first, so chronological = [7,6,5]
    // i=0 avg(7)=7, i=1 avg(7,6)=6.5, i=2 avg(7,6,5)=6 -> reverse => [6,6.5,7]
    expect(ma).to.deep.equal([6,6.5,7]);
  });
});
