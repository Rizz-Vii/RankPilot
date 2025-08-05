"use client";

import { AccessibilityAnnouncer } from '@/components/accessibility/AccessibilityAnnouncer';
import { LanguageSelector } from '@/components/i18n/LanguageSelector';
import AccountSettingsForm from "@/components/settings/account-settings-form";
import NotificationSettingsForm from "@/components/settings/notification-settings-form";
import PrivacySettingsCard from "@/components/settings/privacy-settings-card";
import SecuritySettingsForm from "@/components/settings/security-settings-form";
import { ThemeConfiguration } from '@/components/theme/ThemeConfiguration';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import LoadingScreen from "@/components/ui/loading-screen";
import {
    Animated
} from '@/components/ui/micro-interactions';
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useAccessibility } from '@/lib/accessibility/accessibility-system';
import { useI18n } from '@/lib/i18n/internationalization-system';
import { useTheme } from '@/lib/themes/theme-system';
import {
    Accessibility,
    Bell,
    CreditCard,
    ExternalLink,
    Globe,
    Lock,
    Palette,
    Settings,
    Shield,
    User
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

export default function SettingsPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const [mounted, setMounted] = useState(false);

    // Priority 3 Feature Hooks
    const { theme: _theme, preferences, setPreferences } = useTheme();
    const { language, translate: _translate, isRTL, formatNumber, formatCurrency, formatDate } = useI18n();
    const {
        announce: _announce,
        announceAction: _announceAction,
        isVoiceSupported,
        isVoiceEnabled,
        setIsVoiceEnabled,
        startListening: _startListening,
        stopListening: _stopListening,
        announcements
    } = useAccessibility();

    const [defaultTab, setDefaultTab] = useState("account");

    React.useEffect(() => {
        setMounted(true);

        // Get the tab from URL parameters for deep linking (client-side only)
        if (typeof window !== "undefined") {
            const searchParams = new URLSearchParams(window.location.search);
            const tabParam = searchParams.get("tab");
            if (tabParam) {
                setDefaultTab(tabParam);
            }
        }
    }, []);

    if (authLoading || !mounted) {
        return <LoadingScreen fullScreen text="Loading settings..." />;
    }

    if (!user || !profile) {
        return null;
    }

    return (
        <div className={`max-w-6xl mx-auto space-y-8 ${isRTL ? 'rtl' : 'ltr'}`}>
            <AccessibilityAnnouncer />

            <Animated variant="slideUp" className="flex items-center gap-3">
                <Settings className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold font-headline">Account Settings</h1>
                    <p className="text-muted-foreground font-body">
                        Manage your account preferences, security, accessibility, and internationalization settings.
                    </p>
                </div>
            </Animated>

            <Tabs defaultValue={defaultTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-8 lg:grid-cols-8">
                    <TabsTrigger value="account" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="hidden sm:inline">Account</span>
                    </TabsTrigger>
                    <TabsTrigger value="appearance" className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        <span className="hidden sm:inline">Theme</span>
                    </TabsTrigger>
                    <TabsTrigger value="accessibility" className="flex items-center gap-2">
                        <Accessibility className="h-4 w-4" />
                        <span className="hidden sm:inline">A11y</span>
                    </TabsTrigger>
                    <TabsTrigger value="language" className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        <span className="hidden sm:inline">Language</span>
                    </TabsTrigger>
                    <TabsTrigger value="security" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <span className="hidden sm:inline">Security</span>
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        <span className="hidden sm:inline">Notifications</span>
                    </TabsTrigger>
                    <TabsTrigger value="billing" className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span className="hidden sm:inline">Billing</span>
                    </TabsTrigger>
                    <TabsTrigger value="privacy" className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        <span className="hidden sm:inline">Privacy</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="account" className="space-y-6">
                    <AccountSettingsForm user={user} profile={profile} />
                </TabsContent>

                <TabsContent value="appearance" className="space-y-6">
                    <ThemeConfiguration />
                </TabsContent>

                <TabsContent value="accessibility" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Accessibility className="h-5 w-5" />
                                Accessibility Features
                            </CardTitle>
                            <CardDescription>
                                Enhance your experience with accessibility options
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>High Contrast Mode</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Enhanced visibility for users with visual impairments
                                            </p>
                                        </div>
                                        <Switch
                                            checked={preferences.highContrast}
                                            onCheckedChange={(checked) => setPreferences({ highContrast: checked })}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>Reduced Motion</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Minimize animations for motion-sensitive users
                                            </p>
                                        </div>
                                        <Switch
                                            checked={preferences.reducedMotion}
                                            onCheckedChange={(checked) => setPreferences({ reducedMotion: checked })}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>Voice Commands</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Use voice commands to navigate the interface
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={isVoiceEnabled}
                                                onCheckedChange={setIsVoiceEnabled}
                                                disabled={!isVoiceSupported}
                                            />
                                            {!isVoiceSupported && <Badge variant="secondary">Unsupported</Badge>}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-medium">Live Announcements</h4>
                                    <div className="h-32 overflow-y-auto border rounded p-3 text-sm">
                                        {announcements.length === 0 ? (
                                            <p className="text-muted-foreground">No recent announcements</p>
                                        ) : (
                                            announcements.map((announcement) => (
                                                <div key={announcement.id} className="mb-2 last:mb-0">
                                                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${announcement.priority === 'assertive' ? 'bg-red-500' : 'bg-blue-500'
                                                        }`} />
                                                    {announcement.message}
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
                                Language & Region
                            </CardTitle>
                            <CardDescription>
                                Choose your preferred language and regional settings
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-base font-medium">Interface Language</Label>
                                        <p className="text-sm text-muted-foreground mb-3">
                                            Choose your preferred language for the interface
                                        </p>
                                        <LanguageSelector variant="button" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-medium">Language Information</h4>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span>Current Language:</span>
                                            <span className="font-medium">{language.toUpperCase()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Text Direction:</span>
                                            <span>{isRTL ? 'Right-to-Left' : 'Left-to-Right'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Sample Number:</span>
                                            <span>{formatNumber(1234567.89)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Sample Currency:</span>
                                            <span>{formatCurrency(1234.56)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Sample Date:</span>
                                            <span>{formatDate(new Date())}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-6">
                    <SecuritySettingsForm user={user} />
                </TabsContent>

                <TabsContent value="notifications" className="space-y-6">
                    <NotificationSettingsForm user={user} profile={profile} />
                </TabsContent>

                <TabsContent value="billing" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                Billing & Subscription
                            </CardTitle>
                            <CardDescription>
                                Manage your subscription plan and billing information
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8">
                                <div className="mb-4">
                                    <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                                    <h3 className="text-lg font-semibold mb-2">
                                        Complete Billing Management
                                    </h3>
                                    <p className="text-muted-foreground mb-6">
                                        Access your full billing dashboard with subscription
                                        details, payment history, and plan management.
                                    </p>
                                </div>
                                <Link href="/settings/billing">
                                    <Button className="gap-2">
                                        <CreditCard className="h-4 w-4" />
                                        Go to Billing Dashboard
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="privacy" className="space-y-6">
                    <PrivacySettingsCard user={user} profile={profile} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
