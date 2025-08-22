import { chatComplete } from '@/lib/ai/aiClient';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

interface SummarizeResult { updated: boolean; }

// After every MESSAGE_INTERVAL new messages since last summary, attempt summarization
const MESSAGE_INTERVAL = 6;
// Cap context size to avoid large token usage
const MAX_CONTEXT_CHARS = 8000;

type ChatMessage = { id: string; question?: string; response?: string; [key: string]: unknown };

interface SessionData {
    messageCount?: unknown;
    lastSummarizedCount?: unknown;
    sessionSummary?: unknown;
    actionProgress?: unknown;
}

interface ParsedSummaryJSON {
    summary: string;
    pending_actions?: string[];
    keywords?: string[];
}

export async function maybeSummarizeSession(params: {
    uid: string;
    sessionId: string;
    latestUserMessage?: string;
    latestAIResponse?: string;
}): Promise<SummarizeResult> {
    const { uid, sessionId } = params;
    const sessionRef = adminDb.collection('chatLogs').doc(uid).collection('sessions').doc(sessionId);
    try {
        const sessionSnap = await sessionRef.get();
        if (!sessionSnap.exists) return { updated: false };
        const sessionRaw: SessionData = (sessionSnap.data() as unknown as SessionData) || {};
        const messageCount: number = typeof sessionRaw.messageCount === 'number' ? (sessionRaw.messageCount as number) : 0;
        const lastSummarizedCount: number = typeof sessionRaw.lastSummarizedCount === 'number' ? (sessionRaw.lastSummarizedCount as number) : 0;
        if (messageCount < MESSAGE_INTERVAL || (messageCount - lastSummarizedCount) < MESSAGE_INTERVAL) {
            return { updated: false };
        }
        // Basic lock to reduce concurrent summaries
        const lockRef = sessionRef.collection('_locks').doc('summary');
        const lockSnap = await lockRef.get();
        if (lockSnap.exists) {
            const created = lockSnap.data()?.created?.toDate?.() || new Date(0);
            if (Date.now() - created.getTime() < 60_000) {
                return { updated: false }; // lock still valid
            }
        }
        await lockRef.set({ created: FieldValue.serverTimestamp() });
        let existingSummary: string = typeof sessionRaw.sessionSummary === 'string' ? (sessionRaw.sessionSummary as string) : '';
        // Completed actions (from persisted actionProgress) should be excluded from future pending actions.
        const actionProgress: Record<string, unknown> = (sessionRaw && typeof (sessionRaw.actionProgress) === 'object' && sessionRaw.actionProgress !== null)
            ? (sessionRaw.actionProgress as Record<string, unknown>)
            : {};
        const completedActions: string[] = Object.entries(actionProgress)
            .filter(([, v]) => !!v)
            .map(([k]) => k)
            .slice(0, 30); // cap for prompt safety
        // Recent messages (last 40) in chronological order
        const msgsSnap = await sessionRef.collection('messages').orderBy('timestamp', 'desc').limit(40).get();
        const msgs: ChatMessage[] = msgsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as ChatMessage[];
        const convoLines: string[] = [];
        for (const m of msgs) {
            const q = (m as Record<string, unknown>).question;
            const r = (m as Record<string, unknown>).response;
            if (typeof q === 'string' && q) convoLines.push(`User: ${q}`);
            if (typeof r === 'string' && r) convoLines.push(`AI: ${r}`);
        }
        const convoText = convoLines.join('\n').slice(-MAX_CONTEXT_CHARS);
        const prompt = `You are an SEO assistant memory compressor. Merge the existing summary (if any) with the new conversation lines to maintain: user goals, site context, technical issues, strategy decisions, and unresolved action items.\n\nIMPORTANT: You are given a list of completed actions. DO NOT include any completed action in the pending_actions array, and do not restate them as still pending. Only include legitimately remaining actionable next steps that are not completed.\n\nOutput STRICT JSON with keys: summary (string, <=1200 chars), pending_actions (string[] max 8 items, imperative, short), keywords (string[] top 5).\n\nExisting summary:\n${existingSummary || '(none)'}\n\nCompleted actions (exclude from pending):\n${completedActions.length ? completedActions.join('\n') : '(none)'}\n\nRecent conversation lines:\n${convoText}\n\nReturn ONLY JSON.`;
        let jsonObj: ParsedSummaryJSON | null = null;
        try {
            const content: string = await chatComplete({
                messages: [
                    { role: 'system', content: 'You condense SEO chat history into structured JSON memory.' },
                    { role: 'user', content: prompt }
                ], maxTokens: 500, temperature: 0.2
            });
            const firstBrace = content.indexOf('{');
            const lastBrace = content.lastIndexOf('}');
            if (firstBrace >= 0 && lastBrace > firstBrace) {
                const jsonSlice = content.slice(firstBrace, lastBrace + 1);
                try {
                    const parsed = JSON.parse(jsonSlice) as unknown;
                    if (parsed && typeof parsed === 'object' && typeof (parsed as Record<string, unknown>).summary === 'string') {
                        jsonObj = parsed as ParsedSummaryJSON;
                    }
                } catch {
                    // swallow JSON parse errors silently; we'll return updated: false below
                }
            }
        } catch (err) {
            // swallow error but log for debugging
            console.debug('maybeSummarizeSession: chatComplete error', err);
        } finally {
            await lockRef.delete().catch(() => { });
        }
        if (!jsonObj || typeof jsonObj.summary !== 'string') return { updated: false };
        // Filter out any actions that were marked as completed, in case the model still returned them.
        let pending: string[] = Array.isArray(jsonObj.pending_actions)
            ? (jsonObj.pending_actions as unknown[]).filter((p): p is string => typeof p === 'string')
            : [];
        if (completedActions.length && pending.length) {
            const completedSet = new Set(completedActions.map(a => a.toLowerCase().trim()));
            pending = pending.filter(a => !completedSet.has(String(a).toLowerCase().trim()));
        }
        await sessionRef.set({
            sessionSummary: jsonObj.summary,
            pendingActions: pending,
            keywords: Array.isArray(jsonObj.keywords)
                ? (jsonObj.keywords as unknown[]).filter((k): k is string => typeof k === 'string')
                : [],
            lastSummarizedCount: messageCount,
            summaryUpdatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        return { updated: true };
    } catch (err) {
        console.debug('maybeSummarizeSession: unexpected error', err);
        return { updated: false };
    }
}
