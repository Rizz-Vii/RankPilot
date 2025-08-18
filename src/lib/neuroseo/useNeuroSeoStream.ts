import { useCallback, useEffect, useRef, useState } from 'react';

export interface NeuroSeoStreamEvent {
    type: string;
    data: unknown;
    ts: number;
}

export interface UseNeuroSeoStreamOptions {
    autoStart?: boolean;
    analysisType?: string;
    userId?: string;
    onEvent?: (evt: NeuroSeoStreamEvent) => void;
    onComplete?: (summary: unknown) => void;
    onError?: (err: unknown) => void;
}

export interface NeuroSeoStreamSummary {
    overallScore?: number;
    duration?: number;
    [key: string]: unknown; // keep extensible
}

interface StreamState {
    status: 'idle' | 'connecting' | 'streaming' | 'complete' | 'error';
    progress?: { completed: number; total: number };
    summary?: NeuroSeoStreamSummary;
    error?: string;
    events: NeuroSeoStreamEvent[];
    cached?: boolean;
    queuedPosition?: number;
}

/**
 * React hook to consume the /api/neuroseo/stream SSE endpoint using fetch streaming (POST not supported by native EventSource)
 */
export function useNeuroSeoStream(urls: string[], opts: UseNeuroSeoStreamOptions = {}) {
    const { autoStart = false, analysisType = 'comprehensive', userId = 'anonymous', onEvent, onComplete, onError } = opts;
    const [state, setState] = useState<StreamState>({ status: 'idle', events: [] });
    const abortRef = useRef<AbortController | null>(null);
    const startedRef = useRef(false);

    const start = useCallback(() => {
        if (startedRef.current || !urls.length) return;
        startedRef.current = true;
        setState(s => ({ ...s, status: 'connecting', error: undefined }));

        abortRef.current = new AbortController();
        const controller = abortRef.current;

        fetch('/api/neuroseo/stream', {
            method: 'POST',
            body: JSON.stringify({ urls, analysisType, userId }),
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
        }).then(async (res) => {
            if (!res.body) throw new Error('No stream body');
            setState(s => ({ ...s, status: 'streaming' }));
            const reader = res.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buf = '';

            const processBuffer = () => {
                const parts = buf.split('\n\n');
                buf = parts.pop() || '';
                for (const raw of parts) {
                    const lines = raw.split('\n');
                    let eventType = 'message';
                    let dataLine = '';
                    for (const line of lines) {
                        if (line.startsWith('event:')) eventType = line.slice(6).trim();
                        if (line.startsWith('data:')) dataLine += line.slice(5).trim();
                    }
                    if (!dataLine) continue;
                    try {
                        const data = JSON.parse(dataLine);
                        const evt: NeuroSeoStreamEvent = { type: eventType, data, ts: Date.now() };
                        setState(s => {
                            const next: StreamState = { ...s, events: [...s.events, evt] };
                            if (evt.type === 'progress') next.progress = data;
                            if (evt.type === 'cached') next.cached = true;
                            if (evt.type === 'queued') next.queuedPosition = data.position;
                            if (evt.type === 'complete') next.summary = data;
                            if (evt.type === 'fallback') { next.summary = data; next.status = 'complete'; }
                            if (evt.type === 'error') { next.status = 'error'; next.error = data.message; }
                            if (evt.type === 'end') next.status = next.status === 'error' ? 'error' : 'complete';
                            return next;
                        });
                        onEvent?.(evt);
                        if (evt.type === 'complete') onComplete?.(evt.data);
                        if (evt.type === 'error') onError?.(evt.data);
                    } catch { }
                }
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                processBuffer();
            }
            processBuffer();
        }).catch(err => {
            if (controller.signal.aborted) return;
            setState(s => ({ ...s, status: 'error', error: err.message }));
            onError?.(err);
        });
    }, [urls, analysisType, userId, onEvent, onComplete, onError]);

    const cancel = useCallback(() => {
        abortRef.current?.abort();
        startedRef.current = false;
    }, []);

    useEffect(() => {
        if (autoStart) start();
        return () => cancel();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoStart, urls.join(','), analysisType]);

    return { ...state, start, cancel };
}
