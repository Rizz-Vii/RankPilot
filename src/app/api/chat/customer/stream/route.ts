import { fallbackOneShot } from '@/lib/ai/aiClient';
import { maybeEmbedMessage } from '@/lib/chat/embedding';
import { buildQueryEmbedding, maybeClusterKeywords, retrieveSimilarMessages } from '@/lib/chat/retrievalAndClustering';
import { maybeSummarizeSession } from '@/lib/chat/sessionSummarizer';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { sse } from '@/lib/http/sse';
import { recordError, recordFallback, recordRateLimitRejection, recordRouteLatency } from '@/lib/metrics/unified-metrics';
import { enforceProvenance, enforceProvenanceOnChunk } from '@/lib/middleware/provenance';
import { enforceTeamRateLimit, TeamRateLimitError } from '@/lib/rate-limit/team-rate-limit';
import { retrieveSiteChunks } from '@/lib/site-ingestion/retrieval';
import { FieldValue } from 'firebase-admin/firestore';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Quota limits by tier (daily)
const QUOTA_LIMITS: Record<string, { messages: number; tokens: number }> = {
    free: { messages: 50, tokens: 15000 },
    starter: { messages: 200, tokens: 60000 },
    agency: { messages: 500, tokens: 150000 },
    enterprise: { messages: 2000, tokens: 600000 },
    admin: { messages: 10000, tokens: 2000000 },
};

// Lightweight typed aliases to avoid explicit `any` usage
type UsageCounter = {
    messages?: number;
    tokens?: number;
    tier?: string;
    date?: string;
    providerCounts?: Record<string, number>;
};

type SiteChunk = {
    score: number;
    meta?: { title?: string };
    content: string;
};

async function checkAndIncrementMessageQuota(uid: string, tier: string) {
    const limits = QUOTA_LIMITS[tier] || QUOTA_LIMITS.free;
    const dateKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const docRef = adminDb.collection('usageCounters').doc(`${uid}_${dateKey}`);
    await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        const data = snap.exists ? (snap.data() as UsageCounter) : { messages: 0, tokens: 0, tier, date: dateKey };
        if ((data.messages || 0) >= limits.messages) {
            throw new Error('Daily message quota reached');
        }
        tx.set(docRef, {
            messages: FieldValue.increment(1),
            tokens: (data.tokens || 0),
            tier,
            date: dateKey,
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
    });
}

async function incrementTokenUsage(uid: string, tier: string, tokens: number) {
    const dateKey = new Date().toISOString().slice(0, 10);
    const docRef = adminDb.collection('usageCounters').doc(`${uid}_${dateKey}`);
    const limits = QUOTA_LIMITS[tier] || QUOTA_LIMITS.free;
    await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        const data = snap.exists ? (snap.data() as UsageCounter) : { messages: 0, tokens: 0, tier, date: dateKey };
        if (((data.tokens || 0) + tokens) > limits.tokens) {
            // Mark as capped; still increment up to limit
            const remaining = Math.max(0, limits.tokens - (data.tokens || 0));
            if (remaining > 0) {
                tx.set(docRef, { tokens: FieldValue.increment(remaining), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
            }
            return;
        }
        tx.set(docRef, { tokens: FieldValue.increment(tokens), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    });
}

function estimateTokens(text: string): number {
    if (!text) return 0;
    // Rough heuristic (~1.3 tokens per word for English prose / mixed content)
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words * 1.3);
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

async function getUserTier(uid: string): Promise<string> {
    try {
        const snap = await adminDb.collection('users').doc(uid).get();
        return (snap.data()?.subscriptionTier as string) || 'free';
    } catch { return 'free'; }
}

// In-memory OpenAI failure tracking (simple circuit breaker)
let openAIConsecutiveFailures = 0;
let openAICircuitOpenUntil = 0; // epoch ms
const OPENAI_FAILURE_THRESHOLD = 5;
const OPENAI_CIRCUIT_DURATION_MS = 2 * 60 * 1000; // 2 minutes

function openAICircuitOpen() {
    return Date.now() < openAICircuitOpenUntil;
}

function recordOpenAISuccess() {
    openAIConsecutiveFailures = 0;
    openAICircuitOpenUntil = 0;
}

function recordOpenAIFailure() {
    openAIConsecutiveFailures++;
    if (openAIConsecutiveFailures >= OPENAI_FAILURE_THRESHOLD) {
        openAICircuitOpenUntil = Date.now() + OPENAI_CIRCUIT_DURATION_MS;
        openAIConsecutiveFailures = 0; // reset counter after tripping
    }
}

const sleep = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms));

export async function POST(req: NextRequest): Promise<Response> {
    const start = Date.now();
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            recordError('chat/customer/stream', '4xx_user');
            recordRouteLatency('chat/customer/stream', Date.now() - start);
            return new Response('Unauthorized', { status: 401 });
        }
        const idToken = authHeader.split(' ')[1];
        const decoded = await adminAuth.verifyIdToken(idToken);
        const uid = decoded.uid;

        const body = await req.json().catch(() => ({}));
        const { message, sessionId, url, teamId } = body as { message?: string; sessionId?: string; url?: string; teamId?: string };
        if (teamId) {
            try { await enforceTeamRateLimit(adminDb, teamId, { routeKey: 'chat/customer/stream' }); } catch (e: unknown) {
                if (e instanceof TeamRateLimitError) {
                    recordRateLimitRejection('chat/customer/stream');
                    recordRateLimitRejection(`team:${teamId}`);
                    recordRouteLatency('chat/customer/stream', Date.now() - start);
                    return new Response(JSON.stringify({ error: 'rate_limited', retryAfter: e.retryAfterSeconds }), { status: 429, headers: { 'Retry-After': String(e.retryAfterSeconds) } });
                }
            }
        }
        if (!message?.trim()) {
            recordError('chat/customer/stream', '4xx_user');
            recordRouteLatency('chat/customer/stream', Date.now() - start);
            return NextResponse.json(
                enforceProvenance({ error: 'Message required' }, { path: 'chat/customer/stream', note: 'validation' }),
                { status: 400 }
            );
        }

        const openaiKey = process.env.OPENAI_API_KEY; // may be absent; we will fallback
        const tier = await getUserTier(uid);
        const systemPrompt = `You are RankPilot AI (tier:${tier}). Provide concise, actionable SEO assistance. Use markdown. Also output a hidden JSON control block at the END of your response inside <rp_meta></rp_meta> tags with keys: intent(one of performance|keyword_strategy|structured_data|technical_seo|competitor|content_optimization|general), actions(string[] max 5 short imperatives), priority(integer 1-5).`;

        // Determine session early to fetch memory
        let currentSessionId = sessionId || '';
        if (!currentSessionId) {
            const latest = await adminDb.collection('chatLogs').doc(uid).collection('sessions')
                .orderBy('lastActivity', 'desc').limit(1).get();
            if (latest.empty) {
                currentSessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            } else {
                currentSessionId = latest.docs[0].id;
            }
        }
        // Load session memory summary/pending actions/keywords
        let memoryBlock = '';
        try {
            const sessDoc = await adminDb.collection('chatLogs').doc(uid).collection('sessions').doc(currentSessionId).get();
            if (sessDoc.exists) {
                const sData = sessDoc.data() as { sessionSummary?: string; pendingActions?: string[]; keywords?: string[] } | undefined;
                if (sData?.sessionSummary) memoryBlock += `\nConversation Memory Summary:\n${sData.sessionSummary}`;
                if (Array.isArray(sData?.pendingActions) && sData!.pendingActions!.length) memoryBlock += `\nPending Actions:\n- ${sData!.pendingActions!.slice(0, 8).join('\n- ')}`;
                if (Array.isArray(sData?.keywords) && sData!.keywords!.length) memoryBlock += `\nFocus Keywords: ${sData!.keywords!.slice(0, 5).join(', ')}`;
            }
        } catch { /* ignore */ }

        // Enforce daily message quota prior to token spend
        try { await checkAndIncrementMessageQuota(uid, tier); } catch (qErr: unknown) {
            recordError('chat/customer/stream', '4xx_user');
            recordRouteLatency('chat/customer/stream', Date.now() - start);
            const msg = qErr instanceof Error ? qErr.message : 'Quota exceeded';
            return NextResponse.json(
                enforceProvenance({ error: msg }, { path: 'chat/customer/stream', note: 'quota' }),
                { status: 429 }
            );
        }

        // Retrieval augmentation (if embeddings enabled)
        let retrievalBlock = '';
        let siteBlock = '';
        if (process.env.RANKPILOT_ENABLE_EMBEDDINGS === '1') {
            try {
                const qEmb = await buildQueryEmbedding(openaiKey || '', message);
                if (qEmb) {
                    const similar = await retrieveSimilarMessages({ uid, sessionId: currentSessionId, queryEmbedding: qEmb, topK: 3 });
                    if (similar.length) {
                        retrievalBlock = '\nRelevant Prior Exchanges (use insights, avoid repetition):\n' + similar.map(s => `Q: ${s.question}\nA: ${s.response.slice(0, 400)}`).join('\n---\n');
                    }
                    try {
                        const siteChunksResult = await retrieveSiteChunks({ uid, queryEmbedding: qEmb, topK: 4 });
                        const siteChunks = siteChunksResult.chunks || [];
                        if (siteChunks.length) {
                            siteBlock = '\nSite Knowledge Snippets (cite if used, prefer higher score):\n' + siteChunks.map((c: SiteChunk) => `• (${c.score.toFixed(2)}) ${c.meta?.title ? c.meta.title + ' - ' : ''}${c.content.slice(0, 260)}`).join('\n');
                        }
                    } catch { /* ignore site retrieval errors */ }
                }
            } catch { /* ignore retrieval errors */ }
        }
        // Token guard for context additions
        const MAX_CONTEXT_TOKENS = 900;
        function approxTokens(str: string) { return Math.ceil(str.split(/\s+/).length * 1.3); }
        let combined = `${memoryBlock}${siteBlock}${retrievalBlock}`;
        let totalTokens = approxTokens(combined);
        if (totalTokens > MAX_CONTEXT_TOKENS) {
            const segments: Array<{ label: string; value: string }> = [
                { label: 'memory', value: memoryBlock },
                { label: 'site', value: siteBlock },
                { label: 'retrieval', value: retrievalBlock }
            ];
            let kept = '';
            let used = 0;
            for (const seg of segments) {
                const segTokens = approxTokens(seg.value);
                if (!seg.value) continue;
                if (used + segTokens <= MAX_CONTEXT_TOKENS * 0.96) {
                    kept += seg.value;
                    used += segTokens;
                } else {
                    const remaining = Math.floor((MAX_CONTEXT_TOKENS * 0.96) - used);
                    if (remaining > 40) {
                        const words = seg.value.split(/\s+/).slice(0, Math.floor(remaining / 1.3));
                        kept += words.join(' ');
                    }
                    break;
                }
            }
            combined = kept;
        }
        const finalSystemPrompt = combined
            ? `${systemPrompt}${combined}\nIntegrate memory + site knowledge + prior dialog context. Avoid redundancy; cite site snippets when used.`
            : systemPrompt;

        let openAIStream: AsyncIterable<{ choices?: Array<{ delta?: { content?: string } }> }> | null = null;
        let provider: 'openai' | 'gemini' = 'gemini';
        if (openaiKey && !openAICircuitOpen()) {
            const maxAttempts = 3;
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                try {
                    const openai = new OpenAI({ apiKey: openaiKey });
                    openAIStream = (await openai.chat.completions.create({
                        model: 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: finalSystemPrompt },
                            { role: 'user', content: message }
                        ],
                        temperature: 0.2,
                        max_tokens: 800,
                        stream: true,
                    })) as unknown as AsyncIterable<{ choices?: Array<{ delta?: { content?: string } }> }>;
                    provider = 'openai';
                    recordOpenAISuccess();
                    break;
                } catch {
                    recordOpenAIFailure();
                    if (attempt < maxAttempts - 1) {
                        const delay = 100 * Math.pow(3, attempt); // 100, 300, 900
                        await sleep(delay);
                        continue;
                    }
                }
            }
        }
        if (!openAIStream) {
            provider = 'gemini';
        }

        // Record fallback if provider not OpenAI (either key missing, circuit open, or failures)
        if (provider !== 'openai') {
            const reason = openAICircuitOpen() ? 'circuit_open' : (openaiKey ? 'openai_failure' : 'no_openai_key');
            recordFallback(reason);
        }

        return sse(req, async (client) => {
            let fullResponse = '';
            let metaBuffer = '';
            let tokensUsed = 0;
            try {
        // Emit provider info early
                client.send(enforceProvenanceOnChunk({ info: 'provider_selected', provider, openaiCircuitOpen: openAICircuitOpen(), provenance: provider === 'openai' ? 'live' : 'synthetic' }, { path: 'chat/customer/stream' }));
                if (openAIStream) {
                    for await (const part of openAIStream) {
                        const content = part?.choices?.[0]?.delta?.content;
                        if (content) {
                            fullResponse += content;
                            client.send({ token: content, provenance: provider === 'openai' ? 'live' : 'synthetic' });
                        }
                    }
                } else {
                    // One-shot fallback (non-streaming)
                    fullResponse = await fallbackOneShot(finalSystemPrompt, message, 800);
                    client.send({ token: fullResponse, fallback: true, provenance: 'synthetic' });
                }
                // Persist conversation to Firestore
                try {
                    tokensUsed = estimateTokens(fullResponse);
                    let intent: string | undefined; let actions: string[] | undefined; let priority: number | undefined;
                    const metaMatch = fullResponse.match(/<rp_meta>([\s\S]*?)<\/rp_meta>/);
                    if (metaMatch) {
                        metaBuffer = metaMatch[1];
                        try {
                            const parsed = JSON.parse(metaBuffer.trim());
                            intent = parsed.intent;
                            actions = Array.isArray(parsed.actions) ? parsed.actions.slice(0, 5) : undefined;
                            priority = typeof parsed.priority === 'number' ? parsed.priority : undefined;
                            fullResponse = fullResponse.replace(metaMatch[0], '').trim();
                        } catch { /* ignore */ }
                    }
                    await incrementTokenUsage(uid, tier, tokensUsed);
                    const msgCollection = adminDb.collection('chatLogs').doc(uid).collection('sessions').doc(currentSessionId).collection('messages');
                    const addedRef = await msgCollection.add({
                        question: message,
                        response: fullResponse,
                        timestamp: FieldValue.serverTimestamp(),
                        tokensUsed,
                        chatType: 'customer',
                        metadata: { streamed: true, url: url || null, intent, actions, priority, provider, fallback: provider !== 'openai', openaiCircuitOpen: openAICircuitOpen() }
                    });
                    await adminDb.collection('chatLogs').doc(uid).collection('sessions').doc(currentSessionId).set({
                        lastMessage: fullResponse.slice(0, 100),
                        lastActivity: FieldValue.serverTimestamp(),
                        messageCount: FieldValue.increment(1),
                        chatType: 'customer',
                        lastProvider: provider,
                        lastProviderAt: FieldValue.serverTimestamp(),
                        openAICircuitOpen: openAICircuitOpen()
                    }, { merge: true });
                    // Provider usage analytics (per-day doc)
                    try {
                        const dateKey = new Date().toISOString().slice(0, 10);
                        await adminDb.collection('usageCounters').doc(`${uid}_${dateKey}`).set({ [`providerCounts.${provider}`]: FieldValue.increment(1) }, { merge: true });
                    } catch { }
                    void maybeSummarizeSession({ uid, sessionId: currentSessionId, latestUserMessage: message, latestAIResponse: fullResponse })
                        .then(r => { if (r.updated) { client.send({ info: 'summary_updated' }); } })
                        .catch(() => { });
                    maybeEmbedMessage({ uid, sessionId: currentSessionId, messageDocId: addedRef.id, question: message })
                        .then(() => openaiKey ? maybeClusterKeywords({ uid, sessionId: currentSessionId, apiKey: openaiKey }).catch(() => { }) : null)
                        .catch(() => { });
                } catch { /* ignore persistence errors */ }
                client.send(enforceProvenanceOnChunk({ final: true, sessionId: currentSessionId, timestamp: new Date().toISOString(), tokensUsed, provider, fallback: provider !== 'openai', openaiCircuitOpen: openAICircuitOpen(), provenance: provider === 'openai' ? 'live' : 'synthetic' }, { path: 'chat/customer/stream' }));
                client.sendRaw('data: [DONE]\n\n');
                recordRouteLatency('chat/customer/stream', Date.now() - start);
                client.close();
            } catch (err: unknown) {
                recordError('chat/customer/stream', '5xx_server');
                const msg = err instanceof Error ? err.message : 'stream_error';
                client.send(enforceProvenanceOnChunk({ error: msg, providerTried: provider, openAICircuitOpen: openAICircuitOpen(), provenance: 'synthetic' }, { path: 'chat/customer/stream' }));
                client.sendRaw('data: [DONE]\n\n');
                recordRouteLatency('chat/customer/stream', Date.now() - start);
                client.close();
            }
        }, { heartbeatMs: 15000 });
    } catch (e: unknown) {
        recordError('chat/customer/stream', '5xx_server');
        recordRouteLatency('chat/customer/stream', Date.now() - start);
        return NextResponse.json(
            enforceProvenance({ error: e instanceof Error ? e.message : String(e ?? 'Stream init failed') }, { path: 'chat/customer/stream', note: 'exception' }),
            { status: 500 }
        );
    }
}
