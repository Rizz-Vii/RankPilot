/**
 * RankPilot Admin Chatbot API Route
 * Verifies auth and proxies to Firebase Functions HTTPS endpoint
 */

import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { recordError, recordRateLimitRejection, recordRouteLatency } from '@/lib/metrics/unified-metrics';
import { enforceProvenance, withProvenance } from '@/lib/middleware/provenance';
import { enforceTeamRateLimit, TeamRateLimitError } from '@/lib/rate-limit/team-rate-limit';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Types
interface AdminChatRequest {
    message: string;
    sessionId?: string;
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

export const POST = withProvenance(async function POST(request: NextRequest) {
    const nreq = request;
    const start = Date.now();
    try {
        // Parse request body
        const body: AdminChatRequest = await nreq.json();
        const { message, sessionId } = body;

        // Validate input
        if (!message?.trim()) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        // Get user from authentication header
        const authHeader = nreq.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Authentication required: missing Bearer token' },
                { status: 401 }
            );
        }

        const idToken = authHeader.split(' ')[1];
        let uid: string;
        try {
            const decoded = await adminAuth.verifyIdToken(idToken);
            uid = decoded.uid;
        } catch {
            recordError('chat/admin', '4xx_user');
            recordRouteLatency('chat/admin', Date.now() - start);
            return NextResponse.json(enforceProvenance({ error: 'Invalid or expired token. Try reloading to refresh your session.', provenance: 'synthetic' }, { path: 'chat/admin' }), { status: 401 });
        }

        // Optional team-aware rate limiting (when user has teamId)
        try {
            const userDoc = await adminDb.collection('users').doc(uid).get();
            const udata = userDoc.exists ? userDoc.data() as Record<string, unknown> : undefined;
            const teamId = typeof udata?.teamId === 'string' ? udata.teamId : undefined;
            if (teamId) {
                try { await enforceTeamRateLimit(adminDb, teamId, { routeKey: 'chat/admin' }); }
                catch (e: unknown) {
                    if (e instanceof TeamRateLimitError) {
                        recordRateLimitRejection('chat/admin');
                        recordRateLimitRejection(`team:${teamId}`);
                        recordRouteLatency('chat/admin', Date.now() - start);
                        return NextResponse.json(enforceProvenance({ error: 'rate_limited', retryAfter: e.retryAfterSeconds, provenance: 'synthetic' }, { path: 'chat/admin' }), { status: 429, headers: { 'Retry-After': String(e.retryAfterSeconds) } });
                    }
                }
            }
        } catch (err) { void err; /* ignore */ }

        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rankpilot-h3jpc';
        const region = 'us-central1';
        const useEmulator = false; // Force production Functions URL when testing locally without emulators
        const emulatorHost = process.env.FUNCTIONS_EMULATOR_HOST || 'localhost';
        const emulatorPort = process.env.FUNCTIONS_EMULATOR_PORT || '5001';
        const functionUrl = useEmulator
            ? `http://${emulatorHost}:${emulatorPort}/${projectId}/${region}/adminChatHandler`
            : `https://${region}-${projectId}.cloudfunctions.net/adminChatHandler`;

        let res: Response;
        try {
            res = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    data: { uid, message, sessionId, chatType: 'admin' }
                }),
            });
        } catch {
            recordError('chat/admin', '5xx_server');
            recordRouteLatency('chat/admin', Date.now() - start);
            return NextResponse.json(enforceProvenance({ error: 'Admin chat service unreachable', provenance: 'synthetic' }, { path: 'chat/admin' }), { status: 503 });
        }

        const rawText = await res.text();
        let payload: unknown = null;
        try {
            payload = rawText ? JSON.parse(rawText) : null;
        } catch (err) { void err; }
        if (!res.ok) {
            const p = (payload as Record<string, unknown> | null) || {};
            const errMsg = (((p as Record<string, unknown>)['error'] as Record<string, unknown> | undefined)?.['message'] as string | undefined)
                || ((p as Record<string, unknown>)['error'] as string | undefined)
                || (((p as Record<string, unknown>)['result'] as Record<string, unknown> | undefined)?.['error'] as Record<string, unknown> | undefined)?.['message'] as string | undefined
                || ((rawText || '').slice(0, 200) || 'Admin chat service unavailable');
            const code = res.status === 401 ? 401 : res.status === 403 ? 403 : res.status === 400 ? 400 : 503;
            const hint = code === 401
                ? ' (auth failed: ensure you are signed in; token may be expired)'
                : code === 403
                    ? ' (forbidden: check Function auth and App Check settings)'
                    : '';
            if (code >= 500) recordError('chat/admin', '5xx_server'); else if (code >= 400) recordError('chat/admin', '4xx_user');
            recordRouteLatency('chat/admin', Date.now() - start);
            return NextResponse.json(enforceProvenance({ error: `${errMsg}${hint}`, upstreamStatus: res.status, provenance: 'synthetic' }, { path: 'chat/admin' }), { status: code });
        }

        const container: Record<string, unknown> = (payload as Record<string, unknown> | null) || {};
        const data: ChatResponse = ((container as Record<string, unknown>)?.result ?? (container as Record<string, unknown>)?.data ?? payload) as unknown as ChatResponse;
        if (!data) {
            recordError('chat/admin', '5xx_server');
            recordRouteLatency('chat/admin', Date.now() - start);
            return NextResponse.json(enforceProvenance({ error: 'Invalid response from admin chat service', provenance: 'synthetic' }, { path: 'chat/admin' }), { status: 502 });
        }

        const resp = NextResponse.json(enforceProvenance({ ...data, provenance: 'live' }, { path: 'chat/admin' }));
        recordRouteLatency('chat/admin', Date.now() - start);
        return resp;

    } catch (error) {
        console.error('Admin chat API error:', error);

        // Handle Firebase Function errors
        if (error && typeof error === 'object' && 'code' in (error as Record<string, unknown>)) {
            const firebaseError = error as { code?: string };

            switch (firebaseError.code) {
                case 'unauthenticated':
                    recordError('chat/admin', '4xx_user');
                    recordRouteLatency('chat/admin', Date.now() - start);
                    return NextResponse.json(enforceProvenance({ error: 'Authentication required', provenance: 'synthetic' }, { path: 'chat/admin' }), { status: 401 });
                case 'permission-denied':
                    recordError('chat/admin', '4xx_user');
                    recordRouteLatency('chat/admin', Date.now() - start);
                    return NextResponse.json(enforceProvenance({ error: 'Admin access required', provenance: 'synthetic' }, { path: 'chat/admin' }), { status: 403 });
                case 'invalid-argument':
                    recordError('chat/admin', '4xx_user');
                    recordRouteLatency('chat/admin', Date.now() - start);
                    return NextResponse.json(enforceProvenance({ error: 'Invalid request data', provenance: 'synthetic' }, { path: 'chat/admin' }), { status: 400 });
                default:
                    recordError('chat/admin', '5xx_server');
                    recordRouteLatency('chat/admin', Date.now() - start);
                    return NextResponse.json(enforceProvenance({ error: 'Admin chat service unavailable', provenance: 'synthetic' }, { path: 'chat/admin' }), { status: 503 });
            }
        }

        recordError('chat/admin', '5xx_server');
        recordRouteLatency('chat/admin', Date.now() - start);
        return NextResponse.json(enforceProvenance({ error: 'Internal server error', provenance: 'synthetic' }, { path: 'chat/admin' }), { status: 500 });
    }
}, { path: 'chat/admin' });

// GET endpoint for admin chat history
export const GET = withProvenance(async function GET(request: NextRequest) {
    const nreq = request;
    const start = Date.now();
    try {
        const { searchParams } = new URL(nreq.url);
        const sessionId = searchParams.get('sessionId');
        const limit = parseInt(searchParams.get('limit') || '20');

        // Get user from authentication
        const authHeader = nreq.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            recordError('chat/admin', '4xx_user');
            recordRouteLatency('chat/admin', Date.now() - start);
            return NextResponse.json(enforceProvenance({ error: 'Authentication required', provenance: 'synthetic' }, { path: 'chat/admin' }), { status: 401 });
        }

        const idToken = authHeader.split(' ')[1];
        const decoded = await adminAuth.verifyIdToken(idToken);
        const uid = decoded.uid;

        const collectionName = 'adminChats';

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

        // Fetch messages
        const messagesSnap = await adminDb
            .collection(collectionName)
            .doc(uid)
            .collection('sessions')
            .doc(currentSessionId)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .limit(limit)
            .get();

        interface RawMsg { question?: string; response?: string; timestamp?: { toDate?: () => Date } | Date; tokensUsed?: number; }
        const messages: Array<{ id: string; message: string; response: string; timestamp: string; isUser: boolean; tokensUsed?: number; }> = [];
        messagesSnap.docs.forEach((doc) => {
            const d = doc.data() as Partial<RawMsg> | undefined;
            const tsRaw = d?.timestamp;
            let ts = new Date().toISOString();
            if (tsRaw && typeof tsRaw === 'object' && 'toDate' in tsRaw) {
                const maybe = (tsRaw as { toDate?: unknown }).toDate;
                if (typeof maybe === 'function') {
                    try { ts = (maybe as () => Date)().toISOString(); } catch { /* ignore */ }
                }
            }
            if (typeof d?.question === 'string') {
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
                response: typeof d?.response === 'string' ? d.response : '',
                timestamp: ts,
                isUser: false,
                tokensUsed: typeof d?.tokensUsed === 'number' ? d.tokensUsed : 0,
            });
        });

        const resp = NextResponse.json(enforceProvenance({
            messages,
            sessionId: currentSessionId,
            hasMore: false,
            provenance: 'live'
        }, { path: 'chat/admin' }));
        recordRouteLatency('chat/admin', Date.now() - start);
        return resp;

    } catch (error) {
        console.error('Admin chat history API error:', error);
        recordError('chat/admin', '5xx_server');
        recordRouteLatency('chat/admin', Date.now() - start);
        return NextResponse.json(enforceProvenance({ error: 'Failed to retrieve admin chat history', provenance: 'synthetic' }, { path: 'chat/admin' }), { status: 500 });
    }
}, { path: 'chat/admin' });
