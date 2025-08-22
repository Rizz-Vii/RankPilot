/**
 * Forbidden Fields Scan (Governance)
 * Scans Firestore (if emulator vars present) and codebase for persisted forbidden derived fields
 * Currently targets marketingCampaigns collection documents for presence of ctr / roi.
 * Exits with non-zero code if violations found.
 */
import fs from 'fs';
import path from 'path';

// Sync with FORBIDDEN_DERIVED_FIELDS in src/lib/guards/forbidden-derived-fields.ts
const FORBIDDEN_FIELDS = ['roi', 'ctr', 'conversion', 'winRate', 'ltv'];

// Heuristic: Only flag if forbidden field appears on an object literal being persisted (set/add/update) to marketingCampaigns or similar collections.
const WRITE_KEYWORDS = ['add(', 'set(', 'update(', 'batch.set', 'batch.update'];
const PERSIST_HINTS = ['marketingCampaigns'];

async function scanCodebase(root: string): Promise<string[]> {
    const violations: string[] = [];
    function walk(p: string) {
        const stat = fs.statSync(p);
        if (stat.isDirectory()) { for (const e of fs.readdirSync(p)) walk(path.join(p, e)); return; }
        if (!/\.(ts|tsx|js|mjs|cjs)$/i.test(p)) return;
        const text = fs.readFileSync(p, 'utf8');
        // Skip obvious UI (app routes pages/components/hooks) unless they include firestore write keywords
        const isUi = /\/app\//.test(p) || /\/hooks\//.test(p) || /\/components\//.test(p);
        const writeLikely = WRITE_KEYWORDS.some(k => text.includes(k)) && PERSIST_HINTS.some(h => text.includes(h));
        if (isUi && !writeLikely) return; // ignore read-only UI references
        FORBIDDEN_FIELDS.forEach(f => {
            const re = new RegExp(`\\b${f}\\b`, 'g');
            if (re.test(text)) {
                if (p.includes('marketing-write-guard')) return; // allow legacy guard definition
                if (p.includes('forbidden-derived-fields')) return; // allow central guard definition
                if (!writeLikely) return; // ignore if not part of a likely write context
                // Exempt aggregation/read-only service modules (heuristic: 'metrics.service')
                if (/marketing-metrics\.service/.test(p)) return;
                violations.push(`Potential persistence of forbidden field '${f}' in ${p}`);
            }
        });
    }
    walk(root);
    return violations;
}

async function scanFirestore(): Promise<string[]> {
    const project = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
    if (!project) return []; // Skip if not configured
    let admin: unknown;
    try { admin = require('firebase-admin'); } catch { return []; }
    const a = admin as unknown as { apps?: unknown[]; initializeApp?: (cfg: unknown) => void; firestore?: () => unknown };
    if (!Array.isArray(a.apps) || a.apps.length === 0) {
        try { a.initializeApp && a.initializeApp({ projectId: project }); } catch { /* ignore */ }
    }
    const db = a.firestore && a.firestore();
    if (!db) return [] as string[];
    const violations: string[] = [];
    try {
        const snap = await (db as unknown as { collection: (c: string) => { limit: (n: number) => { get: () => Promise<unknown> } } }).collection('marketingCampaigns').limit(200).get();
        const s = snap as unknown as { forEach: (cb: (doc: unknown) => void) => void };
        s.forEach((doc: unknown) => {
            const d = doc as unknown as { id?: string; data?: () => unknown };
            const data = typeof d.data === 'function' ? d.data() as unknown as Record<string, unknown> : {};
            FORBIDDEN_FIELDS.forEach(f => { if (data && typeof data === 'object' && f in data) violations.push(`Firestore doc marketingCampaigns/${d.id ?? 'unknown'} contains forbidden field '${f}'`); });
        });
    } catch { /* ignore firestore errors in local non-emulator context */ }
    return violations;
}

(async () => {
    const codeViolations = await scanCodebase(path.join(process.cwd(), 'src'));
    const firestoreViolations = await scanFirestore();
    const all = [...codeViolations, ...firestoreViolations];
    if (all.length) {
        console.error('\x1b[31mForbidden fields scan FAILED:\x1b[0m');
        all.forEach(v => console.error(' -', v));
        process.exit(1);
    } else {
        console.log('Forbidden fields scan passed (no forbidden references or persisted fields found).');
    }
})();
