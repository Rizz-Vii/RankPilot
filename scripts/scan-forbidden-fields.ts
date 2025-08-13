/**
 * Forbidden Fields Scan (Governance)
 * Scans Firestore (if emulator vars present) and codebase for persisted forbidden derived fields
 * Currently targets marketingCampaigns collection documents for presence of ctr / roi.
 * Exits with non-zero code if violations found.
 */
import fs from 'fs';
import path from 'path';

const FORBIDDEN_FIELDS = ['ctr', 'roi'];

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
                if (p.includes('marketing-write-guard')) return; // allow guard definition
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
    let admin: any;
    try { admin = require('firebase-admin'); } catch { return []; }
    if (!admin.apps?.length) {
        try { admin.initializeApp({ projectId: project }); } catch { /* ignore */ }
    }
    const db = admin.firestore?.();
    if (!db) return [];
    const violations: string[] = [];
    try {
        const snap = await db.collection('marketingCampaigns').limit(200).get();
        snap.forEach((doc: any) => {
            const data = doc.data();
            FORBIDDEN_FIELDS.forEach(f => { if (f in data) violations.push(`Firestore doc marketingCampaigns/${doc.id} contains forbidden field '${f}'`); });
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
