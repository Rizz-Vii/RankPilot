"use client";
/** Dev-only Agents feature flag toggle floating control. */
import React, { useEffect, useState } from 'react';

const LS_KEY = 'dev_agents_enabled_v1';

function getInitial(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const raw = window.localStorage.getItem(LS_KEY);
        if (raw === 'true') return true;
    } catch { }
    return false;
}

export const AgentsToggle: React.FC = () => {
    const [enabled, setEnabled] = useState<boolean>(getInitial);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);
    useEffect(() => {
        if (!mounted) return;
        try { window.localStorage.setItem(LS_KEY, String(enabled)); } catch { }
        (async () => {
            try {
                const method = enabled ? 'POST' : 'DELETE';
                await fetch('/api/agents/enable', { method });
            } catch { /* swallow */ }
        })();
        if (enabled) (window as any).RANKPILOT_AGENTS_ENABLED = true; else delete (window as any).RANKPILOT_AGENTS_ENABLED;
    }, [enabled, mounted]);

    if (process.env.NODE_ENV !== 'development') return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999]">
            <button
                onClick={() => setEnabled(e => !e)}
                className={`px-3 py-2 rounded-md text-xs font-medium border shadow-sm backdrop-blur-sm transition-colors ${enabled ? 'bg-primary text-primary-foreground border-primary' : 'bg-background/90 text-foreground border-border hover:bg-muted/70'}`}
                title="Toggle experimental Agents feature"
            >
                Agents: {enabled ? 'ON' : 'OFF'}
            </button>
        </div>
    );
};
