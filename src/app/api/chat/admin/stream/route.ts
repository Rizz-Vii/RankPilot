import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { enforceProvenanceOnChunk } from '@/lib/middleware/provenance';
import { recordRouteLatency, recordError, recordFallback, recordRateLimitRejection } from '@/lib/metrics/unified-metrics';
import { enforceTeamRateLimit, TeamRateLimitError } from '@/lib/rate-limit/team-rate-limit';
import { fallbackOneShot } from '@/lib/ai/aiClient';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function estimateTokens(text: string): number {
    if (!text) return 0;
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words * 1.3);
}

export async function POST(req: NextRequest) {
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
            return NextResponse.json({ error: 'Message required' }, { status: 400 });
        }

        // Optional team-aware rate limiting
        try {
            const userDoc = await adminDb.collection('users').doc(uid).get();
            const teamId = userDoc.exists ? (userDoc.data() as any)?.teamId : undefined;
            if (teamId) {
                try { await enforceTeamRateLimit(adminDb as any, teamId, { routeKey: 'chat/admin/stream' }); }
                catch (e: any) {
                    if (e instanceof TeamRateLimitError) {
                        recordRateLimitRejection('chat/admin/stream');
                        recordRateLimitRejection(`team:${teamId}`);
                        recordRouteLatency('chat/admin/stream', Date.now() - start);
                        return new Response(JSON.stringify({ error: 'rate_limited', retryAfter: e.retryAfterSeconds }), { status: 429, headers: { 'Retry-After': String(e.retryAfterSeconds) } });
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
        if (!(global as any).__adminOpenAICB) { (global as any).__adminOpenAICB = { fail: 0, until: 0 }; }
        // @ts-ignore
        const cb = (global as any).__adminOpenAICB as { fail: number; until: number };
        const circuitOpen = now < cb.until;
        if (provider === 'openai' && circuitOpen) { provider = 'synthetic'; recordFallback('admin_stream:circuit_open'); }

        // Streaming response (SSE)
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            async start(controller) {
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(enforceProvenanceOnChunk({ info: 'provider_selected', provider, provenance: provider === 'openai' ? 'live' : 'synthetic' }, { path: 'chat/admin/stream' }))}\n\n`));

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
                            }) as any;
                            for await (const part of stream) {
                                const token = part?.choices?.[0]?.delta?.content;
                                if (token) {
                                    fullResponse += token;
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token, provenance: 'live' })}\n\n`));
                                }
                            }
                            // reset CB on success
                            cb.fail = 0; cb.until = 0;
                        } catch (e) {
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
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: text, fallback: true, provenance: 'synthetic' })}\n\n`));
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

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(enforceProvenanceOnChunk({ final: true, sessionId: currentSessionId, timestamp: new Date().toISOString(), tokensUsed: estimateTokens(fullResponse), provider, provenance: provider === 'openai' ? 'live' : 'synthetic' }, { path: 'chat/admin/stream' }))}\n\n`));
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                } catch (e: any) {
                    recordError('chat/admin/stream', '5xx_server');
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(enforceProvenanceOnChunk({ error: e?.message || 'stream_error', provenance: 'synthetic' }, { path: 'chat/admin/stream' }))}\n\n`));
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                }
            }
        });

        const response = new Response(readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'Transfer-Encoding': 'chunked'
            }
        });
        recordRouteLatency('chat/admin/stream', Date.now() - start);
        return response;
    } catch (e: any) {
        recordError('chat/admin/stream', '5xx_server');
        recordRouteLatency('chat/admin/stream', Date.now() - start);
        return NextResponse.json({ error: e?.message || 'Stream init failed' }, { status: 500 });
    }
}
