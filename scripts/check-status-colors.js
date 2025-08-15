// Quick standalone compliance scan replicating design-status-colors-compliance.spec.ts logic
const fs = require('fs');
const path = require('path');


const STATUS_PALETTE_REGEX = /(bg|text|border|ring)-(?:red|green|yellow|orange|blue|purple|amber)-(50|100|200|300|400|500|600|700|800|900)\b/;

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc); else acc.push(full);
  }
  return acc;
}

const root = path.join(process.cwd(), 'src');
const files = walk(root).filter(f => /\.(tsx?|jsx?)$/.test(f));
const offenders = [];
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\n/);
  lines.forEach((line, idx) => {
    const m = line.match(STATUS_PALETTE_REGEX);
    if (m) {
      offenders.push({ file: path.relative(process.cwd(), file), line: idx + 1, match: m[0] });
    }
  });
}

if (offenders.length) {
  console.log('OFFENDERS FOUND:', offenders.length);
  console.table(offenders.slice(0, 30));
  process.exitCode = 1;
} else {
  console.log('No raw status palette utilities found (excluding allowlist).');
}
