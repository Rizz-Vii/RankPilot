/**
 * Navigation & FeatureGate Consistency Audit
 *
 * Validations:
 * 1. Every nav item with requiredTier >= starter must have a feature key OR be explicitly allowlisted.
 * 2. Every nav item with a feature key must have that feature defined in FEATURE_ACCESS.
 * 3. Each page route referenced by a nav item with a feature must include a FeatureGate usage.
 * 4. Each FeatureGate usage references an existing feature key.
 * 5. Report orphan features (defined but unused in nav or FeatureGate) excluding admin-only.
 */
import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const navFile = path.join(projectRoot, 'src/constants/enhanced-nav.ts');
const accessFile = path.join(projectRoot, 'src/lib/access-control.ts');
const appDir = path.join(projectRoot, 'src/app/(app)');

type NavItem = { title: string; href: string; requiredTier?: string; feature?: string; adminOnly?: boolean; };

interface Finding { severity: 'ERROR' | 'WARN' | 'INFO'; code: string; message: string; context?: any; }

const findings: Finding[] = [];

function readFile(p: string) {
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

const navSource = readFile(navFile);
const accessSource = readFile(accessFile);
if (!navSource || !accessSource) {
    console.error('Required source files missing.');
    process.exit(1);
}

// Extract feature map keys from access-control (FEATURE_ACCESS object keys)
// Match feature keys whether requiredTier/requiresAdmin appears on same line or next line
const featureKeyRegex = /\b([a-zA-Z0-9_]+): \{[^}]*?(requiredTier|requiresAdmin)/g;
const featureKeys = new Set<string>();
for (const m of accessSource.matchAll(featureKeyRegex)) {
    featureKeys.add(m[1]);
}

// Extract nav items: rudimentary regex for objects with href
const navItemRegex = /{[^}]*href:\s*\"([^\"]+)\"[^}]*}/gms;
const navItems: NavItem[] = [];
for (const block of navSource.matchAll(navItemRegex)) {
    const obj = block[0];
    const href = block[1];
    const requiredTier = /requiredTier:\s*\"(starter|agency|enterprise)\"/.exec(obj)?.[1];
    const feature = /feature:\s*\"([a-zA-Z0-9_]+)\"/.exec(obj)?.[1];
    const adminOnly = /adminOnly:\s*true/.test(obj);
    navItems.push({ title: /title:\s*\"([^\"]+)\"/.exec(obj)?.[1] || href, href, requiredTier, feature, adminOnly });
}

// Allowlist: items intentionally without feature key but tiered (if any)
const allowNoFeature = new Set<string>([
    '/sales/pipeline',
    '/sales/deals',
    '/sales/outreach',
    '/dashboard',
    '/insights',
    '/performance',
]);

// Scan app directory for FeatureGate usages
const featureGateUsages = new Map<string, string[]>();
function walk(dir: string) {
    for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) walk(full);
        else if (/page\.(t|j)sx?$/.test(entry)) {
            const content = readFile(full);
            const regex = /<FeatureGate[^>]*feature=\"([a-zA-Z0-9_]+)\"/g;
            for (const m of content.matchAll(regex)) {
                const f = m[1];
                if (!featureGateUsages.has(f)) featureGateUsages.set(f, []);
                featureGateUsages.get(f)!.push(full.replace(projectRoot + '/', ''));
            }
        }
    }
}
walk(appDir);

// 1 & 2: Validate nav items
for (const item of navItems) {
    if (item.requiredTier && !item.feature && !allowNoFeature.has(item.href) && !item.adminOnly) {
        findings.push({ severity: 'WARN', code: 'NAV_NO_FEATURE', message: `Nav item ${item.href} has tier ${item.requiredTier} but no feature key`, context: item });
    }
    if (item.feature && !featureKeys.has(item.feature)) {
        findings.push({ severity: 'ERROR', code: 'UNKNOWN_FEATURE', message: `Nav item ${item.href} references unknown feature ${item.feature}`, context: item });
    }
}

// 3: Ensure pages for nav items with feature keys use FeatureGate
for (const item of navItems.filter(i => i.feature)) {
    const routePath = path.join(appDir, item.href.replace(/^\//, ''));
    let matched = false;
    const candidates = [
        path.join(routePath, 'page.tsx'),
        path.join(routePath, 'page.jsx'),
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            const src = readFile(candidate);
            if (new RegExp(`<FeatureGate[^>]*feature=\\"${item.feature}\\"`).test(src)) { matched = true; break; }
        }
    }
    if (!matched) {
        findings.push({ severity: 'WARN', code: 'MISSING_FEATURE_GATE', message: `Route ${item.href} with feature ${item.feature} missing FeatureGate wrapper`, context: item });
    }
}

// 4: FeatureGate usages reference existing features
for (const [feature, files] of featureGateUsages.entries()) {
    if (!featureKeys.has(feature)) {
        findings.push({ severity: 'ERROR', code: 'GATE_UNKNOWN_FEATURE', message: `FeatureGate uses unknown feature ${feature}`, context: { files } });
    }
}

// 5: Orphan features (with suppression support via inline annotations)
// Annotation format preceding feature key line:
// // audit:ignore-orphan category=<token> rationale="<reason>"
const usedFeatures = new Set<string>([...navItems.filter(i => i.feature).map(i => i.feature!), ...featureGateUsages.keys()]);
// Precompute ignore lines
const ignoreOrphanLines = new Map<string, { category: string; rationale: string }>();
const accessLines = accessSource.split(/\n/);
for (let i = 0; i < accessLines.length; i++) {
    const line = accessLines[i].trim();
    if (line.startsWith('// audit:ignore-orphan')) {
        // Parse category and rationale
        const categoryMatch = /category=([a-zA-Z0-9_-]+)/.exec(line);
        const rationaleMatch = /rationale="([^"]+)"/.exec(line);
        // Look ahead for next feature key line pattern 'feature_key: {'
        for (let j = i + 1; j < Math.min(i + 4, accessLines.length); j++) {
            const featureLineMatch = /^(\s*)([a-zA-Z0-9_]+):\s*\{/.exec(accessLines[j]);
            if (featureLineMatch) {
                const fk = featureLineMatch[2];
                ignoreOrphanLines.set(fk, { category: categoryMatch?.[1] || 'unspecified', rationale: rationaleMatch?.[1] || '' });
                break;
            }
        }
    }
}
for (const fk of featureKeys) {
    if (!usedFeatures.has(fk)) {
        if (ignoreOrphanLines.has(fk)) continue; // suppressed
        const adminPattern = new RegExp(`${fk}: {\n\s+requiresAdmin: true`);
        if (adminPattern.test(accessSource)) continue; // admin-only auto-suppressed
        findings.push({ severity: 'INFO', code: 'ORPHAN_FEATURE', message: `Feature ${fk} not referenced in nav or page gates`, context: fk });
    }
}

const errors = findings.filter(f => f.severity === 'ERROR').length;
const warns = findings.filter(f => f.severity === 'WARN').length;
const infos = findings.filter(f => f.severity === 'INFO').length;

const report = { stats: { errors, warns, infos, total: findings.length }, findings };

if (errors) {
    console.error('[NAV_FEATURE_AUDIT] FAIL', JSON.stringify(report, null, 2));
    process.exitCode = 1;
} else if (warns) {
    console.warn('[NAV_FEATURE_AUDIT] WARN', JSON.stringify(report, null, 2));
} else {
    console.log('[NAV_FEATURE_AUDIT] PASS', JSON.stringify(report, null, 2));
}
