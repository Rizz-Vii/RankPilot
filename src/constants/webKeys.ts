/**
 * Deterministic catalog of web‑exposed (public) environment variable keys that are
 * safe for the Codex web AI agent to receive. Only keys prefixed with NEXT_PUBLIC_
 * or otherwise explicitly intended for client runtime should appear here.
 *
 * NEVER include server secrets (API keys, private keys, tokens) in this list.
 * Update this file only when a new public key is actually referenced in code.
 *
 * Validation strategy (separate script can diff):
 *  1. Grep / scan for /NEXT_PUBLIC_[A-Z0-9_]+/ usages.
 *  2. Assert every discovered key exists in this catalog.
 *  3. Fail CI if drift is detected (missing or extraneous keys).
 */

export type WebKeyCategory =
    | 'core'
    | 'firebase'
    | 'security'
    | 'thirdParty'
    | 'featureFlag'
    | 'pwa'
    | 'testing'
    | 'analytics'
    | 'experimental';

export interface WebKeyDefinition {
    key: string;                 // Environment variable name
    category: WebKeyCategory;    // Functional grouping
    required: boolean;           // Whether app baseline requires this to boot correctly
    description: string;         // Short human description
    defaultExample?: string;     // Optional example value (non-secret)
}

/**
 * Ordered, stable list (alphabetical by key) to keep diffs deterministic.
 */
export const WEB_KEY_DEFINITIONS: WebKeyDefinition[] = [
    // Core App Meta
    {
        key: 'NEXT_PUBLIC_APP_ENV',
        category: 'core',
        required: true,
        description: 'Logical environment identifier for client logic (development, staging, production).',
        defaultExample: 'development'
    },
    {
        key: 'NEXT_PUBLIC_APP_URL',
        category: 'core',
        required: true,
        description: 'Canonical absolute URL base for the web application (used in links & redirects).',
        defaultExample: 'http://localhost:3000'
    },
    {
        key: 'NEXT_PUBLIC_BASE_URL',
        category: 'core',
        required: true,
        description: 'Fallback / legacy base URL alias (should match APP_URL during migration).',
        defaultExample: 'http://localhost:3000'
    },

    // Firebase (public SDK config – safe to expose)
    { key: 'NEXT_PUBLIC_FIREBASE_API_KEY', category: 'firebase', required: true, description: 'Firebase Web API key (public client config).', defaultExample: 'AIza...public' },
    { key: 'NEXT_PUBLIC_FIREBASE_APP_ID', category: 'firebase', required: true, description: 'Firebase application ID (public client config).', defaultExample: '1:123:web:abc' },
    { key: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', category: 'firebase', required: true, description: 'Firebase Auth domain for client initialization.' },
    { key: 'NEXT_PUBLIC_FIREBASE_DATABASE_URL', category: 'firebase', required: false, description: 'Realtime Database URL when RTDB features enabled.' },
    { key: 'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID', category: 'firebase', required: false, description: 'Firebase / GA measurement ID (optional analytics).' },
    { key: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', category: 'firebase', required: true, description: 'Sender ID for Firebase Cloud Messaging (push setup).' },
    { key: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', category: 'firebase', required: true, description: 'Firebase project identifier.' },
    { key: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', category: 'firebase', required: true, description: 'Storage bucket host for client uploads.' },

    // Third Party Public Integrations
    { key: 'NEXT_PUBLIC_PAYPAL_CLIENT_ID', category: 'thirdParty', required: false, description: 'PayPal JS SDK client ID for multi-payment checkout.' },
    { key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', category: 'thirdParty', required: true, description: 'Stripe publishable key for client-side Checkout & Elements.', defaultExample: 'pk_test_...' },

    // Security / Human Verification
    { key: 'NEXT_PUBLIC_RECAPTCHA_SITE_KEY', category: 'security', required: false, description: 'reCAPTCHA site key for signup / protected forms.' },

    // PWA & Push
    { key: 'NEXT_PUBLIC_ENABLE_PWA', category: 'pwa', required: false, description: 'Enable client PWA features & service worker registration.' },
    { key: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY', category: 'pwa', required: false, description: 'Public VAPID key for Web Push subscription (base64url).' },

    // Feature Flags & Experimental Toggles
    { key: 'NEXT_PUBLIC_DATA_MIN_NEURAL_CRAWLER_PRUNE_LEGACY', category: 'featureFlag', required: false, description: 'Data minimization: prune legacy neural crawler records flag (1 = enabled).' },
    { key: 'NEXT_PUBLIC_DATA_MIN_NEURAL_CRAWLER_READ_AGG', category: 'featureFlag', required: false, description: 'Data minimization: aggregate read flag for neural crawler (1 = enabled).' },
    { key: 'NEXT_PUBLIC_DEMO_CONTENT', category: 'featureFlag', required: false, description: 'Expose demo/tutorial content when true for marketing / preview.' },
    { key: 'NEXT_PUBLIC_FEATURE_FLAG_ADVANCED_ANALYTICS', category: 'featureFlag', required: false, description: 'Gate advanced analytics UI components.' },
    { key: 'NEXT_PUBLIC_FEATURE_FLAG_BETA_FEATURES', category: 'featureFlag', required: false, description: 'Global toggle for showing beta functionality.' },
    { key: 'NEXT_PUBLIC_FEATURE_FLAG_NEUROSEO', category: 'featureFlag', required: false, description: 'Enable NeuroSEO UI modules (client gating only).' },

    // Testing / Internal
    { key: 'NEXT_PUBLIC_E2E', category: 'testing', required: false, description: 'Signal for end-to-end test harness to unlock guarded routes (1 = allow).' },
    { key: 'NEXT_PUBLIC_USE_FUNCTIONS_EMULATOR', category: 'testing', required: false, description: 'Force Firebase Functions emulator usage in browser when true.' },

    // Analytics
    { key: 'NEXT_PUBLIC_GOOGLE_ANALYTICS', category: 'analytics', required: false, description: 'Google Analytics (GA4) Measurement ID for client analytics.' }
];

/** Quick lookup set for fast membership checks. */
export const WEB_KEY_SET: ReadonlySet<string> = new Set(WEB_KEY_DEFINITIONS.map(k => k.key));

/**
 * Returns a sanitized, shallow object containing only whitelisted web keys & their current values.
 * Undefined values are omitted by default unless includeUndefined is true.
 */
export function getWhitelistedWebEnv(includeUndefined = false): Record<string, string> {
    const out: Record<string, string> = {};
    for (const def of WEB_KEY_DEFINITIONS) {
        const val = process.env[def.key];
        if (val === undefined) {
            if (includeUndefined) out[def.key] = '';
        } else {
            out[def.key] = val;
        }
    }
    return out;
}

/**
 * Simple integrity helper: returns any keys discovered in process.env that look like NEXT_PUBLIC_* but
 * are NOT yet cataloged, to help prevent accidental drift.
 */
export function detectUncataloguedPublicKeys(env: NodeJS.ProcessEnv = process.env): string[] {
    const discovered = Object.keys(env).filter(k => k.startsWith('NEXT_PUBLIC_'));
    return discovered.filter(k => !WEB_KEY_SET.has(k)).sort();
}

/**
 * Assert (throw) if uncatalogued NEXT_PUBLIC_* keys exist. Intended for optional build-time enforcement.
 */
export function assertNoUncataloguedPublicKeys(): void {
    const extra = detectUncataloguedPublicKeys();
    if (extra.length) {
        throw new Error(`Uncatalogued public env keys detected: ${extra.join(', ')}. Update src/constants/webKeys.ts.`);
    }
}

export default WEB_KEY_DEFINITIONS;
