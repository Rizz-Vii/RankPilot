import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Ensures no direct Tailwind raw status palette utilities linger after Batch 3 migration.
// Disallowed: (bg|text|border|ring)-(red|green|yellow|orange|blue|purple|amber)-(50-900)
// Allowlist: temporary file path substrings permitted to still contain raw palette utilities while phased migration completes.
// Remove entries progressively; goal is empty array.
const ALLOWLIST: string[] = [
    'src/components/ui/standardized-button.tsx',
    'src/components/ui/enhanced-cards.tsx',
    'src/components/ui/loading-spinner.tsx',
    'src/components/forms/seo-audit-form.tsx',
    'src/components/profile/seo-achievements-badges.tsx',
    'src/components/admin/admin-analytics.tsx',
    'src/components/shared/ActionCard.tsx',
    'src/components/charts/Sparkline.tsx',
    'src/components/tiers/tier-icons.tsx',
    'src/components/unified-mobile-sidebar.tsx'
];

const STATUS_PALETTE_REGEX = /(bg|text|border|ring)-(?:red|green|yellow|orange|blue|purple|amber)-(50|100|200|300|400|500|600|700|800|900)\b/;

function walk(dir: string, acc: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, acc); else acc.push(full);
    }
    return acc;
}

test.describe('Design status color semantic compliance', () => {
    test('no raw status palette utilities remain in src/', () => {
        const root = path.join(__dirname, '../../../..', 'src');
        const files = walk(root).filter(f => /\.(tsx?|jsx?)$/.test(f));
        const offenders: { file: string; line: number; match: string }[] = [];
        for (const file of files) {
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split(/\n/);
            lines.forEach((line, idx) => {
                const m = line.match(STATUS_PALETTE_REGEX);
                if (m) {
                    if (ALLOWLIST.some(seg => file.includes(seg))) return; // temporarily skip allowlisted file
                    offenders.push({ file: path.relative(process.cwd(), file), line: idx + 1, match: m[0] });
                }
            });
        }
        if (offenders.length) {
            console.error('Raw status palette utilities detected:', offenders);
        }
        expect(offenders, 'Replace raw palette utilities with semantic tokens (primary, accent, success, warning, destructive, etc.)').toEqual([]);
    });
});
