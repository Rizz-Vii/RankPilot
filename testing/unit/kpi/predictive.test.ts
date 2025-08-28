import { strict as assert } from 'assert';
import { forecastNext } from '../../../src/lib/kpi/predictive';

(async function run() {
    const resEmpty = forecastNext({ samples: [] });
    assert.equal(resEmpty.forecast, null);
    const res = forecastNext({ samples: [1000, 1200, 1100, 1300], alpha: 0.5 });
    assert.equal(res.method, 'exp-smoothing');
    assert.equal(res.advisory, true);
    assert.ok(typeof res.forecast === 'number');
    console.log('predictive.test PASS');
})();
