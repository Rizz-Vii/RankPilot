"use client";
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface TriggerOptions {
    optimistic?: () => void; // run immediately (UI update) before network
    suppressToast?: boolean; // disable default success toast
    label?: string; // custom action label for toasts
}

interface UseAutomationTriggerConfig {
    cooldownMs?: number;
}

interface TriggerResult {
    trigger: (action: string, options?: TriggerOptions) => Promise<void>;
    running: Record<string, boolean>;
    lastRun: Record<string, number>;
}

/**
 * Consolidated automation trigger logic (debounce/cooldown + running state + toasts + optimistic hook).
 * Use to standardize automation action buttons across pages.
 */
export function useAutomationTrigger(config: UseAutomationTriggerConfig = {}): TriggerResult {
    const { cooldownMs = 4000 } = config;
    const { toast } = useToast();
    const [running, setRunning] = useState<Record<string, boolean>>({});
    const [lastRun, setLastRun] = useState<Record<string, number>>({});

    const trigger = useCallback(async (action: string, options?: TriggerOptions) => {
        const now = Date.now();
        if (lastRun[action] && now - lastRun[action] < cooldownMs) {
            toast({ title: 'Please wait', description: 'Recently triggered', variant: 'default' });
            return;
        }
        setLastRun(s => ({ ...s, [action]: now }));
        // optimistic update before network call
        try { options?.optimistic?.(); } catch { /* ignore optimistic errors */ }
        setRunning(r => ({ ...r, [action]: true }));
        try {
            const res = await fetch('/api/automation/run-now', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actions: [action] })
            });
            if (!res.ok) throw new Error('Request failed');
            if (!options?.suppressToast) {
                toast({ title: 'Automation triggered', description: options?.label || action });
            }
        } catch (e: any) {
            toast({ title: 'Failed', description: e.message || ('Could not trigger ' + action), variant: 'destructive' });
        } finally {
            setRunning(r => ({ ...r, [action]: false }));
        }
    }, [cooldownMs, lastRun, toast]);

    return { trigger, running, lastRun };
}
