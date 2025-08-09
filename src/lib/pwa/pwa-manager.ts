/**
 * PWA Service Worker Registration and Management
 * Advanced Architecture Enhancement - DevReady Phase 3
 * 
 * Features:
 * - Service worker registration with update management
 * - Push notification subscription management
 * - Offline data synchronization
 * - Background sync for SEO analysis
 * - InstallPrompt management for PWA installation
 */

'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';

interface PWAInstallPrompt extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

interface NotificationOptions {
    title: string;
    body: string;
    tag?: string;
    icon?: string;
    badge?: string;
    data?: any;
    actions?: Array<{
        action: string;
        title: string;
        icon?: string;
    }>;
}

export class PWAManager {
    private static instance: PWAManager;
    private registration: ServiceWorkerRegistration | null = null;
    private installPrompt: PWAInstallPrompt | null = null;
    private isOnline = true;
    private pendingData: any[] = [];

    static getInstance(): PWAManager {
        if (!PWAManager.instance) {
            PWAManager.instance = new PWAManager();
        }
        return PWAManager.instance;
    }

    constructor() {
        if (typeof window !== 'undefined') {
            this.initializePWA();
        }
    }

    private async initializePWA() {
        const enablePWA = process.env.NEXT_PUBLIC_ENABLE_PWA === 'true' || process.env.NODE_ENV === 'production';

        // In development, proactively unregister any existing service workers to avoid stale caches
        if (!enablePWA && 'serviceWorker' in navigator) {
            try {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const reg of regs) {
                    await reg.unregister();
                }
                // Also prompt the controller to stop if present
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
                }
                console.info('[PWA] Service workers unregistered in development');
            } catch (e) {
                console.warn('[PWA] Failed to unregister service workers in development:', e);
            }
        }

        // Register service worker only when enabled
        if (enablePWA && 'serviceWorker' in navigator) {
            try {
                this.registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                });

                console.log('[PWA] Service Worker registered successfully');

                // Handle service worker updates
                this.registration.addEventListener('updatefound', () => {
                    const newWorker = this.registration?.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                this.showUpdateAvailableNotification();
                            }
                        });
                    }
                });

                // Listen for messages from service worker
                navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

            } catch (error) {
                console.error('[PWA] Service Worker registration failed:', error);
            }
        }

        // Handle install prompt (only when PWA is enabled)
        if (enablePWA) {
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                this.installPrompt = e as PWAInstallPrompt;
                this.showInstallPrompt();
            });
        }

        // Handle app installed
        window.addEventListener('appinstalled', () => {
            console.log('[PWA] App installed successfully');
            this.installPrompt = null;
        });

        // Handle online/offline status
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncPendingData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });

        // Initialize push notifications only when PWA is enabled
        if (enablePWA) {
            this.initializePushNotifications();
        }
    }

    private handleServiceWorkerMessage(event: MessageEvent) {
        const { type, payload } = event.data;

        switch (type) {
            case 'SYNC_SUCCESS':
                this.showNotification('Data Synchronized', {
                    body: 'Your data has been synchronized successfully',
                    tag: 'sync-success'
                });
                break;

            case 'ANALYSIS_COMPLETE':
                this.showNotification('Analysis Complete', {
                    body: payload.message || 'Your SEO analysis is ready',
                    tag: 'analysis-complete',
                    data: { url: '/neuroseo/results' },
                    actions: [
                        { action: 'view', title: 'View Results' },
                        { action: 'dismiss', title: 'Dismiss' }
                    ]
                });
                break;

            case 'CACHE_UPDATED':
                console.log('[PWA] Cache updated');
                break;

            default:
                console.log('[PWA] Unknown message from service worker:', event.data);
        }
    }

    private showUpdateAvailableNotification() {
        this.showNotification('Update Available', {
            body: 'A new version of RankPilot is available',
            tag: 'update-available',
            actions: [
                { action: 'update', title: 'Update Now' },
                { action: 'later', title: 'Later' }
            ]
        });
    }

    private showInstallPrompt() {
        // Show custom install prompt UI
        const event = new CustomEvent('pwa-install-prompt', {
            detail: { installPrompt: this.installPrompt }
        });
        window.dispatchEvent(event);
    }

    async installApp(): Promise<boolean> {
        if (!this.installPrompt) {
            return false;
        }

        try {
            await this.installPrompt.prompt();
            const { outcome } = await this.installPrompt.userChoice;

            if (outcome === 'accepted') {
                console.log('[PWA] User accepted the install prompt');
                return true;
            } else {
                console.log('[PWA] User dismissed the install prompt');
                return false;
            }
        } catch (error) {
            console.error('[PWA] Install prompt failed:', error);
            return false;
        }
    }

    private async initializePushNotifications() {
        // Passive capability check only; do not request permission automatically
        try {
            if (!('Notification' in window) || !('PushManager' in window)) {
                console.log('[PWA] Push notifications not supported');
                return;
            }
            console.log('[PWA] Notification permission (current):', Notification.permission);
        } catch (e) {
            // Ignore in environments that lack Notification
        }
    }

    async subscribeToPushNotifications(userId: string): Promise<boolean> {
        if (!this.registration) {
            return false;
        }

        try {
            // Request permission only when user opts-in
            if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') return false;
            }

            if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
                return false;
            }

            const subscription = await this.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(
                    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
                    'BMqSvZWj5OwrOhNM2NQpjqPzqKJFVj1DdM7Z4lNXfqGoCz4O9g-GNp2K7-Qh-ILRgYlCjFkf8ZKqVl_qDlH-J9U'
                ) as BufferSource
            });

            // Send subscription to server
            await fetch('/api/push-notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscription,
                    userId
                })
            });

            console.log('[PWA] Push notification subscription successful');
            return true;
        } catch (error) {
            console.error('[PWA] Push notification subscription failed:', error);
            return false;
        }
    } async unsubscribeFromPushNotifications(): Promise<boolean> {
        if (!this.registration) {
            return false;
        }

        try {
            const subscription = await this.registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();

                // Notify server
                await fetch('/api/push-notifications/unsubscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subscription })
                });
            }

            console.log('[PWA] Push notification unsubscribed');
            return true;
        } catch (error) {
            console.error('[PWA] Push notification unsubscribe failed:', error);
            return false;
        }
    }

    private urlBase64ToUint8Array(base64String: string): Uint8Array {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    async showNotification(title: string, options: Partial<NotificationOptions> = {}) {
        // Guard for unsupported Notification API or missing registration
        if (!this.registration || typeof Notification === 'undefined' || Notification.permission !== 'granted') {
            return;
        }

        const defaultOptions: NotificationOptions = {
            title,
            body: options.body || '',
            icon: '/android-chrome-192x192.png',
            badge: '/favicon-32x32.png',
            tag: options.tag || 'default',
            data: options.data,
            actions: options.actions || []
        };

        await this.registration.showNotification(title, {
            ...defaultOptions,
            ...options
        });
    }

    async syncInBackground(tag: string, data: any) {
        if (!this.registration) {
            this.addToPendingData(tag, data);
            return;
        }

        try {
            // Store data for background sync
            await this.storeDataForSync(tag, data);

            // Register background sync if supported
            if ('sync' in this.registration) {
                await (this.registration as any).sync.register(tag);
                console.log('[PWA] Background sync registered:', tag);
            } else {
                console.log('[PWA] Background sync not supported, queuing for manual sync');
                this.addToPendingData(tag, data);
            }
        } catch (error) {
            console.error('[PWA] Background sync registration failed:', error);
            this.addToPendingData(tag, data);
        }
    } private async storeDataForSync(tag: string, data: any) {
        // Store in IndexedDB for service worker access
        if ('indexedDB' in window) {
            const db = await this.openIndexedDB();
            const transaction = db.transaction(['pending-sync'], 'readwrite');
            const store = transaction.objectStore('pending-sync');

            await store.add({
                id: Date.now(),
                tag,
                data,
                timestamp: new Date().toISOString()
            });
        } else {
            this.addToPendingData(tag, data);
        }
    }

    private async openIndexedDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('rankpilot-pwa', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                if (!db.objectStoreNames.contains('pending-sync')) {
                    db.createObjectStore('pending-sync', { keyPath: 'id' });
                }
            };
        });
    }

    private addToPendingData(tag: string, data: any) {
        this.pendingData.push({ tag, data, timestamp: Date.now() });
    }

    private async syncPendingData() {
        if (this.pendingData.length === 0) {
            return;
        }

        console.log('[PWA] Syncing pending data...');

        for (const item of this.pendingData) {
            try {
                await this.syncInBackground(item.tag, item.data);
            } catch (error) {
                console.error('[PWA] Failed to sync pending data:', error);
            }
        }

        this.pendingData = [];
    }

    isInstallable(): boolean {
        return this.installPrompt !== null;
    }

    isInstalled(): boolean {
        return window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;
    }

    getConnectionStatus(): 'online' | 'offline' {
        return this.isOnline ? 'online' : 'offline';
    }

    async updateServiceWorker() {
        if (this.registration) {
            await this.registration.update();
        }
    }
}

// React hook for PWA functionality
export function usePWA() {
    const { user } = useAuth();
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);

    const pwaManager = PWAManager.getInstance();

    useEffect(() => {
        // Check initial states (with guards to avoid throwing in unsupported contexts)
        try { setIsInstallable(pwaManager.isInstallable()); } catch { }
        try { setIsInstalled(pwaManager.isInstalled()); } catch { }
        try { setConnectionStatus(pwaManager.getConnectionStatus()); } catch { }
        try {
            const granted = typeof Notification !== 'undefined' && Notification.permission === 'granted';
            setNotificationsEnabled(granted);
        } catch {
            setNotificationsEnabled(false);
        }

        // Listen for PWA events
        const handleInstallPrompt = () => {
            setIsInstallable(true);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsInstallable(false);
        };

        const handleOnline = () => setConnectionStatus('online');
        const handleOffline = () => setConnectionStatus('offline');

        if (typeof window !== 'undefined') {
            window.addEventListener('pwa-install-prompt', handleInstallPrompt);
            window.addEventListener('appinstalled', handleAppInstalled);
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('pwa-install-prompt', handleInstallPrompt);
                window.removeEventListener('appinstalled', handleAppInstalled);
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            }
        };
    }, []);

    const installApp = async () => {
        const success = await pwaManager.installApp();
        if (success) {
            setIsInstalled(true);
            setIsInstallable(false);
        }
        return success;
    };

    const enableNotifications = async () => {
        if (!user) return false;

        const success = await pwaManager.subscribeToPushNotifications(user.uid);
        setNotificationsEnabled(success);
        return success;
    };

    const disableNotifications = async () => {
        const success = await pwaManager.unsubscribeFromPushNotifications();
        setNotificationsEnabled(!success);
        return success;
    };

    const syncData = async (tag: string, data: any) => {
        await pwaManager.syncInBackground(tag, data);
    };

    const showNotification = async (title: string, options?: Partial<NotificationOptions>) => {
        await pwaManager.showNotification(title, options);
    };

    return {
        isInstallable,
        isInstalled,
        connectionStatus,
        notificationsEnabled,
        installApp,
        enableNotifications,
        disableNotifications,
        syncData,
        showNotification,
        updateApp: () => pwaManager.updateServiceWorker()
    };
}
