import { fallbackOneShot } from '@/lib/ai/aiClient';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { sse } from '@/lib/http/sse';
import { recordError, recordFallback, recordRateLimitRejection, recordRouteLatency } from '@/lib/metrics/unified-metrics';
import { enforceProvenance, enforceProvenanceOnChunk } from '@/lib/middleware/provenance';
import { enforceTeamRateLimit, TeamRateLimitError } from '@/lib/rate-limit/team-rate-limit';
import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse, type NextRequest } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 45;

function estimateTokens(text: string): number {
    if (!text) return 0;
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words * 1.3);
}

export async function POST(req: NextRequest): Promise<Response> {
    const start = Date.now();
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            recordError('chat/admin/stream', '4xx_user');
            recordRouteLatency('chat/admin/stream', Date.now() - start);
            return new Response('Unauthorized', { status: 401 });
        }
        const idToken = authHeader.split(' ')[1];
        const decoded = await adminAuth.verifyIdToken(idToken);
        const uid = decoded.uid;

        const body = await req.json().catch(() => ({}));
        const { message, sessionId } = body as { message?: string; sessionId?: string };
        if (!message?.trim()) {
            recordError('chat/admin/stream', '4xx_user');
            recordRouteLatency('chat/admin/stream', Date.now() - start);
            return NextResponse.json(
                enforceProvenance({ error: 'Message required' }, { path: 'chat/admin/stream', note: 'validation' }),
                { status: 400 }
            );
        }

        // Optional team-aware rate limiting
        try {
            const userDoc = await adminDb.collection('users').doc(uid).get();
            const udata = userDoc.exists ? (userDoc.data() as Record<string, unknown>) : undefined;
            const teamId = typeof udata?.teamId === 'string' ? udata.teamId : undefined;
            if (teamId) {
                try { await enforceTeamRateLimit(adminDb, teamId, { routeKey: 'chat/admin/stream' }); }
                catch (e: unknown) {
                    if (e instanceof TeamRateLimitError) {
                        recordRateLimitRejection('chat/admin/stream');
                        recordRateLimitRejection(`team:${teamId}`);
                        recordRouteLatency('chat/admin/stream', Date.now() - start);
                        return new Response(
                            JSON.stringify(enforceProvenance({ error: 'rate_limited', retryAfter: e.retryAfterSeconds }, { path: 'chat/admin/stream', note: 'rate-limit' })),
                            { status: 429, headers: { 'Retry-After': String(e.retryAfterSeconds) } }
                        );
                    }
                }
            }
        } catch { /* ignore */ }

        // Determine session
        let currentSessionId = sessionId || '';
        if (!currentSessionId) {
            const latest = await adminDb.collection('adminChats').doc(uid).collection('sessions')
                .orderBy('lastActivity', 'desc').limit(1).get();
            if (latest.empty) {
                currentSessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            } else {
                currentSessionId = latest.docs[0].id;
            }
        }

        // Select provider (OpenAI when key available)
        const openaiKey = process.env.OPENAI_API_KEY;
        let provider: 'openai' | 'synthetic' = openaiKey ? 'openai' : 'synthetic';
        if (!openaiKey) recordFallback('admin_stream:no_openai_key');

        // Minimal circuit breaker (separate for admin stream)
        const now = Date.now();
        // @ts-ignore
        if (!(global as unknown).__adminOpenAICB) { (global as unknown).__adminOpenAICB = { fail: 0, until: 0 }; }
        // @ts-ignore
        const cb = (global as unknown).__adminOpenAICB as { fail: number; until: number };
        const circuitOpen = now < cb.until;
        if (provider === 'openai' && circuitOpen) { provider = 'synthetic'; recordFallback('admin_stream:circuit_open'); }

        return sse(req, async (client) => {
            try {
                client.send(enforceProvenanceOnChunk({ info: 'provider_selected', provider, provenance: provider === 'openai' ? 'live' : 'synthetic' }, { path: 'chat/admin/stream' }));

                let fullResponse = '';
                if (provider === 'openai') {
                    try {
                        const openai = new OpenAI({ apiKey: openaiKey! });
                        const stream = await openai.chat.completions.create({
                            model: 'gpt-4o-mini',
                            messages: [
                                { role: 'system', content: 'You are RankPilot Admin AI. Answer concisely.' },
                                { role: 'user', content: message }
                            ],
                            temperature: 0.2,
                            max_tokens: 600,
                            stream: true,
                        }) as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
                        for await (const part of stream) {
                            const token = part?.choices?.[0]?.delta?.content;
                            if (token) {
                                fullResponse += token;
                                client.send({ token, provenance: 'live' });
                            }
                        }
                        // reset CB on success
                        cb.fail = 0; cb.until = 0;
                    } catch {
                        // trip circuit after repeated failures
                        cb.fail = (cb.fail || 0) + 1;
                        if (cb.fail >= 4) { cb.until = Date.now() + 120000; cb.fail = 0; }
                        provider = 'synthetic';
                        recordFallback('admin_stream:openai_failure');
                    }
                }

                if (provider !== 'openai') {
                    // fallback one-shot
                    const text = await fallbackOneShot('You are RankPilot Admin AI. Answer concisely.', message, 600);
                    fullResponse = text;
                    client.send({ token: text, fallback: true, provenance: 'synthetic' });
                }

                // Persist
                try {
                    const tokensUsed = estimateTokens(fullResponse);
                    const msgCollection = adminDb.collection('adminChats').doc(uid).collection('sessions').doc(currentSessionId).collection('messages');
                    await msgCollection.add({
                        question: message,
                        response: fullResponse,
                        timestamp: FieldValue.serverTimestamp(),
                        tokensUsed,
                        chatType: 'admin',
                        metadata: { streamed: true, provider }
                    });
                    await adminDb.collection('adminChats').doc(uid).collection('sessions').doc(currentSessionId).set({
                        lastMessage: fullResponse.slice(0, 100),
                        lastActivity: FieldValue.serverTimestamp(),
                        messageCount: FieldValue.increment(1),
                        chatType: 'admin',
                        lastProvider: provider,
                        lastProviderAt: FieldValue.serverTimestamp(),
                    }, { merge: true });
                } catch { }

                client.send(enforceProvenanceOnChunk({ final: true, sessionId: currentSessionId, timestamp: new Date().toISOString(), tokensUsed: estimateTokens(fullResponse), provider, provenance: provider === 'openai' ? 'live' : 'synthetic' }, { path: 'chat/admin/stream' }));
                client.sendRaw('data: [DONE]\n\n');
                recordRouteLatency('chat/admin/stream', Date.now() - start);
                client.close();
            } catch (e: unknown) {
                recordError('chat/admin/stream', '5xx_server');
                const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : 'stream_error';
                client.send(enforceProvenanceOnChunk({ error: msg, provenance: 'synthetic' }, { path: 'chat/admin/stream' }));
                client.sendRaw('data: [DONE]\n\n');
                recordRouteLatency('chat/admin/stream', Date.now() - start);
                client.close();
            }
        }, { heartbeatMs: 15000 });
    } catch (e: unknown) {
        recordError('chat/admin/stream', '5xx_server');
        recordRouteLatency('chat/admin/stream', Date.now() - start);
        const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : 'Stream init failed';
        return NextResponse.json(
            enforceProvenance({ error: msg }, { path: 'chat/admin/stream', note: 'exception' }),
            { status: 500 }
        );
    }
}
