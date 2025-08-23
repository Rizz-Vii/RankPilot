#!/usr/bin/env ts-node
/**
 * Generate Access Manifest
 * - Extracts feature definitions from src/lib/access-control.ts (requiredTier, requiresAdmin)
 * - Extracts navigation route gating from src/constants/enhanced-nav.ts (href, feature, requiredTier, adminOnly)
 * - Scans page files for <FeatureGate feature="..." requiredTier="..." adminOnly> usage
 * - Emits artifacts/access-manifest.json with consolidated view + anomalies
 */
import fs from 'fs';
import path from 'path';

type Tier = 'free' | 'starter' | 'agency' | 'enterprise';

interface FeatureDef { requiredTier?: Tier; requiresAdmin?: boolean }
interface RouteDef { href: string; feature?: string; requiredTier?: Tier; adminOnly?: boolean }
interface PageGate { file: string; route: string; feature?: string; requiredTier?: Tier; adminOnly?: boolean }
interface Finding { severity: 'ERROR' | 'WARN' | 'INFO'; code: string; message: string; context?: unknown }

const projectRoot = process.cwd();
const accessFile = path.join(projectRoot, 'src/lib/access-control.ts');
const navFile = path.join(projectRoot, 'src/constants/enhanced-nav.ts');
const appDir = path.join(projectRoot, 'src/app/(app)');
const outDir = path.join(projectRoot, 'artifacts');
const outFile = path.join(outDir, 'access-manifest.json');

function read(p: string): string {
    if (!fs.existsSync(p)) return '';
    return fs.readFileSync(p, 'utf8');
}

// 1) Feature registry from access-control.ts
function extractFeatures(src: string): Record<string, FeatureDef> {
    const map: Record<string, FeatureDef> = {};
    // Heuristic: match lines like  feature_key: { requiredTier: "starter" ... } or with requiresAdmin
    const objRegex = /(\n|^)\s*([a-zA-Z0-9_]+):\s*\{[^\}]*\}/gms;
    let m: RegExpExecArray | null;
    while ((m = objRegex.exec(src))) {
        const body = m[0];
        const keyMatch = /([a-zA-Z0-9_]+):\s*\{/.exec(body);
        const key = keyMatch?.[1];
        if (!key) continue;
        const tierMatch = /requiredTier:\s*"(free|starter|agency|enterprise)"/.exec(body);
        const requiresAdmin = /requiresAdmin:\s*true/.test(body);
        map[key] = {
            ...(tierMatch ? { requiredTier: tierMatch[1] as Tier } : {}),
            ...(requiresAdmin ? { requiresAdmin: true } : {}),
        };
    }
    return map;
}

// 2) Nav items from enhanced-nav.ts
function extractNavRoutes(src: string): RouteDef[] {
    const items: RouteDef[] = [];
    // Match object-ish blocks with href, optional feature, requiredTier, adminOnly
    const blockRegex = /{[^}]*href:\s*\"([^\"]+)\"[^}]*}/gms;
    let b: RegExpExecArray | null;
    while ((b = blockRegex.exec(src))) {
        const block = b[0];
        const href = b[1];
        const feature = /feature:\s*\"([a-zA-Z0-9_]+)\"/.exec(block)?.[1];
        const tier = /requiredTier:\s*\"(free|starter|agency|enterprise)\"/.exec(block)?.[1] as Tier | undefined;
        const adminOnly = /adminOnly:\s*true/.test(block) || undefined;
        items.push({ href, feature, requiredTier: tier, adminOnly });
    }
    // Deduplicate by href keeping the most specific (feature-defined) variant first
    const byHref = new Map<string, RouteDef>();
    for (const it of items) {
        const prev = byHref.get(it.href);
        if (!prev) byHref.set(it.href, it);
        else if (!prev.feature && it.feature) byHref.set(it.href, it);
    }
    return [...byHref.values()];
}

// 3) Page FeatureGate usage
function walk(dir: string, acc: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        const st = fs.statSync(full);
        if (st.isDirectory()) walk(full, acc);
        else if (/page\.(t|j)sx?$/.test(entry)) acc.push(full);
    }
    return acc;
}

function pathToRoute(file: string): string {
    const rel = file.replace(appDir, '').replace(/\\/g, '/');
    // e.g. /finance/billing/page.tsx -> /finance/billing
    return rel.replace(/\/page\.(t|j)sx$/, '') || '/';
}

function extractPageGates(files: string[]): PageGate[] {
    const gates: PageGate[] = [];
    const gateRegex = /<FeatureGate([^>]*)>/g;
    for (const f of files) {
        const content = read(f);
        let m: RegExpExecArray | null;
        while ((m = gateRegex.exec(content))) {
            const attrs = m[1];
            const feature = /feature=\"([a-zA-Z0-9_]+)\"/.exec(attrs)?.[1];
            const tier = /requiredTier=\"(free|starter|agency|enterprise)\"/.exec(attrs)?.[1] as Tier | undefined;
            const adminOnly = /adminOnly(=\{?true\}?|\s)/.test(attrs) || undefined;
            gates.push({ file: f.replace(projectRoot + '/', ''), route: pathToRoute(f), feature, requiredTier: tier, adminOnly });
        }
    }
    return gates;
}

function main() {
    const accessSrc = read(accessFile);
    const navSrc = read(navFile);
    if (!accessSrc || !navSrc) {
        console.error('Required files missing: access-control.ts or enhanced-nav.ts');
        process.exit(1);
    }

    const features = extractFeatures(accessSrc);
    const navRoutes = extractNavRoutes(navSrc);
    const pageFiles = fs.existsSync(appDir) ? walk(appDir) : [];
    const pageGates = extractPageGates(pageFiles);

    const findings: Finding[] = [];
    const featureSet = new Set(Object.keys(features));

    // Validate references
    for (const r of navRoutes) {
        if (r.feature && !featureSet.has(r.feature)) {
            findings.push({ severity: 'ERROR', code: 'NAV_UNKNOWN_FEATURE', message: `Nav href ${r.href} references unknown feature ${r.feature}`, context: r });
        }
    }
    for (const p of pageGates) {
        if (p.feature && !featureSet.has(p.feature)) {
            findings.push({ severity: 'ERROR', code: 'PAGE_UNKNOWN_FEATURE', message: `Page ${p.file} references unknown feature ${p.feature}`, context: p });
        }
    }

    // Route -> page alignment: ensure that if a nav route has a feature, at least one page under that route has same feature gate
    const pagesByRoute = new Map<string, PageGate[]>();
    for (const pg of pageGates) {
        const arr = pagesByRoute.get(pg.route) || [];
        arr.push(pg); pagesByRoute.set(pg.route, arr);
    }
    for (const r of navRoutes.filter(x => x.feature)) {
        const pages = pagesByRoute.get(r.href) || [];
        const match = pages.some(p => p.feature === r.feature);
        if (!match) {
            findings.push({ severity: 'WARN', code: 'ROUTE_MISSING_GATE', message: `Route ${r.href} has feature ${r.feature} but no matching FeatureGate in page`, context: { route: r.href, feature: r.feature } });
        }
    }

    // Orphan features (no nav and no page gate), ignore requiresAdmin-only
    const usedFeatures = new Set([
        ...navRoutes.filter(r => r.feature).map(r => r.feature!),
        ...pageGates.filter(p => p.feature).map(p => p.feature!)
    ]);
    for (const fk of featureSet) {
        if (usedFeatures.has(fk)) continue;
        const def = features[fk];
        if (def?.requiresAdmin) continue; // admin-only, skip
        findings.push({ severity: 'INFO', code: 'ORPHAN_FEATURE', message: `Feature ${fk} not referenced in nav or pages` });
    }

    const manifest = {
        generatedAt: new Date().toISOString(),
        features,
        routes: navRoutes,
        pages: pageGates,
        findings,
    };

    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2), 'utf8');

    const errors = findings.filter(f => f.severity === 'ERROR').length;
    const warns = findings.filter(f => f.severity === 'WARN').length;
    console.log(`[ACCESS_MANIFEST] written -> ${path.relative(projectRoot, outFile)} (features:${Object.keys(features).length} routes:${navRoutes.length} pages:${pageGates.length})`);
    if (errors) {
        console.error(`[ACCESS_MANIFEST] FAIL errors=${errors} warns=${warns}`);
        process.exit(1);
    } else if (warns) {
        console.warn(`[ACCESS_MANIFEST] WARN warns=${warns}`);
    } else {
        console.log('[ACCESS_MANIFEST] PASS');
    }
}

main();
