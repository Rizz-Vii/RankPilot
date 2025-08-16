import { checkLimits } from '../../scripts/brain/governance/guards';

function expect(cond: boolean, msg: string) { if (!cond) throw new Error(msg); }

const ok = checkLimits({ locAdded: 10, filesTouched: 2 }, { maxLocAdded: 450, maxFiles: 15 });
expect(ok.ok === true, 'limits should pass for small change');

const bad = checkLimits({ locAdded: 999, filesTouched: 2 }, { maxLocAdded: 450, maxFiles: 15 });
expect(bad.ok === false && bad.overLoc === true, 'should fail on loc overage');

console.log('guards tests: PASS');

