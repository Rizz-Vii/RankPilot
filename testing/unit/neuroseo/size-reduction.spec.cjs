const { strict: assert } = require('assert');

function approxSize(v){ return Buffer.byteLength(JSON.stringify(v)); }

// Mimic logic used in report-neuroseo-size-reduction.ts for reductionPct
function calcReduction(legacyDocs, aggDocs, matchFields){
  const idx = new Map();
  aggDocs.forEach(d => { const key = matchFields.map(f=> d[f] ?? '').join('|'); idx.set(key, d); });
  let matched=0, legacyBytes=0, aggBytes=0;
  legacyDocs.forEach(ld => { const key = matchFields.map(f=> ld[f] ?? '').join('|'); const agg = idx.get(key); if (agg){ matched++; legacyBytes += approxSize(ld); aggBytes += approxSize(agg); } });
  if(!matched) return null;
  const avgLegacy = legacyBytes / matched; const avgAgg = aggBytes / matched;
  return +(((1 - (avgAgg/avgLegacy))*100).toFixed(2));
}

describe('size reduction calc', () => {
  it('computes positive reduction', () => {
    const legacy = [
      { userId:'u1', url:'https://a', large: Array(50).fill('x') },
      { userId:'u1', url:'https://b', nested:{ arr: Array(30).fill({v:1}) } }
    ];
    const aggs = [
      { userId:'u1', url:'https://a', summary:1 },
      { userId:'u1', url:'https://b', summary:2 }
    ];
    const pct = calcReduction(legacy, aggs, ['userId','url']);
    assert.ok(pct > 0 && pct <= 100, 'pct should be between 0 and 100');
  });
  it('returns null with no matches', () => {
    const pct = calcReduction([{userId:'u1', url:'x'}], [{userId:'u2', url:'y'}], ['userId','url']);
    assert.equal(pct, null);
  });
});
