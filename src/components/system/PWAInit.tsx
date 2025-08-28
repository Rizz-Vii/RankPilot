'use client';

import { PWAManager } from '@/lib/pwa/pwa-manager';
import { useEffect } from 'react';

/**
 * PWAInit
 * Centralizes safe PWA bootstrapping logic without inline scripts.
 * - If NEXT_PUBLIC_ENABLE_PWA !== 'true', proactively unregister any existing service workers.
 * - If enabled, do nothing here (PWAManager handles registration when used).
 */
export function PWAInit() {
    useEffect(() => {
        const enablePWA = process.env.NEXT_PUBLIC_ENABLE_PWA === 'true';
        // If enabled, proactively instantiate PWAManager to trigger registration
        if (enablePWA) {
            try {
                PWAManager.getInstance();
            } catch {
                // ignore
            }
        }
        if (!enablePWA && 'serviceWorker' in navigator) {
            void (async () => {
                try {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(regs.map((r) => r.unregister()));
                    if (navigator.serviceWorker.controller) {
                        try { navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' }); } catch { }
                    }
                    // Intentionally quiet – avoid noisy console output
                } catch {
                    // Swallow – unregister best-effort only
                }
            })();
        }
    }, []);

    return null;
}
