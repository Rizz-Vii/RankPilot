// Dynamic Entitlements Loader (Phase 2)
// Provides runtime-loaded entitlement flags with safe fallback defaults.

import { getFirestore } from 'firebase/firestore';
// NOTE: We intentionally duplicate the SubscriptionTier union here to avoid a
// circular dependency (access-control imports ENTITLEMENT_FLAGS). Keep in sync
// with access-control.ts. Future refactor: extract shared types to types/access.ts.
export type SubscriptionTier = 'free' | 'starter' | 'agency' | 'enterprise';

export interface EntitlementDef { minimumTier: SubscriptionTier; description: string; }
export type EntitlementMap = Record<string, EntitlementDef>;

export const DEFAULT_ENTITLEMENTS: EntitlementMap = {
    priority_support: { minimumTier: 'agency', description: 'Priority support response SLA' },
    dedicated_support: { minimumTier: 'enterprise', description: 'Dedicated account manager / CSM' },
    enterprise_sla: { minimumTier: 'enterprise', description: 'Contractual enterprise SLA coverage' }
};

let cache: { map: EntitlementMap; loadedAt: number; source: 'dynamic' | 'default' } = { map: DEFAULT_ENTITLEMENTS, loadedAt: 0, source: 'default' };
const TTL_MS = 1000 * 60 * 5;

export async function loadEntitlements(force = false): Promise<EntitlementMap> {
    if (typeof window === 'undefined') return DEFAULT_ENTITLEMENTS; // server-side: use defaults (Next.js edge/server currently no dynamic fetch)
    const now = Date.now();
    if (!force && now - cache.loadedAt < TTL_MS) return cache.map;
    try {
        const db = getFirestore();
        const docRef = (await import('firebase/firestore')).doc(db, 'planEntitlements', 'global');
        const snap = await (await import('firebase/firestore')).getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data() as any;
            const ent = { ...DEFAULT_ENTITLEMENTS };
            if (data && typeof data === 'object' && data.entitlements) {
                for (const [k, v] of Object.entries<any>(data.entitlements)) {
                    if (ent[k]) ent[k] = { ...ent[k], enabled: v.enabled !== false } as any; // placeholder for future toggle semantics
                }
            }
            cache = { map: ent, loadedAt: now, source: 'dynamic' };
            return cache.map;
        }
    } catch {
        // swallow
    }
    cache = { map: DEFAULT_ENTITLEMENTS, loadedAt: now, source: 'default' };
    return cache.map;
}

// Phase 2 refactor: ENTITLEMENT_FLAGS deprecated. Use canAccessEntitlement() helpers.
// (Temporary export commented out to surface accidental usages.)
// export const ENTITLEMENT_FLAGS = DEFAULT_ENTITLEMENTS;

export function getEntitlementsSource() { return cache.source; }
