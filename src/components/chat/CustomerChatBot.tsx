/**
 * RankPilot Customer ChatBot Component
 * Floating chatbot interface for customer support and SEO guidance
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';
import { extractRpMeta } from '@/lib/chat/rpMeta';
import { auth, storage } from '@/lib/firebase';
import { useIsMobile } from '@/lib/mobile-responsive-utils';
import { cn } from '@/lib/utils';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { AnimatePresence, motion } from 'framer-motion';
import DOMPurify from 'isomorphic-dompurify';
import { Bot, Loader2, Maximize2, MessageCircle, Minimize2, Send, User, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

// Types
interface ChatMessage {
    id: string;
    message: string;
    response: string;
    timestamp: string;
    isUser: boolean;
    tokensUsed?: number;
        type?: 'text' | 'image' | 'audio' | 'system';
    mediaUrl?: string;
    intent?: string;
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

interface RawMessage {
    id?: string;
    message?: string;
    response?: string;
    timestamp?: string;
    isUser?: boolean;
    tokensUsed?: number;
    type?: string;
    mediaUrl?: string;
}

type AuthUserLike = { uid?: string; getIdToken?: (force?: boolean) => Promise<string> };

interface CustomerChatBotProps {
    currentUrl?: string;
    className?: string;
    /**
     * Optional initial suggestions for deterministic testing or bootstrapping.
     * When provided, these will seed the suggestion chips on open (first render),
     * and can later be updated by streamed/meta-derived suggestions.
     */
    initialSuggestions?: string[];
}

export default function CustomerChatBot({ currentUrl, className, initialSuggestions }: CustomerChatBotProps) {
    // State management
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isComposing, setIsComposing] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [announcements, setAnnouncements] = useState<string[]>([]);
    const [pendingImage, setPendingImage] = useState<File | null>(null);
    const [pendingAudio, setPendingAudio] = useState<Blob | null>(null);
    const [uploading, setUploading] = useState(false);
    const [canSend, setCanSend] = useState(true);
    const sendCooldownRef = useRef<NodeJS.Timeout | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const oldestMessageTsRef = useRef<string | null>(null);
    // Enhancements: quotas, retries, streaming, debounce
    const [attachmentsUsed, setAttachmentsUsed] = useState(0);
    const lastScrollFetchRef = useRef<number>(0);
    const [failedImage, setFailedImage] = useState<File | null>(null);
    const [failedAudio, setFailedAudio] = useState<Blob | null>(null);
    const [streaming, setStreaming] = useState(false);
    const streamAbortRef = useRef<AbortController | null>(null);
    const streamingMessageIdRef = useRef<string | null>(null);
    // Enhanced scroll + accessibility refs
    const messagesViewportRef = useRef<HTMLDivElement | null>(null);
    const userScrolledUpRef = useRef(false);
    const [scrolledAway, setScrolledAway] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [sessionSummary, setSessionSummary] = useState<string>('');
    const [pendingActions, setPendingActions] = useState<string[]>([]);
    const [previousActions, setPreviousActions] = useState<Set<string>>(new Set());
    const [newActionHighlights, setNewActionHighlights] = useState<Set<string>>(new Set());
    const newActionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [actionStats, setActionStats] = useState<{ totalCompleted: number; totalPending: number; completionRate: number } | null>(null);
    const [focusKeywords, setFocusKeywords] = useState<string[]>([]);
    const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});
    const actionUpdateDebounceRef = useRef<NodeJS.Timeout | null>(null);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const chatWindowRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

    // Auth
    const { user, profile } = useAuth();

    const isMobile = useIsMobile('md');
    const [reducedMotion, setReducedMotion] = useState(false);

    // Detect prefers-reduced-motion & low performance devices
    useEffect(() => {
        try {
            const m = window.matchMedia('(prefers-reduced-motion: reduce)');
            setReducedMotion(m.matches);
            const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
            m.addEventListener('change', handler);
            return () => m.removeEventListener('change', handler);
        } catch { /* ignore */ }
    }, []);

    // Persist open/minimized state
    useEffect(() => {
        try {
            const savedOpen = localStorage.getItem('rp_chat_isOpen');
            const savedMin = localStorage.getItem('rp_chat_isMin');
            if (savedOpen === '1') setIsOpen(true);
            if (savedMin === '1') setIsMinimized(true);
        } catch { /* ignore */ }
    }, []);
    useEffect(() => {
        try { localStorage.setItem('rp_chat_isOpen', isOpen ? '1' : '0'); } catch {}
    }, [isOpen]);
    useEffect(() => {
        try { localStorage.setItem('rp_chat_isMin', isMinimized ? '1' : '0'); } catch {}
    }, [isMinimized]);

    // Swipe-down to minimize (mobile only)
    const touchStartY = useRef<number | null>(null);
    const touchDelta = useRef(0);
    const onTouchStart = useCallback((e: TouchEvent) => {
        if (!isMobile || isMinimized) return;
        touchStartY.current = e.touches[0].clientY;
        touchDelta.current = 0;
    }, [isMobile, isMinimized]);
    const onTouchMove = useCallback((e: TouchEvent) => {
        if (touchStartY.current == null) return;
        touchDelta.current = e.touches[0].clientY - touchStartY.current;
        if (touchDelta.current > 120) { // threshold
            setIsMinimized(true);
            touchStartY.current = null;
        }
    }, []);
    const onTouchEnd = useCallback(() => {
        touchStartY.current = null;
    }, []);
    useEffect(() => {
        const el = chatWindowRef.current;
        if (!el || !isMobile) return;
        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: true });
        el.addEventListener('touchend', onTouchEnd);
        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
        };
    }, [isMobile, onTouchStart, onTouchMove, onTouchEnd]);

    // Smart auto-scroll (only when user near bottom or not manually scrolled up)
    const isNearBottom = () => {
        const el = messagesViewportRef.current;
        if (!el) return true;
        return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    };
    const scrollToBottom = (smooth = true) => {
        if (!messagesEndRef.current) return;
        try { messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' }); } catch {}
    };
    useEffect(() => {
        if (!userScrolledUpRef.current || isNearBottom()) {
            scrollToBottom(!streaming);
        }
    }, [messages, streaming]);
    const handleManualScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
        const el = e.currentTarget;
        const away = el.scrollHeight - el.scrollTop - el.clientHeight > 240;
        userScrolledUpRef.current = away;
        setScrolledAway(away);
    };
    // If new messages arrive and we're near bottom, clear scrolledAway
    useEffect(() => {
        if (scrolledAway && isNearBottom()) {
            setScrolledAway(false);
            userScrolledUpRef.current = false;
        }
    }, [messages]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && !isMinimized && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen, isMinimized]);

    // Seed suggestions if provided (e.g., in unit tests) when chat opens
    useEffect(() => {
        if (isOpen && Array.isArray(initialSuggestions) && initialSuggestions.length && suggestions.length === 0) {
            setSuggestions(initialSuggestions.slice(0, 4));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, Array.isArray(initialSuggestions) ? initialSuggestions.join('|') : initialSuggestions]);

    // Initialize with welcome message
    useEffect(() => {
        if (isOpen && messages.length === 0 && !restoring) {
            const welcomeMarkdown = `👋 **Hi! I'm RankPilot AI** — your SEO assistant.\n\n**I can help with:**\n1. **SEO Audit Analysis** – Explain performance scores\n2. **Content Optimization** – Improve on-page signals\n3. **Technical SEO** – Crawl & index fixes\n4. **Keyword Strategy** – Opportunity discovery\n5. **NeuroSEO™ Insights** – Advanced AI recommendations\n\n_Try asking:_\n• "Analyze my Core Web Vitals"\n• "Suggest schema markup for a product page"`;
            const welcomeMessage: ChatMessage = {
                id: `welcome_${Date.now()}`,
                message: '',
                response: DOMPurify.sanitize(welcomeMarkdown.replace(/\n/g, '<br/>')),
                timestamp: new Date().toISOString(),
                isUser: false,
            };
            setMessages([welcomeMessage]);
        }
    }, [isOpen, messages.length]);

    // Restore last session from Firestore via API GET when opening
    useEffect(() => {
        const restore = async () => {
            if (!isOpen || !user || messages.length > 0) return;
            setRestoring(true);
            try {
                const token = await (auth.currentUser || user as AuthUserLike)?.getIdToken?.();
                if (!token) throw new Error('No auth token');
                const res = await fetch('/api/chat/customer?limit=30', { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data.messages) && data.messages.length) {
                        setSessionId(data.sessionId || sessionId);
                        const mapped = (data.messages as unknown[]).map((m: unknown) => {
                            const mm = m as RawMessage;
                            return {
                                id: String(mm.id || ''),
                                message: mm.isUser ? (mm.message || '') : '',
                                response: !mm.isUser ? (mm.response || '') : '',
                                timestamp: String(mm.timestamp || new Date().toISOString()),
                                isUser: !!mm.isUser,
                                tokensUsed: mm.tokensUsed,
                                type: mm.type,
                                mediaUrl: mm.mediaUrl,
                            };
                        });
                        setMessages(mapped);
                        oldestMessageTsRef.current = mapped[0]?.timestamp || null;
                        setHasMore(data.hasMore ?? false);
                        if (data.sessionSummary) setSessionSummary(data.sessionSummary);
                        if (Array.isArray(data.pendingActions)) {
                            setPendingActions(data.pendingActions);
                            setPreviousActions(new Set(data.pendingActions));
                        }
                        if (Array.isArray(data.keywords)) setFocusKeywords(data.keywords);
                        if (data.actionProgress && typeof data.actionProgress === 'object') setCompletedActions(data.actionProgress);
                        if (data.actionStats && typeof data.actionStats === 'object') {
                            setActionStats({
                                totalCompleted: data.actionStats.totalCompleted || 0,
                                totalPending: data.actionStats.totalPending || 0,
                                completionRate: data.actionStats.completionRate || 0,
                            });
                        }
                    }
                }
            } catch (e) {
                // silent
            } finally {
                setRestoring(false);
            }
        };
        restore();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, user]);

    // Local cache persistence (simple recent snapshot)
    useEffect(() => {
        try {
            if (messages.length) {
                localStorage.setItem('rp_chat_recent', JSON.stringify(messages.slice(-50)));
            }
        } catch {}
    }, [messages]);

    // Load local cache if available (before remote restore)
    useEffect(() => {
        if (!isOpen || messages.length) return;
        try {
            const cached = localStorage.getItem('rp_chat_recent');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length) {
                    setMessages(parsed);
                }
            }
        } catch {}
    }, [isOpen, messages.length]);

    // Send message to API
    const applySendCooldown = () => {
        setCanSend(false);
        if (sendCooldownRef.current) clearTimeout(sendCooldownRef.current);
        sendCooldownRef.current = setTimeout(() => setCanSend(true), 1200); // 1.2s cooldown
    };

    const renderMarkdown = async (text: string) => {
        try {
            // unified() may not have precise ESM types here; use unknown and narrow to the Process interface we need
            const processor = (unified() as unknown)
                .use(remarkParse)
                .use(remarkGfm)
                .use(remarkRehype)
                .use(rehypeStringify);
            const file = await (processor as { process(input: string): Promise<unknown> }).process(text);
            return String(file);
        } catch {
            return text.replace(/</g, '&lt;');
        }
    };

    // Highlight new pending actions that appear after updates
    useEffect(() => {
        if (!pendingActions.length) return;
        const prev = previousActions;
        const newlyAdded = pendingActions.filter(a => !prev.has(a));
        if (newlyAdded.length) {
            const updatedSet = new Set(newActionHighlights);
            newlyAdded.forEach(a => updatedSet.add(a));
            setNewActionHighlights(updatedSet);
            // Remove highlight after 8s
            if (newActionTimeoutRef.current) clearTimeout(newActionTimeoutRef.current);
            newActionTimeoutRef.current = setTimeout(() => {
                setNewActionHighlights(prevSet => {
                    const clone = new Set(prevSet);
                    newlyAdded.forEach(a => clone.delete(a));
                    return clone;
                });
            }, 8000);
        }
        setPreviousActions(new Set(pendingActions));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingActions.join('|')]);

    // Add copy buttons to code blocks (progressive enhancement)
    useEffect(() => {
        const container = messagesViewportRef.current;
        if (!container) return;
        const pres = container.querySelectorAll('pre');
        pres.forEach(pre => {
            if ((pre as any)._rpCopyBtn) return;
            const wrapper = pre as HTMLElement;
            wrapper.classList.add('relative');
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.setAttribute('aria-label', 'Copy code');
            btn.className = 'absolute top-1 right-1 rounded-md bg-black/50 text-white text-[10px] px-2 py-1 hover:bg-black/70 transition focus:outline-none focus:ring-2 focus:ring-primary';
            btn.textContent = 'Copy';
            btn.onclick = () => {
                const code = wrapper.querySelector('code');
                if (code) {
                    navigator.clipboard.writeText(code.textContent || '');
                    btn.textContent = 'Copied';
                    setTimeout(() => { btn.textContent = 'Copy'; }, 1600);
                }
            };
            wrapper.appendChild(btn);
            (pre as any)._rpCopyBtn = true;
        });
    }, [messages]);

    // Compute attachment count after restore
    useEffect(() => {
        const count = messages.filter(m => m.type === 'image' || m.type === 'audio').length;
        setAttachmentsUsed(count);
    }, [messages.length]);

    const getAttachmentLimit = (tier?: string) => {
        switch (tier) {
            case 'starter': return 10;
            case 'agency': return 15;
            case 'enterprise': return 25;
            case 'admin': return 100;
            default: return 3; // free
        }
    };

    const sendMessage = async () => {
        const messageToSend = inputValue.trim();
        if (!messageToSend || isLoading || !user || !canSend) return;
        applySendCooldown();

        // Simple heuristic intent classifier (client-side initial implementation)
        const classifyIntent = (text: string): string => {
            const t = text.toLowerCase();
            if (/core web vitals|lcp|cls|fid|tti|performance/.test(t)) return 'performance';
            if (/keyword|cluster|search volume|intent/.test(t)) return 'keyword_strategy';
            if (/schema|structured data|json-ld|rich snippet/.test(t)) return 'structured_data';
            if (/crawl|index|coverage|sitemap|robots/.test(t)) return 'technical_seo';
            if (/competitor|compare|gap|benchmark/.test(t)) return 'competitor';
            if (/rewrite|optimi(s|z)e|improve content|density/.test(t)) return 'content_optimization';
            return 'general';
        };
        const intent = classifyIntent(messageToSend);

        const userMessage: ChatMessage = {
            id: `user_${Date.now()}`,
            message: messageToSend,
            response: '',
            timestamp: new Date().toISOString(),
            isUser: true,
            intent,
        };

        // Add user message immediately
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);
        setError('');

    try {
            // Get fresh user token to avoid 401 from stale tokens
            const curr = (auth.currentUser || user as AuthUserLike) as AuthUserLike | undefined;
            if (!curr || typeof curr.getIdToken !== 'function') {
                throw new Error('Authentication failed. Please sign in again and retry.');
            }
            const token = await curr.getIdToken(true);
            // Attempt streaming first
            let usedStreaming = false;
            try {
                setStreaming(true);
                const controller = new AbortController();
                streamAbortRef.current = controller;
                const streamRes = await fetch('/api/chat/customer/stream', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ message: messageToSend, sessionId: sessionId || undefined, url: currentUrl }),
                    signal: controller.signal
                });
                if (streamRes.ok && streamRes.headers.get('content-type')?.includes('text/event-stream')) {
                    usedStreaming = true;
                    const aiId = `ai_${Date.now()}`;
                    streamingMessageIdRef.current = aiId;
                    let accumulated = '';
                    setMessages(prev => [...prev, { id: aiId, message: '', response: '', timestamp: new Date().toISOString(), isUser: false }]);
                    const reader = streamRes.body?.getReader();
                    const decoder = new TextDecoder();
                    if (reader) {
                        let doneReading = false; let buffer = '';
                        while (!doneReading) {
                            const chunk = await reader.read();
                            doneReading = chunk.done || false;
                            if (chunk.value) buffer += decoder.decode(chunk.value, { stream: !doneReading });
                            const parts = buffer.split('\n\n');
                            buffer = parts.pop() || '';
                            for (const part of parts) {
                                if (!part.startsWith('data:')) continue;
                                const dataStr = part.slice(5).trim();
                                if (dataStr === '[DONE]') { doneReading = true; break; }
                                try {
                                    const json = JSON.parse(dataStr) as Record<string, unknown>;
                                    const tokenPiece = json['token'];
                                    if (typeof tokenPiece === 'string') {
                                        accumulated += tokenPiece;
                                        const interim = accumulated.replace(/</g, '&lt;').replace(/\n/g, '<br/>');
                                        setMessages(prev => prev.map(m => m.id === aiId ? { ...m, response: interim } : m));
                                    } else if (json['final']) {
                                        const sessionIdPiece = json['sessionId'];
                                        if (typeof sessionIdPiece === 'string' && sessionIdPiece !== sessionId) setSessionId(sessionIdPiece);
                                        const tokensUsedPiece = json['tokensUsed'];
                                        if (typeof tokensUsedPiece === 'number') {
                                            setMessages(prev => prev.map(m => m.id === aiId ? { ...m, tokensUsed: tokensUsedPiece } : m));
                                        }
                                        // Derive suggestions from rp_meta if present
                                        try {
                                            const { meta } = extractRpMeta(accumulated) as any;
                                            const nextSugg: string[] = [];
                                            if (meta?.actions?.length) nextSugg.push(...meta.actions);
                                            if (nextSugg.length) setSuggestions(nextSugg.slice(0,4));
                                        } catch { /* ignore */ }
                                    } else if (typeof json['error'] === 'string') {
                                        setError(json['error']);
                                    }
                                } catch { /* ignore parse issues */ }
                            }
                        }
                    }
                    // Final markdown render
                    try {
                        // Clean rp_meta before rendering
                        const { cleaned, meta } = extractRpMeta(accumulated) as any;
                        let html = await renderMarkdown(cleaned);
                        html = DOMPurify.sanitize(html);
                        // Generate suggestions based on accumulated + user intent
                        const nextSugg: string[] = [];
                        if (meta?.actions?.length) nextSugg.push(...meta.actions);
                        if (!nextSugg.length) {
                            if (intent === 'performance') {
                                nextSugg.push('Audit my Core Web Vitals by page type');
                                nextSugg.push('Suggest improvements for LCP under 2.5s');
                            } else if (intent === 'keyword_strategy') {
                                nextSugg.push('Cluster related keywords');
                                nextSugg.push('Find long-tail opportunities');
                            } else if (intent === 'technical_seo') {
                                nextSugg.push('Check indexing coverage issues');
                                nextSugg.push('List crawl budget optimizations');
                            } else if (intent === 'competitor') {
                                nextSugg.push('Compare top 3 competitors SERP presence');
                                nextSugg.push('Identify content gaps vs competitor');
                            } else if (intent === 'structured_data') {
                                nextSugg.push('Generate JSON-LD for product variant');
                                nextSugg.push('Validate schema types I should add');
                            } else if (intent === 'content_optimization') {
                                nextSugg.push('Rewrite for featured snippet potential');
                                nextSugg.push('Suggest internal linking targets');
                            } else {
                                nextSugg.push('Analyze my Core Web Vitals');
                                nextSugg.push('Suggest schema markup for a product page');
                            }
                        }
                        setSuggestions(nextSugg.slice(0, 4));
                        setMessages(prev => prev.map(m => m.id === aiId ? { ...m, response: html, intent: meta?.intent || intent } : m));
                    } catch { /* ignore */ }
                }
            } catch { /* streaming failed, fallback to legacy */ } finally {
                setStreaming(false);
                streamAbortRef.current = null;
                streamingMessageIdRef.current = null;
            }

            if (usedStreaming) {
                setAnnouncements(a => [...a.slice(-3), 'AI response received']);
                setIsLoading(false);
                return;
            }

            // One retry on 401 with forced token refresh
            const doRequest = async (forced = false) => fetch('/api/chat/customer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${forced ? await (auth.currentUser || user as AuthUserLike)?.getIdToken?.(true) : token}`,
                },
                body: JSON.stringify({
                    message: messageToSend,
                    url: currentUrl,
                    sessionId: sessionId || undefined,
                }),
            });
            let response = await doRequest(false);
            if (response.status === 401) {
                response = await doRequest(true);
            }

            if (!response.ok) {
                let errMsg = 'Failed to send message';
                try {
                    const errorData = await response.json();
                    errMsg = errorData.error || errMsg;
                } catch {
                    // Ignore JSON parse errors
                }
                if (response.status === 401) {
                    errMsg = 'Authentication failed. Please sign in again and retry.';
                }
                throw new Error(errMsg);
            }

            const data: ChatResponse = await response.json();

            // Update session ID if new
            if (data.sessionId && data.sessionId !== sessionId) {
                setSessionId(data.sessionId);
            }

            // Add AI response
            // Extract rp_meta for suggestions
            const { cleaned, meta } = extractRpMeta(data.response) as any;
            let html = await renderMarkdown(cleaned);
            html = DOMPurify.sanitize(html);
            const aiMessage: ChatMessage = {
                id: `ai_${Date.now()}`,
                message: '',
                response: html,
                timestamp: data.timestamp,
                isUser: false,
                tokensUsed: data.tokensUsed,
                intent: meta?.intent || intent,
            };

            if (meta?.actions?.length) setSuggestions(meta.actions.slice(0,4));

            setMessages(prev => [...prev, aiMessage]);
            // Accessibility announcement
            setAnnouncements(a => [...a.slice(-3), 'New AI response available']);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send message');
            console.error('Chat error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Clear history (local + remote current session metadata not deleted for simplicity)
    const clearHistory = () => {
        setMessages([]);
        try { localStorage.removeItem('rp_chat_recent'); } catch {}
        setAnnouncements(a => [...a.slice(-3), 'Chat history cleared']);
    };

    // Image attach handler (uploads to Firebase Storage and persists attachment metadata)
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const maxMB = 5;
        if (!file.type.startsWith('image/')) { setError('Unsupported image type'); return; }
        if (file.size > maxMB * 1024 * 1024) { setError(`Image exceeds ${maxMB}MB`); return; }
        if (attachmentsUsed >= getAttachmentLimit(profile?.subscriptionTier)) { setError('Attachment quota reached'); return; }
        setPendingImage(file);
    };
    const attachImage = async () => {
        if (!pendingImage || !user) return;
        setUploading(true);
        try {
            const token = await (auth.currentUser || user as AuthUserLike)?.getIdToken?.();
            if (!token) throw new Error('Auth required');
            const path = `chatUploads/${user.uid}/${Date.now()}_${pendingImage.name}`;
            const sRef = storageRef(storage, path);
            await uploadBytes(sRef, pendingImage);
            const url = await getDownloadURL(sRef);
            const tempMsg: ChatMessage = {
                id: `img_${Date.now()}`,
                message: pendingImage.name,
                response: '',
                timestamp: new Date().toISOString(),
                isUser: true,
                type: 'image',
                mediaUrl: url
            };
            setMessages(m => [...m, tempMsg]);
            setAnnouncements(a => [...a.slice(-3), 'Image uploaded']);
            setAttachmentsUsed(c => c + 1);
            // Persist attachment
            try {
                await fetch('/api/chat/customer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ attachments: [{ type: 'image', mediaUrl: url, name: pendingImage.name }] })
                });
            } catch { /* ignore */ }
        } catch (e) {
            setError('Image upload failed');
            setMessages(m => [...m, { id: `sys_${Date.now()}`, message: '', response: 'Image upload failed', timestamp: new Date().toISOString(), isUser: false, type: 'system' }]);
            setAnnouncements(a => [...a.slice(-3), 'Image upload failed']);
            setFailedImage(pendingImage);
        } finally {
            setPendingImage(null);
            setUploading(false);
        }
    };

    // Voice note recorder: records audio, uploads to Firebase Storage, then persists attachment via backend API
    const [micBlocked, setMicBlocked] = useState(false);
    const startRecording = async () => {
        if (!navigator.mediaDevices?.getUserMedia) { setError('Microphone not supported in this browser'); return; }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            recordedChunksRef.current = [];
            recorder.ondataavailable = e => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
            recorder.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
                setPendingAudio(blob);
                setAnnouncements(a => [...a.slice(-3), 'Voice note recorded']);
                // stop tracks to release hardware
                stream.getTracks().forEach(t => t.stop());
            };
            recorder.start();
            audioRecorderRef.current = recorder;
            setAnnouncements(a => [...a.slice(-3), 'Recording started']);
        } catch (e: unknown) {
            setMicBlocked(true);
            let msg = 'Unable to access microphone';
            if (typeof e === 'object' && e !== null) {
                const anyErr = e as { name?: unknown; message?: unknown };
                if (anyErr.name === 'NotAllowedError') {
                    msg = 'Microphone access denied by browser or site permissions policy.';
                } else if (typeof anyErr.message === 'string') {
                    msg = anyErr.message;
                }
            }
            setError(msg);
            setAnnouncements(a => [...a.slice(-3), 'Microphone blocked']);
        }
    };
    const stopRecording = () => {
        try { audioRecorderRef.current?.stop(); } catch {}
        audioRecorderRef.current = null;
    };
    const attachAudio = async () => {
        if (!pendingAudio) return;
        setUploading(true);
        try {
            const blob = pendingAudio;
            const maxAudioMB = 10;
            if (blob.size > maxAudioMB * 1024 * 1024) {
                throw new Error('Audio exceeds 10MB');
            }
            // Enforce attachment quota similar to images
            if (attachmentsUsed >= getAttachmentLimit(profile?.subscriptionTier)) {
                throw new Error('Attachment quota reached');
            }
            const path = `chatUploads/${user?.uid}/audio_${Date.now()}.webm`;
            const sRef = storageRef(storage, path);
            await uploadBytes(sRef, blob);
            const url = await getDownloadURL(sRef);
            const tempMsg: ChatMessage = {
                id: `audio_${Date.now()}`,
                message: 'Voice note',
                response: '',
                timestamp: new Date().toISOString(),
                isUser: true,
                type: 'audio',
                mediaUrl: url
            };
            setMessages(m => [...m, tempMsg]);
            setAnnouncements(a => [...a.slice(-3), 'Voice note uploaded']);
            setAttachmentsUsed(c => c + 1);
            try {
                const token = await (auth.currentUser || user as AuthUserLike)?.getIdToken?.();
                if (token) {
                    await fetch('/api/chat/customer', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ attachments: [{ type: 'audio', mediaUrl: url, name: 'voice-note.webm' }] })
                    });
                }
            } catch { /* ignore */ }
        } catch {
            setError('Audio upload failed');
            setMessages(m => [...m, { id: `sys_${Date.now()}`, message: '', response: 'Audio upload failed', timestamp: new Date().toISOString(), isUser: false, type: 'system' }]);
            setAnnouncements(a => [...a.slice(-3), 'Audio upload failed']);
            setFailedAudio(pendingAudio);
        } finally {
            setPendingAudio(null);
            setUploading(false);
        }
    };

    // Infinite scroll / load older messages when scrolled to top
    const onScrollAreaScroll: React.UIEventHandler<HTMLDivElement> = async (e) => {
        const target = e.currentTarget;
        const now = Date.now();
        if (now - lastScrollFetchRef.current < 400) return; // debounce ~400ms
        if (target.scrollTop < 40 && !loadingMore && hasMore && user) {
            setLoadingMore(true);
            lastScrollFetchRef.current = now;
            try {
                const token = await (auth.currentUser || user as AuthUserLike)?.getIdToken?.();
                const before = oldestMessageTsRef.current;
                const url = before ? `/api/chat/customer?limit=25&before=${encodeURIComponent(before)}` : `/api/chat/customer?limit=25`;
                const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data.messages) && data.messages.length) {
                        const mapped = (data.messages as unknown[]).map((m: unknown) => {
                            const mm = m as RawMessage;
                            return {
                                id: String(mm.id || ''),
                                message: mm.isUser ? (mm.message || '') : '',
                                response: !mm.isUser ? (mm.response || '') : '',
                                timestamp: String(mm.timestamp || new Date().toISOString()),
                                isUser: !!mm.isUser,
                                tokensUsed: mm.tokensUsed,
                                type: mm.type,
                                mediaUrl: mm.mediaUrl,
                            };
                        });
                        oldestMessageTsRef.current = mapped[0]?.timestamp || oldestMessageTsRef.current;
                        setHasMore(data.hasMore ?? false);
                        setMessages(prev => [...mapped, ...prev]);
                        // Maintain scroll position after prepending
                        requestAnimationFrame(() => {
                            target.scrollTop = target.scrollHeight / 4; // heuristic
                        });
                    } else {
                        setHasMore(false);
                    }
                }
            } catch {}
            setLoadingMore(false);
        }
    };

    // Handle Enter key press
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Prevent global key handlers from seeing this keystroke
        e.stopPropagation();
        // @ts-ignore
        if (typeof e.nativeEvent?.stopImmediatePropagation === 'function') {
            // Some environments support stopping immediate propagation
            // @ts-ignore
            e.nativeEvent.stopImmediatePropagation();
        }
        // Avoid sending during IME composition
        const composing = (e.nativeEvent as any)?.isComposing || isComposing;
        if (composing) return;
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void sendMessage();
        }
    };

    // Chat toggle button
    const ChatToggleButton = () => (
        <motion.div
            initial={reducedMotion ? false : { scale: 0 }}
            animate={reducedMotion ? { scale: 1 } : { scale: 1 }}
            whileHover={reducedMotion ? undefined : { scale: 1.05 }}
            whileTap={reducedMotion ? undefined : { scale: 0.95 }}
            className={cn(
                "fixed z-50",
                isMobile ? 'bottom-4 right-4' : 'bottom-6 right-6',
                className
            )}
        >
            <Button
                onClick={() => setIsOpen(true)}
                size="lg"
                className={cn(
                    'rounded-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg hover:shadow-xl transition-all duration-200',
                    isMobile ? 'w-12 h-12' : 'w-14 h-14'
                )}
                aria-label="Open RankPilot AI Chat"
            >
                <MessageCircle className="w-6 h-6" />
            </Button>
        </motion.div>
    );

    // Chat window
    const ChatWindow = () => (
        <motion.div
            ref={chatWindowRef}
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={reducedMotion ? { opacity: 1, height: isMinimized ? 'auto' : isMobile ? '70vh' : '600px' } : {
                opacity: 1,
                scale: 1,
                y: 0,
                height: isMinimized ? 'auto' : isMobile ? 'min(75vh,85dvh)' : '600px'
            }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
            transition={reducedMotion ? { duration: 0.05 } : { duration: 0.2 }}
            className={cn(
                'fixed z-50 bg-white rounded-2xl shadow-2xl border border-border',
                isMobile ? 'bottom-0 right-0 left-0 mx-auto w-full max-w-[520px] mb-0' : 'bottom-6 right-6 w-96',
                isMinimized && 'h-auto'
            )}
        >
            <Card className={cn('h-full border-none shadow-none', isMobile && 'rounded-2xl overflow-hidden')}>
                {/* Header */}
                <CardHeader className="flex flex-row items-center justify-between p-4 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <Bot className="w-5 h-5" />
                        <div>
                            <h3 className="font-semibold text-sm">RankPilot AI</h3>
                            <p className="text-xs opacity-90">SEO Assistant</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsMinimized(!isMinimized)}
                            className="h-8 w-8 p-0 text-white hover:bg-white/20"
                        >
                            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsOpen(false)}
                            className="h-8 w-8 p-0 text-white hover:bg-white/20"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>

                {!isMinimized && (
                    <CardContent className={cn('relative flex flex-col p-0', isMobile ? 'h-[calc(min(75vh,85dvh)-80px)]' : 'h-[calc(600px-80px)]')} style={isMobile ? { paddingBottom: 'env(safe-area-inset-bottom)' } : undefined}>
                        {sessionSummary && (
                            <div className="mb-2 rounded-xl border border-primary/20 bg-primary/10 p-3 text-[11px] leading-relaxed text-primary shadow-sm">
                                <div className="font-semibold text-xs mb-1 flex items-center gap-2">
                                    <span>Conversation Memory</span>
                                    {focusKeywords.length > 0 && (
                                        <span className="font-normal text-[10px] text-primary truncate max-w-[160px]">KW: {focusKeywords.slice(0,5).join(', ')}</span>
                                    )}
                                </div>
                                <div className="line-clamp-5" dangerouslySetInnerHTML={{ __html: sessionSummary.replace(/\n/g,'<br/>') }} />
                                {pendingActions.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {pendingActions.slice(0,6).map(a => (
                                            <label key={a} className="flex items-start gap-2 text-[10px] cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    className="mt-[2px] h-3 w-3 rounded border-primary text-primary focus:ring-primary"
                                                    checked={!!completedActions[a]}
                                                    onChange={() => {
                                                        setCompletedActions(prev => ({ ...prev, [a]: !prev[a] }));
                                                        if (actionUpdateDebounceRef.current) clearTimeout(actionUpdateDebounceRef.current);
                                                        actionUpdateDebounceRef.current = setTimeout(async () => {
                                                            try {
                                                                const token = await (auth.currentUser || user as AuthUserLike)?.getIdToken?.();
                                                                if (!token || !sessionId) return;
                                                                const res = await fetch(`/api/chat/customer/actions?sessionId=${sessionId}`, {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                                                    body: JSON.stringify({ progress: { ...completedActions, [a]: !completedActions[a] } })
                                                                });
                                                                if (res.ok) {
                                                                    const json = await res.json().catch(() => null);
                                                                    if (json?.actionStats) {
                                                                        setActionStats({
                                                                            totalCompleted: json.actionStats.totalCompleted || 0,
                                                                            totalPending: json.actionStats.totalPending || 0,
                                                                            completionRate: json.actionStats.completionRate || 0,
                                                                        });
                                                                    }
                                                                }
                                                            } catch { /* ignore */ }
                                                        }, 600);
                                                    }}
                                                />
                                                <span className={cn(
                                                    'transition-colors',
                                                    completedActions[a] && 'line-through opacity-60',
                                                    newActionHighlights.has(a) && !completedActions[a] && 'bg-success/15 text-success px-1 rounded'
                                                )}>{a}</span>
                                            </label>
                                        ))}
                                        {actionStats && (
                                            <div className="pt-1 text-[10px] text-primary flex items-center gap-2">
                                                <span>
                                                    Actions: {actionStats.totalCompleted}/{actionStats.totalCompleted + actionStats.totalPending}
                                                </span>
                                                <span className="inline-block h-1.5 w-16 rounded bg-primary/15 overflow-hidden">
                                                    <span
                                                        className="block h-full bg-primary transition-all"
                                                        style={{ width: `${Math.round(actionStats.completionRate * 100)}%` }}
                                                    />
                                                </span>
                                                <span>{Math.round(actionStats.completionRate * 100)}%</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        <ScrollArea className={cn('flex-1 p-4', isMobile && 'pt-3 pb-3')} onScrollCapture={(e) => { onScrollAreaScroll(e); handleManualScroll(e); }}>
                            <div ref={messagesViewportRef} role="log" aria-live={streaming ? 'polite' : 'off'} aria-label="Chat messages" className="space-y-4">
                                {loadingMore && (
                                    <div className="text-center text-xs text-muted-foreground">Loading…</div>
                                )}
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={cn('flex gap-3 group', msg.isUser ? 'justify-end' : 'justify-start')}
                                        role="listitem"
                                        aria-label={msg.isUser ? `User message ${msg.message?.slice(0,40)}` : 'AI message'}
                                        data-message-type={msg.type || (msg.isUser ? 'user' : 'ai')}
                                    >
                                        {!msg.isUser && (
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                                                <Bot className="w-4 h-4 text-white" />
                                            </div>
                                        )}

                                        <div
                                            className={cn(
                                                'relative max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed ring-1 ring-inset',
                                                msg.isUser
                                                    ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-sm'
                                                    : msg.type === 'system'
                                                        ? 'bg-warning/15 text-warning ring-warning/30'
                                                        : 'bg-muted text-foreground ring-border'
                                            )}
                                        >
                                            {msg.type === 'image' && msg.mediaUrl && (
                                                <img loading="lazy" src={msg.mediaUrl} alt={msg.message || 'uploaded image'} className="rounded mb-2 max-h-60 object-contain shadow-sm" />
                                            )}
                                            {msg.type === 'audio' && msg.mediaUrl && (
                                                <audio controls className="w-full mb-2">
                                                    <source src={msg.mediaUrl} />
                                                </audio>
                                            )}
                                            {msg.isUser ? (
                                                <div className="whitespace-pre-wrap break-words">
                                                    {msg.message}
                                                </div>
                                            ) : (
                                                <div
                                                    className="prose prose-sm max-w-none dark:prose-invert [&_table]:w-full [&_table]:text-left [&_table]:border [&_table]:border-collapse [&_th]:bg-muted [&_td]:align-top [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_pre]:bg-secondary [&_pre]:text-secondary-foreground [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:shadow-inner overflow-x-auto"
                                                    dangerouslySetInnerHTML={{
                                                        __html: msg.response || ''
                                                    }}
                                                />
                                            )}
                                            {!msg.isUser && streaming && streamingMessageIdRef.current === msg.id && (
                                                <div className="flex items-center gap-2 mt-2 text-[11px] text-primary select-none">
                                                    <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                                                    <span aria-live="polite">Streaming…</span>
                                                    <button
                                                        onClick={() => {
                                                            if (streamAbortRef.current) {
                                                                streamAbortRef.current.abort();
                                                                setStreaming(false);
                                                                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, response: (m.response || '') + '<br/><em>[Canceled]</em>', type: 'system' } : m));
                                                                setAnnouncements(a => [...a.slice(-3), 'Generation canceled']);
                                                            }
                                                        }}
                                                        className="ml-1 underline hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary rounded-sm"
                                                        aria-label="Cancel streaming response"
                                                    >Cancel</button>
                                                </div>
                                            )}

                                            {!msg.isUser && msg.tokensUsed && (
                                                <div className="mt-2 flex items-center gap-2">
                                                    <Badge variant="secondary" className="text-xs">
                                                        {msg.tokensUsed} tokens
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>

                                        {msg.isUser && (
                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                                <User className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {isLoading && (
                                    <div className="flex gap-3 justify-start">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                                            <Bot className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="bg-muted rounded-lg p-3 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Thinking...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
                                        {error}
                                    </div>
                                )}
                                {(failedImage || failedAudio) && (
                                    <div className="bg-warning/15 border border-warning/30 rounded p-2 text-xs flex flex-col gap-1">
                                        {failedImage && <div>Image failed: {failedImage.name} <button className="underline" onClick={() => { setPendingImage(failedImage); setFailedImage(null); }}>retry</button></div>}
                                        {failedAudio && <div>Audio failed <button className="underline" onClick={() => { setPendingAudio(failedAudio); setFailedAudio(null); }}>retry</button></div>}
                                    </div>
                                )}
                                {/* Pending attachments preview */}
                {(pendingImage || pendingAudio || uploading) && (
                                    <div className="flex flex-col gap-2 text-xs text-muted-foreground bg-muted p-2 rounded">
                                        {pendingImage && <div>Image ready: {pendingImage.name} <button onClick={attachImage} className="underline text-primary">attach</button></div>}
                                        {pendingAudio && <div>Voice note ready <button onClick={attachAudio} className="underline text-primary">attach</button></div>}
                    {uploading && <div>Uploading…</div>}
                                    </div>
                                )}
                            </div>
                            <div ref={messagesEndRef} />
                        </ScrollArea>

                        {/* Scroll to newest (mobile only) */}
                        {isMobile && scrolledAway && !isMinimized && (
                            <div className="pointer-events-none absolute inset-x-0 bottom-[76px] flex justify-center">
                                <button
                                    onClick={() => { scrollToBottom(); setScrolledAway(false); userScrolledUpRef.current = false; }}
                                    className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-medium px-3 py-1.5 shadow-lg shadow-black/10 hover:from-primary/90 hover:to-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary active:scale-[.97] transition"
                                    aria-label="Scroll to newest messages"
                                >
                                    <span>New messages</span>
                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="7 13 12 18 17 13"/><line x1="12" y1="18" x2="12" y2="6"/></svg>
                                </button>
                            </div>
                        )}

                        {/* Input */}
                        {suggestions.length > 0 && (
                            <div className="px-4 pb-2 pt-1 border-t border-border bg-gradient-to-r from-muted/50 via-background to-muted/50 overflow-x-auto scrollbar-none">
                                <div className="flex gap-2 min-h-[40px] items-center">
                                    {suggestions.map(s => (
                                        <button
                                            key={s}
                                            onClick={() => { setInputValue(s); scrollToBottom(); }}
                                            className="shrink-0 rounded-full bg-muted hover:bg-muted/80 active:bg-muted/70 text-xs px-3 py-1.5 transition focus:outline-none focus:ring-2 focus:ring-primary"
                                            aria-label={`Suggestion: ${s}`}
                                        >{s}</button>
                                    ))}
                                    <button
                                        onClick={() => setSuggestions([])}
                                        className="text-[10px] text-muted-foreground hover:text-foreground ml-1"
                                        aria-label="Hide suggestions"
                                    >✕</button>
                                </div>
                            </div>
                        )}
                        <div className={cn('border-t border-border bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60', isMobile ? 'p-3' : 'p-4')}>
                            <div className={cn('flex gap-2 items-center', isMobile && 'gap-1')}>
                                {/* Attachment buttons */}
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                                <Button variant="ghost" size="icon" className={cn('h-10 w-10', isMobile && 'h-9 w-9')} onClick={() => fileInputRef.current?.click()} aria-label="Attach image">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                                </Button>
                                {audioRecorderRef.current ? (
                                    <Button variant="ghost" size="icon" className={cn('h-10 w-10 text-destructive', isMobile && 'h-9 w-9')} onClick={stopRecording} aria-label="Stop recording">
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12"/></svg>
                                    </Button>
                                ) : (
                                    <Button variant="ghost" size="icon" className={cn('h-10 w-10', isMobile && 'h-9 w-9')} onClick={startRecording} aria-label="Record voice note">
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v14"/><path d="M8 5v6a4 4 0 0 0 8 0V5"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                                    </Button>
                                )}
                                <Input
                                    ref={inputRef}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onCompositionStart={() => setIsComposing(true)}
                                    onCompositionEnd={() => setIsComposing(false)}
                                    placeholder="Ask about your SEO performance..."
                                    disabled={isLoading || !user}
                                    className={cn('flex-1', isMobile && 'h-11 text-sm')}
                                />
                                <Button
                                    onClick={sendMessage}
                                    disabled={!inputValue.trim() || isLoading || streaming || !user || !canSend}
                                    size="sm"
                                    className={cn('relative bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 disabled:opacity-60 disabled:cursor-not-allowed', isMobile && 'px-3')}
                                    aria-label="Send message"
                                >
                                    {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </Button>
                                <Button variant="ghost" size="icon" className={cn('h-10 w-10', isMobile && 'h-9 w-9')} onClick={clearHistory} aria-label="Clear history">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                                </Button>
                            </div>

                            {!user && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    Please sign in to use the AI assistant
                                </p>
                            )}
                        </div>
                    </CardContent>
                )}
            </Card>
            {/* ARIA live region for announcements */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
                {announcements.map((a,i) => <div key={i}>{a}</div>)}
            </div>
        </motion.div>
    );

    if (!user) {
        return null; // Don't show chatbot if user is not authenticated
    }

    return (
        <>
            <AnimatePresence>
                {!isOpen && <ChatToggleButton />}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && <ChatWindow />}
            </AnimatePresence>
        </>
    );
}
