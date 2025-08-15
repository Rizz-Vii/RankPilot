const { expect } = require('chai');
const fs = require('fs');
const path = require('path');

// Files in metrics & dashboard batch that must not contain raw palette utilities after semantic migration
const files = [
  'src/components/metrics/QuotaBar.tsx',
  'src/components/metrics/MetricCard.tsx',
  'src/components/ui/adaptive-progress.tsx',
  'src/components/performance-dashboard.tsx',
  'src/components/dashboard/VisualizationDashboardBuilder.tsx',
  'src/components/dashboard/EnterpriseDashboard.tsx'
].map(f => path.join(process.cwd(), f));

// Disallow common Tailwind palette color utility patterns (shades 50-900) for hues we migrated away from.
const paletteRegex = /(emerald|amber|rose|green|yellow|red|blue|violet)-(50|100|200|300|400|500|600|700|800|900)/;

describe('Metrics & Dashboards semantic color compliance', () => {
  for (const file of files) {
    it(`contains no raw palette utilities: ${path.basename(file)}`, () => {
      const content = fs.readFileSync(file, 'utf8');
      const matches = content.match(paletteRegex);
      expect(matches, `Found disallowed palette utilities in ${file}: ${matches || []}`).to.be.null;
    });
  }
});
