/**
 * RankPilot Admin Chatbot API Route
 * Verifies auth and proxies to Firebase Functions HTTPS endpoint
 */

import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const body: AdminChatRequest = await request.json();
        const { message, sessionId } = body;

        // Validate input
        if (!message?.trim()) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
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
        let uid: string;
        try {
            const decoded = await adminAuth.verifyIdToken(idToken);
            uid = decoded.uid;
        } catch (e) {
            return NextResponse.json({ error: 'Invalid or expired token. Try reloading to refresh your session.' }, { status: 401 });
        }

        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rankpilot-h3jpc';
        const region = 'australia-southeast2';
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
        } catch (e) {
            return NextResponse.json({ error: 'Admin chat service unreachable' }, { status: 503 });
        }

        const rawText = await res.text();
        let payload: any = null;
        try {
            payload = rawText ? JSON.parse(rawText) : null;
        } catch { }
        if (!res.ok) {
            const errMsg = payload?.error?.message || payload?.error || payload?.result?.error?.message || (rawText?.slice(0, 200) || 'Admin chat service unavailable');
            const code = res.status === 401 ? 401 : res.status === 403 ? 403 : res.status === 400 ? 400 : 503;
            const hint = code === 401
                ? ' (auth failed: ensure you are signed in; token may be expired)'
                : code === 403
                    ? ' (forbidden: check Function auth and App Check settings)'
                    : '';
            return NextResponse.json({ error: `${errMsg}${hint}` }, { status: code });
        }

        const data: ChatResponse = payload?.result || payload?.data || payload;
        if (!data) {
            return NextResponse.json({ error: 'Invalid response from admin chat service' }, { status: 502 });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('Admin chat API error:', error);

        // Handle Firebase Function errors
        if (error && typeof error === 'object' && 'code' in error) {
            const firebaseError = error as any;

            switch (firebaseError.code) {
                case 'unauthenticated':
                    return NextResponse.json(
                        { error: 'Authentication required' },
                        { status: 401 }
                    );
                case 'permission-denied':
                    return NextResponse.json(
                        { error: 'Admin access required' },
                        { status: 403 }
                    );
                case 'invalid-argument':
                    return NextResponse.json(
                        { error: 'Invalid request data' },
                        { status: 400 }
                    );
                default:
                    return NextResponse.json(
                        { error: 'Admin chat service unavailable' },
                        { status: 503 }
                    );
            }
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET endpoint for admin chat history
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');
        const limit = parseInt(searchParams.get('limit') || '20');

        // Get user from authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
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

        const messages: any[] = [];
        messagesSnap.docs.forEach((doc) => {
            const d = doc.data() as any;
            const ts = d.timestamp?.toDate?.()?.toISOString?.() || new Date().toISOString();
            if (d.question) {
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
                response: d.response || '',
                timestamp: ts,
                isUser: false,
                tokensUsed: d.tokensUsed || 0,
            });
        });

        return NextResponse.json({
            messages,
            sessionId: currentSessionId,
            hasMore: false,
        });

    } catch (error) {
        console.error('Admin chat history API error:', error);
        return NextResponse.json(
            { error: 'Failed to retrieve admin chat history' },
            { status: 500 }
        );
    }
}
