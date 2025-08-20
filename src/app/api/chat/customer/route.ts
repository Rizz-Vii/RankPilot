/**
 * RankPilot Customer Chatbot API Route
 * Verifies auth and proxies to Firebase Functions HTTPS endpoint
 */

import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { buildQueryEmbedding, retrieveSimilarMessages } from '@/lib/chat/retrievalAndClustering';
import { maybeEmbedMessage } from '@/lib/chat/embedding';
import { maybeSummarizeSession } from '@/lib/chat/sessionSummarizer';
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { safeErrorMessage } from '@/lib/utils';
import { enforceProvenance, withProvenance } from '@/lib/middleware/provenance';
import { recordRouteLatency, recordError, recordRateLimitRejection } from '@/lib/metrics/unified-metrics';
import { enforceTeamRateLimit, TeamRateLimitError } from '@/lib/rate-limit/team-rate-limit';

// Force dynamic to avoid any accidental caching of auth state in edge/runtime
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Types
interface ChatRequest {
    message?: string; // optional when uploading attachments only
    url?: string;
    sessionId?: string;
    attachments?: { type: 'image' | 'audio'; mediaUrl: string; name?: string }[];
}

interface ChatResponse {
    response: string;
    sessionId: string;
    timestamp: string;
    tokensUsed: number;
    context: {
        type: string;
        dataUsed: string[];
    };
}

// Shared quota limits (align with streaming route)
const QUOTA_LIMITS: Record<string, { messages: number; tokens: number }> = {
    free: { messages: 50, tokens: 15000 },
    starter: { messages: 200, tokens: 60000 },
    agency: { messages: 500, tokens: 150000 },
    enterprise: { messages: 2000, tokens: 600000 },
    admin: { messages: 10000, tokens: 2000000 },
};

async function getUserTier(uid: string): Promise<string> {
    try {
        const snap = await adminDb.collection('users').doc(uid).get();
        return (snap.data()?.subscriptionTier as string) || 'free';
    } catch { return 'free'; }
}

async function checkAndIncrementMessageQuota(uid: string, tier: string) {
    const limits = QUOTA_LIMITS[tier] || QUOTA_LIMITS.free;
    const dateKey = new Date().toISOString().slice(0, 10);
    const ref = adminDb.collection('usageCounters').doc(`${uid}_${dateKey}`);
    await adminDb.runTransaction(async tx => {
        type UsageData = { messages?: number; tokens?: number; tier?: string; date?: string };
        const snap = await tx.get(ref);
        const data = snap.exists ? (snap.data() as UsageData) : { messages: 0, tokens: 0, tier, date: dateKey };
        if ((data.messages || 0) >= limits.messages) throw new Error('Daily message quota reached');
        tx.set(ref, { messages: FieldValue.increment(1), tokens: data.tokens || 0, tier, date: dateKey, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    });
}

async function incrementTokenUsage(uid: string, tier: string, tokens: number) {
    if (!tokens) return;
    const dateKey = new Date().toISOString().slice(0, 10);
    const ref = adminDb.collection('usageCounters').doc(`${uid}_${dateKey}`);
    const limits = QUOTA_LIMITS[tier] || QUOTA_LIMITS.free;
    await adminDb.runTransaction(async tx => {
        type UsageData = { messages?: number; tokens?: number; tier?: string; date?: string };
        const snap = await tx.get(ref);
        const data = snap.exists ? (snap.data() as UsageData) : { messages: 0, tokens: 0, tier, date: dateKey };
        if ((data.tokens || 0) >= limits.tokens) return; // already capped
        const remaining = limits.tokens - (data.tokens || 0);
        const toAdd = Math.min(remaining, tokens);
        if (toAdd <= 0) return;
        tx.set(ref, { tokens: FieldValue.increment(toAdd), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    });
}

function estimateTokens(text: string): number {
    if (!text) return 0;
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words * 1.3);
}

export const POST = withProvenance(async function POST(request: NextRequest) {
    const start = Date.now();
    try {
        // Parse request body (defensive)
        let body: ChatRequest;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        const { message, url, sessionId, attachments } = body || {} as ChatRequest;

        const isAttachmentOnly = (!message || !message.trim()) && Array.isArray(attachments) && attachments.length > 0;
        if (!isAttachmentOnly && !message?.trim()) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // Get user from authentication header
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Authentication required: missing Bearer token' },
                { status: 401 }
            );
        }

        const idToken = authHeader.split(' ')[1];
        if (!idToken) {
            return NextResponse.json({ error: 'Authentication required: empty token' }, { status: 401 });
        }

        // Verify ID token and get UID
        let uid: string;
        try {
            const decoded = await adminAuth.verifyIdToken(idToken);
            uid = decoded.uid;
        } catch (e: unknown) {
            return NextResponse.json({ error: 'Invalid or expired token. Try reloading to refresh your session.', details: process.env.NODE_ENV !== 'production' ? safeErrorMessage(e) : undefined }, { status: 401 });
        }

        // Load user doc (for teamId before any limiting)
        let userDoc: FirebaseFirestore.DocumentSnapshot | null = null;
        let teamId: string | undefined;
        try {
            userDoc = await adminDb.collection('users').doc(uid).get();
            const ud = userDoc.exists ? (userDoc.data() as Record<string, unknown>) : undefined;
            teamId = typeof ud?.teamId === 'string' ? ud.teamId : undefined;
        } catch { /* ignore */ }

        // Team-aware rate limiting (Phase 1 PERF-01)
        if (teamId) {
            try {
                await enforceTeamRateLimit(adminDb as any, teamId, { routeKey: 'chat/customer' });
            } catch (e: unknown) {
                if (e instanceof TeamRateLimitError) {
                    recordRateLimitRejection('chat/customer');
                    recordRateLimitRejection(`team:${teamId}`);
                    recordRouteLatency('chat/customer', Date.now() - start);
                    return NextResponse.json(enforceProvenance({ error: 'rate_limited', retryAfter: e.retryAfterSeconds, provenance: 'synthetic' }, { path: 'chat/customer' }), { status: 429, headers: { 'Retry-After': String(e.retryAfterSeconds) } });
                }
            }
        }

        // Attachment-only persistence flow (no AI call)
        if (isAttachmentOnly) {
            const collectionName = 'chatLogs';
            let currentSessionId = sessionId || '';
            if (!currentSessionId) {
                const latestSessionSnap = await adminDb
                    .collection(collectionName)
                    .doc(uid)
                    .collection('sessions')
                    .orderBy('lastActivity', 'desc')
                    .limit(1)
                    .get();
                if (latestSessionSnap.empty) {
                    currentSessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
                } else {
                    currentSessionId = latestSessionSnap.docs[0].id;
                }
            }

            const batch = adminDb.batch();
            attachments!.forEach(att => {
                const msgRef = adminDb
                    .collection(collectionName)
                    .doc(uid)
                    .collection('sessions')
                    .doc(currentSessionId)
                    .collection('messages')
                    .doc();
                batch.set(msgRef, {
                    question: '',
                    response: '',
                    timestamp: new Date(),
                    chatType: 'customer',
                    tokensUsed: 0,
                    isAttachment: true,
                    attachmentType: att.type,
                    mediaUrl: att.mediaUrl,
                    originalName: att.name || null,
                });
            });
            const sessionRef = adminDb
                .collection(collectionName)
                .doc(uid)
                .collection('sessions')
                .doc(currentSessionId);
            batch.set(sessionRef, {
                lastActivity: new Date(),
                chatType: 'customer',
            }, { merge: true });
            await batch.commit();
            const resp = NextResponse.json(enforceProvenance({ success: true, sessionId: currentSessionId, provenance: 'live' }, { path: 'chat/customer' }));
            recordRouteLatency('chat/customer', Date.now() - start);
            return resp;
        }

        // Call the callable HTTPS endpoint so request.auth is populated server-side
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rankpilot-h3jpc';
        const region = 'australia-southeast2';
        const useEmulator = false; // Force production Functions URL when testing locally without emulators
        const emulatorHost = process.env.FUNCTIONS_EMULATOR_HOST || 'localhost';
        const emulatorPort = process.env.FUNCTIONS_EMULATOR_PORT || '5001';
        const functionUrl = useEmulator
            ? `http://${emulatorHost}:${emulatorPort}/${projectId}/${region}/customerChatHandler`
            : `https://${region}-${projectId}.cloudfunctions.net/customerChatHandler`;

        let res: Response;
        try {
            res = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    data: { uid, message, url, sessionId, chatType: 'customer' }
                }),
            });
        } catch (e: unknown) {
            return NextResponse.json({ error: 'Chat service unreachable', details: process.env.NODE_ENV !== 'production' ? safeErrorMessage(e) : undefined }, { status: 503 });
        }

        const rawText = await res.text();
        let payload: unknown = null;
        try {
            payload = rawText ? JSON.parse(rawText) : null;
        } catch {
            // Not JSON; likely HTML or error text
        }

        if (!res.ok) {
            const p = payload as unknown;
            function extractErrorMessage(obj: unknown): string | undefined {
                if (!obj || typeof obj !== 'object') return undefined;
                const o = obj as Record<string, unknown>;
                if ('error' in o) {
                    const err = o.error;
                    if (typeof err === 'string') return err;
                    if (err && typeof err === 'object') {
                        const em = (err as Record<string, unknown>).message;
                        if (typeof em === 'string') return em;
                    }
                }
                if ('result' in o && o.result && typeof o.result === 'object') {
                    const r = o.result as Record<string, unknown>;
                    if ('error' in r && r.error && typeof r.error === 'object') {
                        const em = (r.error as Record<string, unknown>).message;
                        if (typeof em === 'string') return em;
                    }
                }
                return undefined;
            }
            const extracted = extractErrorMessage(p);
            const errMsg = extracted || ((rawText || '').slice(0, 200) || 'Chat service unavailable');
            const code = res.status === 401 ? 401 : res.status === 403 ? 403 : res.status === 400 ? 400 : 503;
            // Provide helpful hints for common 401/403 causes during local dev
            const hint = code === 401
                ? ' (auth failed: ensure you are signed in; token may be expired)'
                : code === 403
                    ? ' (forbidden: check Function auth and App Check settings)'
                    : '';
            const resp = NextResponse.json(enforceProvenance({ error: `${errMsg}${hint}`, upstreamStatus: res.status, provenance: 'synthetic' }, { path: 'chat/customer' }), { status: code });
            if (code >= 500) recordError('chat/customer', '5xx_server'); else if (code >= 400) recordError('chat/customer', '4xx_user');
            recordRouteLatency('chat/customer', Date.now() - start);
            return resp;
        }

        const anyPayload = payload as unknown;
        let data: ChatResponse | undefined = undefined;
        if (anyPayload && typeof anyPayload === 'object') {
            const ap = anyPayload as Record<string, unknown>;
            if (ap.result && typeof ap.result === 'object') {
                data = ap.result as ChatResponse;
            } else if (ap.data && typeof ap.data === 'object') {
                data = ap.data as ChatResponse;
            } else if (typeof ap.response === 'string' || typeof ap.sessionId === 'string') {
                data = ap as ChatResponse;
            }
        }
        if (!data) {
            recordError('chat/customer', '5xx_server');
            recordRouteLatency('chat/customer', Date.now() - start);
            return NextResponse.json(enforceProvenance({ error: 'Invalid response from chat service', provenance: 'synthetic' }, { path: 'chat/customer' }), { status: 502 });
        }

        // Attempt meta extraction (same pattern as streaming if model returned hidden tags)
        let intent: string | undefined; let actions: string[] | undefined; let priority: number | undefined;
        const metaMatch = data.response?.match?.(/<rp_meta>([\s\S]*?)<\/rp_meta>/);
        if (metaMatch) {
            try {
                const parsed: unknown = JSON.parse(metaMatch[1].trim());
                if (parsed && typeof parsed === 'object') {
                    const p = parsed as Record<string, unknown>;
                    intent = typeof p.intent === 'string' ? p.intent : undefined;
                    actions = Array.isArray(p.actions) ? p.actions.filter(a => typeof a === 'string').slice(0, 5) as string[] : undefined;
                    priority = typeof p.priority === 'number' ? p.priority : undefined;
                    data = { ...data, response: data.response.replace(metaMatch[0], '').trim() };
                }
            } catch { /* ignore */ }
        }

        // Retrieval augmentation for next turn: embed current question (if embeddings enabled) and store metadata
        if (process.env.RANKPILOT_ENABLE_EMBEDDINGS === '1' && data.sessionId && message) {
            // Fire-and-forget embedding
            const sessionDocRef = adminDb.collection('chatLogs').doc(uid).collection('sessions').doc(data.sessionId);
            try {
                // Persist message doc (non-stream path may not yet have stored this Q/A pair)
                const msgRef = await sessionDocRef.collection('messages').add({
                    question: message,
                    response: data.response,
                    timestamp: FieldValue.serverTimestamp(),
                    tokensUsed: data.tokensUsed || estimateTokens(data.response),
                    chatType: 'customer',
                    metadata: { streamed: false, intent, actions, priority }
                });
                sessionDocRef.set({
                    lastMessage: data.response.slice(0, 100),
                    lastActivity: FieldValue.serverTimestamp(),
                    messageCount: FieldValue.increment(1),
                    chatType: 'customer'
                }, { merge: true });
                maybeEmbedMessage({ uid, sessionId: data.sessionId, messageDocId: msgRef.id, question: message }).catch(() => { });
            } catch { /* ignore */ }
        }

        // Quota enforcement (post-response ensures not blocking messaging if function consumed; small risk of overage on race)
        let quotaWarning: string | undefined;
        try {
            const tier = await getUserTier(uid);
            await checkAndIncrementMessageQuota(uid, tier);
            const estTokens = data.tokensUsed || estimateTokens(data.response);
            await incrementTokenUsage(uid, tier, estTokens);
        } catch (quotaErr: unknown) {
            quotaWarning = safeErrorMessage(quotaErr);
        }

        if (data.sessionId) {
            // Fire-and-forget summarization
            maybeSummarizeSession({ uid, sessionId: data.sessionId, latestUserMessage: body.message, latestAIResponse: data.response }).catch(() => { });
        }

        if (quotaWarning) {
            const resp = NextResponse.json(enforceProvenance({ ...data, quotaWarning, provenance: 'live' }, { path: 'chat/customer' }), { status: 200, headers: { 'X-Quota-Warning': quotaWarning } });
            recordRouteLatency('chat/customer', Date.now() - start);
            return resp;
        }
        const resp = NextResponse.json(enforceProvenance({ ...data, provenance: 'live' }, { path: 'chat/customer' }));
        recordRouteLatency('chat/customer', Date.now() - start);
        return resp;

    } catch (error: unknown) {
        console.error('Customer chat API error:', error);

        // Handle Firebase Function errors
        if (error && typeof error === 'object' && 'code' in error) {
            const fe = error as Record<string, unknown>;
            const code = typeof fe.code === 'string' ? fe.code : undefined;

            switch (code) {
                case 'unauthenticated':
                    recordError('chat/customer', '4xx_user');
                    return NextResponse.json(enforceProvenance({ error: 'Authentication required', provenance: 'synthetic' }, { path: 'chat/customer' }), { status: 401 });
                case 'permission-denied':
                    recordError('chat/customer', '4xx_user');
                    return NextResponse.json(enforceProvenance({ error: 'Permission denied', provenance: 'synthetic' }, { path: 'chat/customer' }), { status: 403 });
                case 'invalid-argument':
                    recordError('chat/customer', '4xx_user');
                    return NextResponse.json(enforceProvenance({ error: 'Invalid request data', provenance: 'synthetic' }, { path: 'chat/customer' }), { status: 400 });
                default:
                    recordError('chat/customer', '5xx_server');
                    return NextResponse.json(enforceProvenance({ error: 'Chat service unavailable', provenance: 'synthetic' }, { path: 'chat/customer' }), { status: 503 });
            }
        }

        recordError('chat/customer', '5xx_server');
        recordRouteLatency('chat/customer', Date.now() - start);
        return NextResponse.json(enforceProvenance({ error: 'Internal server error', details: process.env.NODE_ENV !== 'production' ? safeErrorMessage(error) : undefined, provenance: 'synthetic' }, { path: 'chat/customer' }), { status: 500 });
    }
}, { path: 'chat/customer' });

// GET endpoint for chat history (customer)
export const GET = withProvenance(async function GET(request: NextRequest) {
    const start = Date.now();
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');
        const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
        const before = searchParams.get('before'); // ISO timestamp of earliest currently loaded message

        // Get user from authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            recordError('chat/customer', '4xx_user');
            return NextResponse.json(enforceProvenance({ error: 'Authentication required', provenance: 'synthetic' }, { path: 'chat/customer' }), { status: 401 });
        }

        const idToken = authHeader.split(' ')[1];
        const decoded = await adminAuth.verifyIdToken(idToken);
        const uid = decoded.uid;

        const collectionName = 'chatLogs';

        // Determine session
        let currentSessionId = sessionId || '';
        if (!currentSessionId) {
            const latestSessionSnap = await adminDb
                .collection(collectionName)
                .doc(uid)
                .collection('sessions')
                .orderBy('lastActivity', 'desc')
                .limit(1)
                .get();

            if (latestSessionSnap.empty) {
                return NextResponse.json({ messages: [], sessionId: null, hasMore: false });
            }
            currentSessionId = latestSessionSnap.docs[0].id;
        }

        // Build base query
        let queryRef: FirebaseFirestore.Query = adminDb
            .collection(collectionName)
            .doc(uid)
            .collection('sessions')
            .doc(currentSessionId)
            .collection('messages')
            .orderBy('timestamp', 'desc');

        if (before) {
            const beforeDate = new Date(before);
            if (!isNaN(beforeDate.getTime())) {
                queryRef = queryRef.where('timestamp', '<', beforeDate);
            }
        }

        // Fetch (grab one extra to determine hasMore)
        const messagesSnap = await queryRef.limit(limit + 1).get();

        let hasMore = false;
        let workingDocs = messagesSnap.docs;
        if (messagesSnap.size > limit) {
            hasMore = true;
            workingDocs = messagesSnap.docs.slice(0, limit);
        }

        const messages: unknown[] = [];
        // Reverse to chronological ascending (oldest first within this page)
        const orderedDocs = [...workingDocs].reverse();
        orderedDocs.forEach((doc) => {
            const d = doc.data() as Record<string, unknown>;
            let ts = new Date().toISOString();
            if (d.timestamp && typeof d.timestamp === 'object' && 'toDate' in d.timestamp && typeof ((d.timestamp as { toDate?: unknown }).toDate) === 'function') {
                try {
                    ts = (d.timestamp as { toDate: () => Date }).toDate().toISOString();
                } catch { ts = new Date().toISOString(); }
            }
            if (d.isAttachment) {
                messages.push({
                    id: `${doc.id}_att`,
                    message: (typeof d.originalName === 'string' && d.originalName) || (typeof d.attachmentType === 'string' ? d.attachmentType : ''),
                    response: '',
                    timestamp: ts,
                    isUser: true,
                    type: typeof d.attachmentType === 'string' ? d.attachmentType : undefined,
                    mediaUrl: typeof d.mediaUrl === 'string' ? d.mediaUrl : undefined,
                });
                return; // skip pairing
            }
            if (typeof d.question === 'string') {
                messages.push({
                    id: `${doc.id}_user`,
                    message: d.question,
                    response: '',
                    timestamp: ts,
                    isUser: true,
                });
            }
            messages.push({
                id: `${doc.id}_ai`,
                message: '',
                response: typeof d.response === 'string' ? d.response : '',
                timestamp: ts,
                isUser: false,
                tokensUsed: typeof d.tokensUsed === 'number' ? d.tokensUsed : 0,
            });
        });
        // hasMore already computed

        // Fetch session summary/meta
        let sessionSummary: string | undefined; let pendingActions: string[] | undefined; let keywords: string[] | undefined; let summaryUpdatedAt: string | undefined;
        try {
            const sessionDoc = await adminDb.collection(collectionName).doc(uid).collection('sessions').doc(currentSessionId).get();
            if (sessionDoc.exists) {
                const sData = sessionDoc.data() as Record<string, unknown>;
                sessionSummary = typeof sData.sessionSummary === 'string' ? sData.sessionSummary : undefined;
                pendingActions = Array.isArray(sData.pendingActions) ? sData.pendingActions.filter(a => typeof a === 'string') as string[] : undefined;
                keywords = Array.isArray(sData.keywords) ? sData.keywords.filter(k => typeof k === 'string') as string[] : undefined;
                if (sData.summaryUpdatedAt && typeof sData.summaryUpdatedAt === 'object' && 'toDate' in sData.summaryUpdatedAt && typeof ((sData.summaryUpdatedAt as { toDate?: unknown }).toDate) === 'function') {
                    summaryUpdatedAt = (sData.summaryUpdatedAt as { toDate: () => Date }).toDate().toISOString();
                } else {
                    summaryUpdatedAt = undefined;
                }
            }
        } catch { /* ignore */ }

        const resp = NextResponse.json(enforceProvenance({
            messages,
            sessionId: currentSessionId,
            hasMore,
            sessionSummary,
            pendingActions,
            keywords,
            summaryUpdatedAt,
            provenance: 'live'
        }, { path: 'chat/customer' }));
        recordRouteLatency('chat/customer', Date.now() - start);
        return resp;

    } catch (error) {
        console.error('Chat history API error:', error);
        recordError('chat/customer', '5xx_server');
        recordRouteLatency('chat/customer', Date.now() - start);
        return NextResponse.json(enforceProvenance({ error: 'Failed to retrieve chat history', provenance: 'synthetic' }, { path: 'chat/customer' }), { status: 500 });
    }
}, { path: 'chat/customer' });
