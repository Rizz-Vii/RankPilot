const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
spawnSync('node', ['dist/brain/scripts/brain/cli.js', '--mode', 'execute', '--verify-guard-fail'], { stdio: 'pipe' });
const dir = path.join(process.cwd(), 'artifacts/brain');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f=>f.startsWith('remediation-')) : [];
if (!files.length) { console.error('no remediation'); process.exit(1); }
console.log('remediation.smoke: OK');

