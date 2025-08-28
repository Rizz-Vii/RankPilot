/**
 * Centralized CORS utilities for API routes.
 * - Validates Origin against allowed list (env + Firebase hosting domains + localhost)
 * - Handles preflight OPTIONS requests
 * - Emits appropriate Vary headers to ensure cache correctness
 */

function normalizeOrigin(input: string | null): string | null {
    if (!input) return null;
    try {
        const u = new URL(input);
        return `${u.protocol}//${u.host}`; // drop path/query
    } catch {
        // Accept bare host:port values like "localhost:3000"
        if (/^[a-z0-9.-]+(?::\d+)?$/i.test(input)) {
            const host = input;
            const proto = host.startsWith('localhost') || host.includes(':') ? 'http:' : 'https:';
            return `${proto}//${host}`;
        }
        return null;
    }
}

function getDefaultAllowedOrigins(): string[] {
    const allowed = new Set<string>();
    // localhost for dev
    allowed.add('http://localhost:3000');
    allowed.add('http://127.0.0.1:3000');
    // Codespaces-style patterns are dynamic; rely on per-request Origin validation
    // Firebase hosting default domains inferred from project id
    const proj = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (proj) {
        allowed.add(`https://${proj}.web.app`);
        allowed.add(`https://${proj}.firebaseapp.com`);
    }
    // Explicit app domain (with or without scheme)
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;
    if (appDomain) {
        const norm = normalizeOrigin(appDomain.startsWith('http') ? appDomain : `https://${appDomain}`);
        if (norm) allowed.add(norm);
    }
    // Extra comma-separated origins
    const extra = process.env.EXTRA_CORS_ORIGINS;
    if (extra) {
        for (const raw of extra.split(',').map(s => s.trim()).filter(Boolean)) {
            const norm = normalizeOrigin(raw);
            if (norm) allowed.add(norm);
        }
    }
    return Array.from(allowed);
}

export function resolveAllowedOrigin(reqOrigin: string | null): string | null {
    const origin = normalizeOrigin(reqOrigin);
    if (!origin) return null;
    const allowed = getDefaultAllowedOrigins();
    // Allow exact matches only
    return allowed.includes(origin) ? origin : null;
}

export function buildCorsHeaders(origin: string | null, options?: { allowCredentials?: boolean; allowMethods?: string[]; exposeHeaders?: string[]; allowHeaders?: string[] }): Record<string, string> {
    const headers: Record<string, string> = {};
    const vary: string[] = ['Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers'];
    headers['Vary'] = vary.join(', ');

    const allowMethods = options?.allowMethods ?? ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
    headers['Access-Control-Allow-Methods'] = allowMethods.join(', ');

    const allowHeaders = options?.allowHeaders ?? ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Team-Id'];
    headers['Access-Control-Allow-Headers'] = allowHeaders.join(', ');

    if (origin) {
        headers['Access-Control-Allow-Origin'] = origin;
        if (options?.allowCredentials) headers['Access-Control-Allow-Credentials'] = 'true';
    }

    const expose = options?.exposeHeaders ?? [];
    if (expose.length) headers['Access-Control-Expose-Headers'] = expose.join(', ');

    return headers;
}

/**
 * Handle CORS for a route:
 * - Returns { preflight: Response } for OPTIONS
 * - Returns headers to merge for non-OPTIONS responses
 */
export function handleCors(req: Request, opts?: { allowCredentials?: boolean; allowMethods?: string[]; exposeHeaders?: string[]; allowHeaders?: string[] }) {
    const origin = resolveAllowedOrigin(req.headers.get('origin'));
    const headers = buildCorsHeaders(origin, opts);
    if (req.method === 'OPTIONS') {
        return { preflight: new Response(null, { status: 204, headers }) } as const;
    }
    return { headers } as const;
}
