import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { generateInsights as aiGenerateInsights } from '@/ai/flows/generate-insights';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ActivityLite { type: string; tool: string; details?: any; resultsSummary?: string; }

async function fetchRecentActivities(uid: string, limit = 25): Promise<ActivityLite[]> {
    try {
        const colRef = adminDb.collection('users').doc(uid).collection('activities');
        const snap = await colRef.orderBy('timestamp', 'desc').limit(limit).get();
        return snap.docs.map(d => {
            const data = d.data() as any; return { type: data.type || 'unknown', tool: data.tool || 'unknown', details: data.details, resultsSummary: data.resultsSummary };
        });
    } catch { return []; }
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
                function send(obj: any) { controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)); }
                send({ type: 'init', activityCount: activities.length });

                // If no activities, end early
                if (!activities.length) {
                    send({ type: 'final', insights: [] });
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                    return;
                }

                // Emit activities in small batches for progressive UI enrichment
                const batchSize = 5;
                for (let i = 0; i < activities.length; i += batchSize) {
                    const batch = activities.slice(i, i + batchSize);
                    send({ type: 'activity_batch', batch });
                    await new Promise(r => setTimeout(r, 120));
                }

                // Run AI flow (non-stream) then emit each insight one by one
                try {
                    const aiResult = await aiGenerateInsights({ activities: activities.slice(0, 20) });
                    for (const insight of aiResult.insights) {
                        send({ type: 'insight', insight });
                        await new Promise(r => setTimeout(r, 80));
                    }
                    send({ type: 'final', total: aiResult.insights.length });
                } catch (e: any) {
                    send({ type: 'error', message: e?.message || 'insight_generation_failed' });
                } finally {
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                }
            }
        });

        return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive' } });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e?.message || 'stream_init_failed' }), { status: 500 });
    }
}
