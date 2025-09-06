import { fallbackOneShot } from '@/lib/ai/aiClient';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { handleCors } from '@/lib/http/cors';
import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ChatDoc = {
    question?: string;
    response?: string;
    timestamp?: unknown;
    tokensUsed?: number;
    metadata?: { type?: string; mediaUrl?: string };
};

function estimateTokens(text: string): number {
    if (!text) return 0;
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words * 1.3);
}

async function getOrCreateLatestSessionId(uid: string): Promise<string> {
    try {
        const snap = await adminDb.collection('chatLogs').doc(uid).collection('sessions')
            .orderBy('lastActivity', 'desc').limit(1).get();
        if (!snap.empty) return snap.docs[0].id;
    } catch { /* ignore */ }
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function GET(req: NextRequest) {
    try {
        // CORS and cache/transform safety
        const cors = handleCors(req);
        if ('preflight' in cors) return cors.preflight;
        const baseHeaders: Record<string, string> = {
            ...('headers' in cors ? cors.headers : {}),
            'Cache-Control': 'no-store, no-transform',
            'Vary': 'Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
        };
        const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            console.warn('api.chat.customer.GET.auth.missing');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: baseHeaders });
        }
        const idToken = authHeader.split(' ')[1];
        let decoded: { uid: string };
        try {
            decoded = await adminAuth.verifyIdToken(idToken);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e ?? 'auth_error');
            console.warn('api.chat.customer.GET.auth.verify_failed', { message: msg });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: baseHeaders });
        }
        const uid = decoded.uid;

        const { searchParams } = new URL(req.url);
        const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit')) || 25));
        const beforeStr = searchParams.get('before');

        // Resolve session
        const sessionId = await getOrCreateLatestSessionId(uid);

        // Fetch session metadata if present
        const sessRef = adminDb.collection('chatLogs').doc(uid).collection('sessions').doc(sessionId);
        const sessSnap = await sessRef.get().catch((e: unknown) => {
            const msg = e instanceof Error ? e.message : String(e);
            console.error('api.chat.customer.GET.firestore.session_get_error', { message: msg });
            return null;
        });
        const sData = (sessSnap?.exists ? (sessSnap.data() as Record<string, unknown>) : {}) || {};

        // Fetch messages (most recent first)
        let q = sessRef.collection('messages').orderBy('timestamp', 'desc');
        if (beforeStr) {
            const d = new Date(beforeStr);
            if (!Number.isNaN(d.getTime())) {
                q = q.where('timestamp', '<', d);
            }
        }
        q = q.limit(limit + 1);
        let docs: Array<{ id: string; data: () => unknown }> = [];
        try {
            const msgSnap = await q.get();
            docs = msgSnap?.docs || [];
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error('api.chat.customer.GET.firestore.messages_query_error', { message: msg });
            docs = [];
        }

        // Map to UI shape: split into user + ai message rows per stored doc
        const messages: Array<Record<string, unknown>> = [];
        for (const d of docs.slice(0, limit)) {
            const data = d.data() as ChatDoc;
            const ts = (data.timestamp as unknown as { toDate?: () => Date })?.toDate?.() || new Date();
            if (data.question) {
                messages.push({
                    id: `${d.id}_user`,
                    message: data.question || '',
                    response: '',
                    timestamp: ts.toISOString(),
                    isUser: true,
                    type: data.metadata?.type,
                    mediaUrl: data.metadata?.mediaUrl,
                });
            }
            if (data.response) {
                messages.push({
                    id: `${d.id}_ai`,
                    message: '',
                    response: data.response || '',
                    timestamp: ts.toISOString(),
                    isUser: false,
                    tokensUsed: typeof data.tokensUsed === 'number' ? data.tokensUsed : undefined,
                });
            }
        }

        const hasMore = docs.length > limit;

        return NextResponse.json({
            messages,
            sessionId,
            hasMore,
            sessionSummary: typeof sData['sessionSummary'] === 'string' ? sData['sessionSummary'] : undefined,
            pendingActions: Array.isArray(sData['pendingActions']) ? sData['pendingActions'] : undefined,
            keywords: Array.isArray(sData['keywords']) ? sData['keywords'] : undefined,
            actionProgress: typeof sData['actionProgress'] === 'object' ? sData['actionProgress'] : undefined,
            actionStats: typeof sData['actionStats'] === 'object' ? sData['actionStats'] : undefined,
        }, { headers: baseHeaders });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e ?? 'error');
        // Minimal structured log for production diagnostics
        console.error('api.chat.customer.GET.error', { message: msg });
        return NextResponse.json({ error: msg }, { status: 500, headers: { 'Cache-Control': 'no-store, no-transform' } });
    }
}

export async function POST(req: NextRequest) {
    try {
        // CORS and cache/transform safety
        const cors = handleCors(req);
        if ('preflight' in cors) return cors.preflight;
        const baseHeaders: Record<string, string> = {
            ...('headers' in cors ? cors.headers : {}),
            'Cache-Control': 'no-store, no-transform',
            'Vary': 'Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
        };
        const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            console.warn('api.chat.customer.POST.auth.missing');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: baseHeaders });
        }
        const idToken = authHeader.split(' ')[1];
        let decoded: { uid: string };
        try {
            decoded = await adminAuth.verifyIdToken(idToken);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e ?? 'auth_error');
            console.warn('api.chat.customer.POST.auth.verify_failed', { message: msg });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: baseHeaders });
        }
        const uid = decoded.uid;

        const body = await req.json().catch(() => ({}));
        const { message, sessionId: sessionIdIn, url, attachments } = body as {
            message?: string;
            sessionId?: string;
            url?: string;
            attachments?: Array<{ type?: string; mediaUrl?: string; name?: string }>;
        };

        // Resolve session
        let sessionId = sessionIdIn || await getOrCreateLatestSessionId(uid);
        const sessRef = adminDb.collection('chatLogs').doc(uid).collection('sessions').doc(sessionId);

        // Persist attachments only
        if (!message && Array.isArray(attachments) && attachments.length) {
            try {
                await sessRef.collection('messages').add({
                    question: attachments[0]?.name || 'attachment',
                    response: '',
                    timestamp: FieldValue.serverTimestamp(),
                    tokensUsed: 0,
                    chatType: 'customer',
                    metadata: { type: attachments[0]?.type, mediaUrl: attachments[0]?.mediaUrl }
                });
                await sessRef.set({ lastActivity: FieldValue.serverTimestamp(), chatType: 'customer' }, { merge: true });
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                console.error('api.chat.customer.POST.firestore.attachment_persist_error', { message: msg });
        // Continue to return success to avoid blocking UX on attachment-only persist failures
            }
            return NextResponse.json({ success: true }, { headers: baseHeaders });
        }

        if (!message?.trim()) {
            return NextResponse.json({ error: 'Message required' }, { status: 400, headers: baseHeaders });
        }

        // Generate a non-streamed response (fallback path)
        const systemPrompt = `You are RankPilot AI (fallback). Provide concise, actionable SEO assistance using markdown.`;
        const aiText = await fallbackOneShot(systemPrompt, message, 800);
        const tokensUsed = estimateTokens(aiText);

        // Persist
        try {
            await sessRef.collection('messages').add({
                question: message,
                response: aiText,
                timestamp: FieldValue.serverTimestamp(),
                tokensUsed,
                chatType: 'customer',
                metadata: { url: url || null, provider: 'fallback' }
            });
            // ensure session exists
            await sessRef.set({
                lastMessage: aiText.slice(0, 100),
                lastActivity: FieldValue.serverTimestamp(),
                messageCount: FieldValue.increment(1),
                chatType: 'customer',
                lastProvider: 'fallback',
                lastProviderAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            // Use created id to stabilize client mapping
            sessionId = (await sessRef.get().catch(() => null))?.id || sessionId;
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error('api.chat.customer.POST.firestore.persist_error', { message: msg });
        // swallow persist error to still return AI response
        }

        const responseBody = {
            response: aiText,
            sessionId,
            timestamp: new Date().toISOString(),
            tokensUsed,
            context: { type: 'fallback', dataUsed: [] as string[] },
        };
        return NextResponse.json(responseBody, { headers: baseHeaders });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e ?? 'error');
        console.error('api.chat.customer.POST.error', { message: msg });
        return NextResponse.json({ error: msg }, { status: 500, headers: { 'Cache-Control': 'no-store, no-transform' } });
    }
}
