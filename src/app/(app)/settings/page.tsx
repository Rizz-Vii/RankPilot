"use client";

import { AccessibilityAnnouncer } from '@/components/accessibility/AccessibilityAnnouncer';
import { LanguageSelector } from '@/components/i18n/LanguageSelector';
import { ThemeConfiguration } from '@/components/theme/ThemeConfiguration';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { useAccessibility } from '@/lib/accessibility/accessibility-system';
import { useI18n } from '@/lib/i18n/internationalization-system';
import { useTheme, type ThemePreferences, type ThemeMode } from '@/lib/themes/theme-system';
import { Accessibility, Bell, CreditCard, ExternalLink, Globe, Lock, Palette, Shield, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import React, { useState } from 'react';
import { toJsDate } from '@/lib/utils';
import { ToolPageHeader } from '@/components/tool-page-header';
import { Skeleton } from '@/components/ui/skeleton';

import AccountSettingsForm from '@/components/settings/account-settings-form';
import NotificationSettingsForm from '@/components/settings/notification-settings-form';
import PrivacySettingsCard from '@/components/settings/privacy-settings-card';
import SecuritySettingsForm from '@/components/settings/security-settings-form';
import { submitOrQueue, queuePreferenceUpdate } from '@/lib/offline-queue';

export default function SettingsPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const [hydrated, setHydrated] = useState(false);
    const { preferences, setPreferences, theme, setTheme } = useTheme();
    const { language, translate, isRTL, formatNumber, formatCurrency, formatDate } = useI18n();
        const { isVoiceSupported, isVoiceEnabled, setIsVoiceEnabled, announcements } = useAccessibility();
    const [activeTab, setActiveTab] = useState('account');

    const tr = (key: string, fallback: string) => {
        const v = translate(key);
        return v === key ? fallback : v;
    };

    const formatRelative = (date: Date) => formatDistanceToNow(date, { addSuffix: true });

    React.useEffect(() => {
        setHydrated(true);
        if (typeof window !== 'undefined') {
            const searchParams = new URLSearchParams(window.location.search);
            const tabParam = searchParams.get('tab');
            if (tabParam) setActiveTab(tabParam);
        }
    }, []);

    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        const url = new URL(window.location.href);
        url.searchParams.set('tab', activeTab);
        window.history.replaceState({}, '', url.toString());
    }, [activeTab]);

        // Initialize preference toggles & theme from profile once hydrated
        React.useEffect(() => {
            if (!hydrated || !profile?.preferences) return;
            const prefs = (profile.preferences as Partial<ThemePreferences>) || {};
            const initPrefs: Partial<ThemePreferences> = {};
            if (typeof prefs.highContrast === 'boolean') initPrefs.highContrast = prefs.highContrast;
            if (typeof prefs.reducedMotion === 'boolean') initPrefs.reducedMotion = prefs.reducedMotion;
            if (typeof prefs.fontSize === 'string') initPrefs.fontSize = prefs.fontSize as ThemePreferences['fontSize'];
            if (typeof prefs.colorBlindnessSupport === 'boolean') initPrefs.colorBlindnessSupport = prefs.colorBlindnessSupport;
            if ((prefs as any).customColors) (initPrefs as any).customColors = (prefs as any).customColors;
            if (Object.keys(initPrefs).length) setPreferences(initPrefs);
            if (typeof prefs.mode === 'string') {
                const m = prefs.mode as string;
                const allowed: ThemeMode[] = ['light','dark','high-contrast','auto'];
                if ((allowed as string[]).includes(m)) setTheme(m as ThemeMode);
            }
            if (typeof (prefs as any).voiceCommands === 'boolean') setIsVoiceEnabled(Boolean((prefs as any).voiceCommands));
        }, [hydrated, profile, setPreferences, setIsVoiceEnabled, setTheme]);

        // Persist accessibility/theme preferences & voice commands (debounced) via API with offline queue fallback
        React.useEffect(() => {
            if (!user || !hydrated) return;
            const timeout = setTimeout(async () => {
                try {
                    const token = await user.getIdToken?.();
                    const prefPayload = {
                        preferences: {
                            highContrast: preferences.highContrast ?? false,
                            reducedMotion: preferences.reducedMotion ?? false,
                            fontSize: preferences.fontSize,
                            colorBlindnessSupport: preferences.colorBlindnessSupport ?? false,
                            mode: theme,
                            voiceCommands: isVoiceEnabled ?? false,
                        }
                    };

                    const submit = async () => {
                        const res = await fetch('/api/user/preferences', {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                            body: JSON.stringify(prefPayload),
                        });
                        if (!res.ok) throw new Error(`Pref save failed: ${res.status}`);
                        return await res.json();
                    };

                    const fallbackQueue = () => {
                        if (!token) return Promise.resolve({ id: -1 });
                        return queuePreferenceUpdate({ ...prefPayload, authToken: token });
                    };

                    await submitOrQueue({ submit, fallbackQueue });
                } catch (e) {
                    console.warn('Failed to persist accessibility/theme preferences', e);
                }
            }, 500); // debounce 500ms
            return () => clearTimeout(timeout);
    }, [preferences.highContrast, preferences.reducedMotion, preferences.fontSize, preferences.colorBlindnessSupport, theme, isVoiceEnabled, user, hydrated]);

            // Persist language preference via API with offline queue fallback
            React.useEffect(() => {
                if (!user || !hydrated) return;
                const timeout = setTimeout(async () => {
                    try {
                        const token = await user.getIdToken?.();
                        const prefPayload = { preferences: { language } };

                        const submit = async () => {
                            const res = await fetch('/api/user/preferences', {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                },
                                body: JSON.stringify(prefPayload),
                            });
                            if (!res.ok) throw new Error(`Language save failed: ${res.status}`);
                            return await res.json();
                        };

                        const fallbackQueue = () => {
                            if (!token) return Promise.resolve({ id: -1 });
                            return queuePreferenceUpdate({ ...prefPayload, authToken: token });
                        };

                        await submitOrQueue({ submit, fallbackQueue });
                    } catch (e) {
                        console.warn('Failed to persist language preference', e);
                    }
                }, 400);
                return () => clearTimeout(timeout);
            }, [language, user, hydrated]);

    const loadingState = authLoading || !hydrated;
    if (!user || !profile) return null;

    return (
        <div className={`max-w-6xl mx-auto space-y-8 ${isRTL ? 'rtl' : 'ltr'}`}>
            <AccessibilityAnnouncer />
            <ToolPageHeader
                title={tr('settings.header.title', 'Account Settings')}
                description={tr('settings.header.desc', 'Manage your account preferences, security, accessibility, and internationalization settings.')}
                badges={[{ label: tr('common.secure', 'Secure'), variant: 'outline' }, { label: 'User', variant: 'secondary' }]}
                showBreadcrumb
            />
            <div role="status" aria-live="polite" className="sr-only">
                {loadingState ? tr('status.loading', 'Loading settings…') : tr('status.ready', 'Settings ready')}
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" aria-label={tr('settings.tabs.label', 'Account settings sections')}>
                <TabsList className="grid w-full grid-cols-8 lg:grid-cols-8">
                    <TabsTrigger value="account" className="flex items-center gap-2" aria-label={tr('settings.tabs.account', 'Account')}>
                        <User className="h-4 w-4" />
                        <span className="hidden sm:inline">{tr('settings.tabs.account', 'Account')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="appearance" className="flex items-center gap-2" aria-label={tr('settings.tabs.theme', 'Theme')}>
                        <Palette className="h-4 w-4" />
                        <span className="hidden sm:inline">{tr('settings.tabs.theme', 'Theme')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="accessibility" className="flex items-center gap-2" aria-label={tr('settings.tabs.accessibility', 'Accessibility')}>
                        <Accessibility className="h-4 w-4" />
                        <span className="hidden sm:inline">{tr('settings.tabs.accessibilityShort', 'A11y')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="language" className="flex items-center gap-2" aria-label={tr('settings.tabs.language', 'Language')}>
                        <Globe className="h-4 w-4" />
                        <span className="hidden sm:inline">{tr('settings.tabs.language', 'Language')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="security" className="flex items-center gap-2" aria-label={tr('settings.tabs.security', 'Security')}>
                        <Shield className="h-4 w-4" />
                        <span className="hidden sm:inline">{tr('settings.tabs.security', 'Security')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="flex items-center gap-2" aria-label={tr('settings.tabs.notifications', 'Notifications')}>
                        <Bell className="h-4 w-4" />
                        <span className="hidden sm:inline">{tr('settings.tabs.notifications', 'Notifications')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="billing" className="flex items-center gap-2" aria-label={tr('settings.tabs.billing', 'Billing')}>
                        <CreditCard className="h-4 w-4" />
                        <span className="hidden sm:inline">{tr('settings.tabs.billing', 'Billing')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="privacy" className="flex items-center gap-2" aria-label={tr('settings.tabs.privacy', 'Privacy')}>
                        <Lock className="h-4 w-4" />
                        <span className="hidden sm:inline">{tr('settings.tabs.privacy', 'Privacy')}</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="account" className="space-y-6">
                    {loadingState ? <Skeleton className="h-64 w-full" /> : <AccountSettingsForm user={user} profile={profile} />}
                </TabsContent>

                <TabsContent value="appearance" className="space-y-6">
                    {loadingState ? <Skeleton className="h-64 w-full" /> : <ThemeConfiguration />}
                </TabsContent>

                <TabsContent value="accessibility" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Accessibility className="h-5 w-5" />
                                {tr('settings.accessibility.title', 'Accessibility Features')}
                            </CardTitle>
                            <CardDescription>{tr('settings.accessibility.desc', 'Enhance your experience with accessibility options')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>{tr('settings.accessibility.highContrast', 'High Contrast Mode')}</Label>
                                            <p className="text-sm text-muted-foreground">{tr('settings.accessibility.highContrastDesc', 'Enhanced visibility for users with visual impairments')}</p>
                                        </div>
                                        <Switch checked={preferences.highContrast} onCheckedChange={(c) => setPreferences({ highContrast: c })} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>{tr('settings.accessibility.reducedMotion', 'Reduced Motion')}</Label>
                                            <p className="text-sm text-muted-foreground">{tr('settings.accessibility.reducedMotionDesc', 'Minimize animations for motion-sensitive users')}</p>
                                        </div>
                                        <Switch checked={preferences.reducedMotion} onCheckedChange={(c) => setPreferences({ reducedMotion: c })} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>{tr('settings.accessibility.voiceCommands', 'Voice Commands')}</Label>
                                            <p className="text-sm text-muted-foreground">{tr('settings.accessibility.voiceCommandsDesc', 'Use voice commands to navigate the interface')}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Switch checked={isVoiceEnabled} onCheckedChange={setIsVoiceEnabled} disabled={!isVoiceSupported} />
                                            {!isVoiceSupported && <Badge variant="secondary">Unsupported</Badge>}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="font-medium">{tr('settings.accessibility.liveAnnouncements', 'Live Announcements')}</h4>
                                    <div className="h-32 overflow-y-auto border rounded p-3 text-sm">
                                        {announcements.length === 0 ? (
                                            <p className="text-muted-foreground">{tr('settings.accessibility.noAnnouncements', 'No recent announcements')}</p>
                                        ) : (
                                            announcements.map(a => (
                                                <div key={a.id} className="mb-2 last:mb-0">
                                                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${a.priority === 'assertive' ? 'bg-destructive' : 'bg-primary'}`} />
                                                    {a.message}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="language" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="h-5 w-5" />
                                {tr('settings.language.title', 'Language & Region')}
                            </CardTitle>
                            <CardDescription>{tr('settings.language.desc', 'Choose your preferred language and regional settings')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-base font-medium">{tr('settings.language.interfaceLabel', 'Interface Language')}</Label>
                                        <p className="text-sm text-muted-foreground mb-3">{tr('settings.language.interfaceDesc', 'Choose your preferred language for the interface')}</p>
                                        <LanguageSelector variant="button" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="font-medium">{tr('settings.language.info', 'Language Information')}</h4>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between"><span>{tr('settings.language.current', 'Current Language:')}</span><span className="font-medium">{language.toUpperCase()}</span></div>
                                        <div className="flex justify-between"><span>{tr('settings.language.direction', 'Text Direction:')}</span><span>{isRTL ? 'Right-to-Left' : 'Left-to-Right'}</span></div>
                                        <div className="flex justify-between"><span>{tr('settings.language.sampleNumber', 'Sample Number:')}</span><span>{formatNumber(1234567.89)}</span></div>
                                        <div className="flex justify-between"><span>{tr('settings.language.sampleCurrency', 'Sample Currency:')}</span><span>{formatCurrency(1234.56)}</span></div>
                                        <div className="flex justify-between"><span>{tr('settings.language.sampleDate', 'Sample Date:')}</span><span>{formatDate(new Date())}</span></div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-6">
                    {loadingState ? <Skeleton className="h-64 w-full" /> : <SecuritySettingsForm user={user} />}
                </TabsContent>

                <TabsContent value="notifications" className="space-y-6">
                    {loadingState ? <Skeleton className="h-64 w-full" /> : <NotificationSettingsForm user={user} profile={profile} />}
                </TabsContent>

                <TabsContent value="billing" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                {tr('settings.billing.title', 'Billing & Subscription')}
                            </CardTitle>
                            <CardDescription>{tr('settings.billing.desc', 'Manage your subscription plan and billing information')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8">
                                <div className="mb-4">
                                    <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                                    <h3 className="text-lg font-semibold mb-2">{tr('settings.billing.ctaTitle', 'Complete Billing Management')}</h3>
                                    <p className="text-muted-foreground mb-6">{tr('settings.billing.ctaDesc', 'Access your full billing dashboard with subscription details, payment history, and plan management.')}</p>
                                </div>
                                <Link href="/settings/billing">
                                    <Button className="gap-2">
                                        <CreditCard className="h-4 w-4" />
                                        {tr('settings.billing.go', 'Go to Billing Dashboard')}
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="privacy" className="space-y-6">
                    {loadingState ? <Skeleton className="h-64 w-full" /> : <PrivacySettingsCard user={user} profile={profile} />}
                            {!loadingState && Boolean((profile as any)?.lastExportAt || (profile as any)?.deletionRequestedAt) && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm">{tr('settings.privacy.auditTrail','Privacy Audit Trail')}</CardTitle>
                                        <CardDescription>{tr('settings.privacy.auditTrailDesc','Recent privacy-related account actions')}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="text-sm space-y-2">
                                        {Boolean((profile as any)?.lastExportAt) && (
                                            <div className="flex justify-between">
                                                <span>{tr('settings.privacy.lastExport','Last Data Export')}:</span>
                                                <span>
                                                    {formatRelative(toJsDate((profile as any).lastExportAt))}
                                                </span>
                                            </div>
                                        )}
                                        {Boolean((profile as any)?.deletionRequestedAt) && (
                                            <div className="flex flex-col gap-1">
                                                <div className="flex justify-between">
                                                    <span>{tr('settings.privacy.deletionRequested','Deletion Requested')}:</span>
                                                    <span>{formatRelative(toJsDate((profile as any).deletionRequestedAt))}</span>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="self-end h-7 text-xs"
                                                    onClick={async () => {
                                                        const confirmMsg = tr('settings.privacy.cancelDeletionConfirm','Cancel scheduled deletion and keep your account?');
                                                        if (!window.confirm(confirmMsg)) return;
                                                        try {
                                                            const userRef = doc(db, 'users', user.uid);
                                                            await updateDoc(userRef, { deletionRequestedAt: null, status: 'active', updatedAt: new Date() });
                                                        } catch (e) {
                                                            console.warn('Failed to cancel deletion', e);
                                                        }
                                                    }}
                                                >{tr('settings.privacy.cancelDeletion','Cancel Deletion')}</Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                    {Boolean((profile as any)?.deletionRequestedAt) && (
                        <Card className="border-destructive/40">
                            <CardHeader>
                                <CardTitle className="text-destructive text-sm">{tr('settings.privacy.deletionScheduled', 'Account Deletion Scheduled')}</CardTitle>
                                <CardDescription>{tr('settings.privacy.deletionScheduledDesc', 'Your account is pending deletion. Contact support to cancel.')}</CardDescription>
                            </CardHeader>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
