export interface StreamOptions {
    signal?: AbortSignal;
    timeoutMs?: number;
    headers?: Record<string, string>;
    method?: string;
    body?: BodyInit | null;
}

export async function fetchSSE(url: string, opts: StreamOptions = {}): Promise<Response> {
    const controller = new AbortController();
    const timeout = typeof opts.timeoutMs === 'number' && opts.timeoutMs > 0
        ? setTimeout(() => controller.abort(), opts.timeoutMs)
        : null;
    const signal = opts.signal ? mergeSignals(opts.signal, controller.signal) : controller.signal;
    try {
        const res = await fetch(url, {
            method: opts.method || 'GET',
            body: opts.body,
            headers: { accept: 'text/event-stream', ...(opts.headers || {}) },
            signal,
        });
        return res;
    } finally {
        if (timeout) clearTimeout(timeout);
    }
}

function mergeSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
    const ctl = new AbortController();
    const onAbort = () => ctl.abort();
    if (a.aborted || b.aborted) { ctl.abort(); return ctl.signal; }
    a.addEventListener('abort', onAbort, { once: true });
    b.addEventListener('abort', onAbort, { once: true });
    return ctl.signal;
}
