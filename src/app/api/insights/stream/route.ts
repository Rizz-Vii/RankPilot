import type { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { generateInsights as aiGenerateInsights } from '@/ai/flows/generate-insights';
import { enforceProvenanceOnChunk } from '@/lib/middleware/provenance';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ActivityLite { type: string; tool: string; details?: unknown; resultsSummary?: string; }

async function fetchRecentActivities(uid: string, limit = 25): Promise<ActivityLite[]> {
    try {
        const colRef = adminDb.collection('users').doc(uid).collection('activities');
        const snap = await colRef.orderBy('timestamp', 'desc').limit(limit).get();
        return snap.docs.map((d) => {
            const data = d.data() as Record<string, unknown> | undefined;
            return {
                type: (data as any)?.type || 'unknown',
                tool: (data as any)?.tool || 'unknown',
                details: data?.details,
                resultsSummary: (data as any)?.resultsSummary,
            };
        });
    } catch (e: unknown) {
        // On any failure return an empty list (caller handles empty state)
        return [];
    }
}

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return new Response('Unauthorized', { status: 401 });
    }
    try {
        const idToken = authHeader.split(' ')[1];
        const decoded = await adminAuth.verifyIdToken(idToken);
        const uid = decoded.uid;

        const activities = await fetchRecentActivities(uid);

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                let closed = false;
                const safeEnqueue = (chunk: string) => {
                    if (closed) return;
                    try {
                        controller.enqueue(encoder.encode(chunk));
                    } catch {
                        closed = true;
                        try {
                            controller.close();
                        } catch {
                            // ignore close errors
                        }
                    }
                };
                const safeClose = () => {
                    if (closed) return;
                    closed = true;
                    try {
                        controller.close();
                    } catch {
                        // ignore close errors
                    }
                };
                const send = (obj: Record<string, unknown>, note?: string) => {
                    const payload = enforceProvenanceOnChunk(obj, { path: 'insights/stream', note });
                    safeEnqueue(`data: ${JSON.stringify(payload)}\n\n`);
                };
                send({ type: 'init', activityCount: activities.length, provenance: 'live' });

                // If no activities, end early
                if (!activities.length) {
                    send({ type: 'final', insights: [], provenance: 'live' });
                    safeEnqueue('data: [DONE]\n\n');
                    safeClose();
                    return;
                }

                // Emit activities in small batches for progressive UI enrichment
                const batchSize = 5;
                for (let i = 0; i < activities.length; i += batchSize) {
                    const batch = activities.slice(i, i + batchSize);
                    send({ type: 'activity_batch', batch });
                    await new Promise((resolve) => setTimeout(resolve, 120));
                }

                // Run AI flow (non-stream) then emit each insight one by one
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
                    safeEnqueue('data: [DONE]\n\n');
                    safeClose();
                }
            }
        });

        const res = new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive',
            },
        });
        // Abort handling (only if request supports signal)
        const signal = (req as unknown as { signal?: AbortSignal }).signal;
        if (signal) {
            signal.addEventListener('abort', () => {
                // stream will naturally end on client disconnect
            });
        }
        return res;
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        const payload = enforceProvenanceOnChunk(
            { error: msg || 'stream_init_failed', provenance: 'synthetic' },
            { path: 'insights/stream', note: 'init-failure' }
        );
        return new Response(JSON.stringify(payload), { status: 500 });
    }
}
