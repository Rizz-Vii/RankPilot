import { generateInsights as aiGenerateInsights } from '@/ai/flows/generate-insights';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { handleCors } from '@/lib/http/cors';
import { sse } from '@/lib/http/sse';
import { enforceProvenanceOnChunk } from '@/lib/middleware/provenance';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 45;

interface ActivityLite { type: string; tool: string; details?: unknown; resultsSummary?: string; }

async function fetchRecentActivities(uid: string, limit = 25): Promise<ActivityLite[]> {
    try {
        const colRef = adminDb.collection('users').doc(uid).collection('activities');
        const snap = await colRef.orderBy('timestamp', 'desc').limit(limit).get();
        return snap.docs.map((d) => {
            const data = d.data() as Record<string, unknown> | undefined;
            return {
                type: typeof data?.['type'] === 'string' ? (data?.['type'] as string) : 'unknown',
                tool: typeof data?.['tool'] === 'string' ? (data?.['tool'] as string) : 'unknown',
                details: data?.details,
                resultsSummary:
                  typeof data?.['resultsSummary'] === 'string' ? (data?.['resultsSummary'] as string) : undefined,
            };
        });
    } catch {
        // On any failure return an empty list (caller handles empty state)
        return [];
    }
}

export async function GET(req: NextRequest) {
    // CORS
    const cors = handleCors(req, { allowMethods: ['GET', 'OPTIONS'] });
    if ('preflight' in cors) return cors.preflight;
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return new Response('Unauthorized', { status: 401, headers: cors.headers });
    }
    try {
        const idToken = authHeader.split(' ')[1];
        const decoded = await adminAuth.verifyIdToken(idToken);
        const uid = decoded.uid;

        const activities = await fetchRecentActivities(uid);

        return sse(req, async (client) => {
            const send = (obj: Record<string, unknown>, note?: string) => {
                const payload = enforceProvenanceOnChunk(obj, { path: 'insights/stream', note });
                client.send(payload);
            };
            send({ type: 'init', activityCount: activities.length, provenance: 'live' });

            if (!activities.length) {
                send({ type: 'final', insights: [], provenance: 'live' });
                client.sendRaw('data: [DONE]\n\n');
                client.close();
                return;
            }

            const batchSize = 5;
            for (let i = 0; i < activities.length; i += batchSize) {
                const batch = activities.slice(i, i + batchSize);
                send({ type: 'activity_batch', batch });
                await new Promise((resolve) => setTimeout(resolve, 120));
            }

            try {
                const aiResult = await aiGenerateInsights({ activities: activities.slice(0, 20) });
                for (const insight of aiResult.insights) {
                    send({ type: 'insight', insight });
                    await new Promise((resolve) => setTimeout(resolve, 80));
                }
                send({ type: 'final', total: aiResult.insights.length });
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                send({ type: 'error', message: msg || 'insight_generation_failed', provenance: 'synthetic' });
            } finally {
                client.sendRaw('data: [DONE]\n\n');
                client.close();
            }
        }, { headers: cors.headers, heartbeatMs: 15000 });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        const payload = enforceProvenanceOnChunk(
            { error: msg || 'stream_init_failed', provenance: 'synthetic' },
            { path: 'insights/stream', note: 'init-failure' }
        );
        return new Response(JSON.stringify(payload), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors.headers } });
    }
}
export async function OPTIONS(req: NextRequest) {
    const cors = handleCors(req, { allowMethods: ['GET', 'OPTIONS'] });
    return 'preflight' in cors ? cors.preflight : new Response(null, { status: 204, headers: cors.headers });
}
