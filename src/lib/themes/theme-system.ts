/**
 * Advanced Theme System for RankPilot
 * (Rebuilt after corruption) – Provides deterministic, accessible theming.
 */

import { setFlag, setThemeClass } from '@/lib/dom/classListManager';
import React from 'react';

export type ThemeMode = 'light' | 'dark' | 'high-contrast' | 'auto';

export interface ThemePreferences {
    mode: ThemeMode; // user-selected mode (auto resolves to system preference)
    reducedMotion: boolean;
    fontSize: 'small' | 'medium' | 'large' | 'extra-large';
    colorBlindnessSupport: boolean;
    highContrast: boolean; // explicit high contrast override (can be system derived)
    customColors?: {
        primary?: string;
        secondary?: string;
        accent?: string;
    };
}

export interface ThemeTokens {
    colors: Record<string, string>;
    spacing: Record<string, string>;
    typography: {
        fontFamily: { sans: string; mono: string; heading: string; };
        fontSize: Record<string, string>;
        fontWeight: { normal: string; medium: string; semibold: string; bold: string; };
        lineHeight: { tight: string; normal: string; relaxed: string; };
    };
    shadows: { sm: string; md: string; lg: string; xl: string; };
    borderRadius: { sm: string; md: string; lg: string; xl: string; };
    animation: { duration: { fast: string; medium: string; slow: string; }; easing: { easeIn: string; easeOut: string; easeInOut: string; }; };
}

// Light theme tokens
export const lightTheme: ThemeTokens = {
    colors: {
        background: 'hsl(0 0% 100%)',
        foreground: 'hsl(222.2 84% 4.9%)',

        primary: 'hsl(221.2 83.2% 53.3%)',
        primaryForeground: 'hsl(210 40% 98%)',
        secondary: 'hsl(210 40% 96%)',
        secondaryForeground: 'hsl(222.2 84% 4.9%)',

        accent: 'hsl(210 40% 96%)',
        accentForeground: 'hsl(222.2 84% 4.9%)',
        muted: 'hsl(210 40% 96%)',
        mutedForeground: 'hsl(215.4 16.3% 46.9%)',

        destructive: 'hsl(0 84.2% 60.2%)',
        destructiveForeground: 'hsl(210 40% 98%)',
        error: 'hsl(0 84.2% 60.2%)',
        errorForeground: 'hsl(210 40% 98%)',
        success: 'hsl(142.1 76.2% 36.3%)',
        successForeground: 'hsl(355.7 100% 97.3%)',
        warning: 'hsl(32.5 95% 44%)',
        warningForeground: 'hsl(210 40% 98%)',
        info: 'hsl(217.2 91.2% 59.8%)',
        infoForeground: 'hsl(210 40% 98%)',

        border: 'hsl(214.3 31.8% 91.4%)',
        input: 'hsl(214.3 31.8% 91.4%)',
        ring: 'hsl(221.2 83.2% 53.3%)',

        card: 'hsl(0 0% 100%)',
        cardForeground: 'hsl(222.2 84% 4.9%)',

        popover: 'hsl(0 0% 100%)',
        popoverForeground: 'hsl(222.2 84% 4.9%)',
    },

    spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
        '3xl': '4rem',
        '4xl': '6rem',
    },

    typography: {
        fontFamily: {
            sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
            mono: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            heading: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
        },
        fontSize: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem',
            '3xl': '1.875rem',
            '4xl': '2.25rem',
            '5xl': '3rem',
        },
        fontWeight: {
            normal: '400',
            medium: '500',
            semibold: '600',
            bold: '700',
        },
        lineHeight: {
            tight: '1.25',
            normal: '1.5',
            relaxed: '1.75',
        },
    },

    shadows: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    },

    borderRadius: {
        sm: '0.125rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
    },

    animation: {
        duration: {
            fast: '150ms',
            medium: '300ms',
            slow: '500ms',
        },
        easing: {
            easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
            easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
            easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        },
    },
};

// Dark theme tokens
export const darkTheme: ThemeTokens = {
    ...lightTheme,
    colors: {
        background: 'hsl(222.2 84% 4.9%)',
        foreground: 'hsl(210 40% 98%)',

        primary: 'hsl(217.2 91.2% 59.8%)',
        primaryForeground: 'hsl(222.2 84% 4.9%)',
        secondary: 'hsl(217.2 32.6% 17.5%)',
        secondaryForeground: 'hsl(210 40% 98%)',

        accent: 'hsl(217.2 32.6% 17.5%)',
        accentForeground: 'hsl(210 40% 98%)',
        muted: 'hsl(217.2 32.6% 17.5%)',
        mutedForeground: 'hsl(215 20.2% 65.1%)',

        destructive: 'hsl(0 62.8% 30.6%)',
        destructiveForeground: 'hsl(210 40% 98%)',
        error: 'hsl(0 72% 51%)',
        errorForeground: 'hsl(210 40% 98%)',
        success: 'hsl(142.1 70.6% 45.3%)',
        successForeground: 'hsl(144.9 80.4% 10%)',
        warning: 'hsl(32.5 85% 54%)',
        warningForeground: 'hsl(222.2 84% 4.9%)',
        info: 'hsl(217.2 91.2% 59.8%)',
        infoForeground: 'hsl(222.2 84% 4.9%)',

        border: 'hsl(217.2 32.6% 17.5%)',
        input: 'hsl(217.2 32.6% 17.5%)',
        ring: 'hsl(224.3 76.3% 94.1%)',

        card: 'hsl(222.2 84% 4.9%)',
        cardForeground: 'hsl(210 40% 98%)',

        popover: 'hsl(222.2 84% 4.9%)',
        popoverForeground: 'hsl(210 40% 98%)',
    },
};

// High contrast theme tokens
export const highContrastTheme: ThemeTokens = {
    ...lightTheme,
    colors: {
        background: 'hsl(0 0% 100%)',
        foreground: 'hsl(0 0% 0%)',

        primary: 'hsl(0 0% 0%)',
        primaryForeground: 'hsl(0 0% 100%)',
        secondary: 'hsl(0 0% 95%)',
        secondaryForeground: 'hsl(0 0% 0%)',

        accent: 'hsl(0 0% 0%)',
        accentForeground: 'hsl(0 0% 100%)',
        muted: 'hsl(0 0% 90%)',
        mutedForeground: 'hsl(0 0% 20%)',

        destructive: 'hsl(0 100% 25%)',
        destructiveForeground: 'hsl(0 0% 100%)',
        error: 'hsl(0 100% 25%)',
        errorForeground: 'hsl(0 0% 100%)',
        success: 'hsl(120 100% 20%)',
        successForeground: 'hsl(0 0% 100%)',
        warning: 'hsl(45 100% 30%)',
        warningForeground: 'hsl(0 0% 100%)',
        info: 'hsl(210 100% 30%)',
        infoForeground: 'hsl(0 0% 100%)',

        border: 'hsl(0 0% 0%)',
        input: 'hsl(0 0% 95%)',
        ring: 'hsl(0 0% 0%)',

        card: 'hsl(0 0% 100%)',
        cardForeground: 'hsl(0 0% 0%)',

        popover: 'hsl(0 0% 100%)',
        popoverForeground: 'hsl(0 0% 0%)',
    },
};

export class ThemeSystem {
    private static instance: ThemeSystem;
    private currentTheme: ThemeMode = 'dark';
    private preferences: ThemePreferences = {
        mode: 'dark',
        reducedMotion: false,
        fontSize: 'medium',
        colorBlindnessSupport: false,
        highContrast: false,
    };
    // Track whether the user explicitly set these prefs to avoid being overwritten by system changes
    private userSetHighContrast = false;
    private userSetReducedMotion = false;
    private listeners: Set<(theme: ThemeMode, preferences: ThemePreferences) => void> = new Set();

    private constructor() {
        // Load preferences from localStorage on client side
        if (typeof window !== 'undefined') {
            this.loadPreferences();
            // Immediate cookie write based on loaded preferences for next SSR pass
            try {
                const initialThemeClass = this.preferences.highContrast ? 'high-contrast' : this.currentTheme;
                const cookiePayload = {
                    theme: initialThemeClass,
                    mode: this.preferences.mode,
                    reducedMotion: this.preferences.reducedMotion,
                    colorBlind: this.preferences.colorBlindnessSupport,
                    highContrast: this.preferences.highContrast,
                    customColors: this.preferences.customColors,
                };
                const value = encodeURIComponent(JSON.stringify(cookiePayload));
                document.cookie = `rp_theme=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
            } catch { }
            this.detectSystemPreferences();
            this.applyTheme();
        }
    }

    static getInstance(): ThemeSystem {
        if (!ThemeSystem.instance) {
            ThemeSystem.instance = new ThemeSystem();
        }
        return ThemeSystem.instance;
    }

    private loadPreferences(): void {
        try {
            const stored = localStorage.getItem('rankpilot-theme-preferences');
            if (stored) {
                // Parse raw to detect which keys were explicitly present
                const parsed = JSON.parse(stored) as Partial<ThemePreferences> & Record<string, unknown>;
                this.preferences = { ...this.preferences, ...parsed };
                if (Object.prototype.hasOwnProperty.call(parsed, 'highContrast')) this.userSetHighContrast = true;
                if (Object.prototype.hasOwnProperty.call(parsed, 'reducedMotion')) this.userSetReducedMotion = true;
            }
        } catch (error) {
            console.warn('Failed to load theme preferences:', error);
        }
    }

    private savePreferences(): void {
        try {
            localStorage.setItem('rankpilot-theme-preferences', JSON.stringify(this.preferences));
        } catch (error) {
            console.warn('Failed to save theme preferences:', error);
        }
    }

    private detectSystemPreferences(): void {
        if (typeof window === 'undefined') return;

        // Detect system dark mode preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        // Detect reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Detect high contrast preference
        const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;

        // Update preferences if auto mode
        if (this.preferences.mode === 'auto') {
            this.currentTheme = prefersDark ? 'dark' : 'light';
        }

        if (!this.userSetReducedMotion) this.preferences.reducedMotion = prefersReducedMotion;
        if (!this.userSetHighContrast) this.preferences.highContrast = prefersHighContrast;

        // Listen for system preference changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (this.preferences.mode === 'auto') {
                this.currentTheme = e.matches ? 'dark' : 'light';
                this.applyTheme();
                this.notifyListeners();
            }
        });

        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            if (!this.userSetReducedMotion) {
                this.preferences.reducedMotion = e.matches;
                this.applyTheme();
                this.notifyListeners();
            }
        });

        window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
            if (!this.userSetHighContrast) {
                this.preferences.highContrast = e.matches;
                this.applyTheme();
                this.notifyListeners();
            }
        });
    }

    private applyTheme(): void {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;
        const tokens = this.getThemeTokens();

        // Helpers to normalize color to HSL triplet string for Tailwind tokens
        const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
        const toHslTriplet = (color: string): string => {
            const hslMatch = color.match(/^hsla?\(([^)]+)\)$/i);
            if (hslMatch) {
                const inner = hslMatch[1].replace(/\//g, ' ').trim();
                const parts = inner.split(/[\s,]+/).filter(Boolean);
                const h = parseFloat(parts[0]);
                const s = parseFloat(parts[1]);
                const l = parseFloat(parts[2]);
                if (Number.isFinite(h) && Number.isFinite(s) && Number.isFinite(l)) return `${h} ${s}% ${l}%`;
            }
            const rgbMatch = color.match(/^rgba?\(([^)]+)\)$/i);
            if (rgbMatch) {
                const parts = rgbMatch[1].split(',').map(p => parseFloat(p.trim()));
                if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
                    const [r, g, b] = parts.map(v => clamp01(v / 255));
                    const max = Math.max(r, g, b), min = Math.min(r, g, b);
                    let h = 0, s = 0, l = (max + min) / 2;
                    if (max !== min) {
                        const d = max - min;
                        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                        switch (max) {
                            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                            case g: h = (b - r) / d + 2; break;
                            case b: h = (r - g) / d + 4; break;
                        }
                        h *= 60;
                    }
                    return `${h} ${s * 100}% ${l * 100}%`;
                }
            }
            const hexMatch = color.match(/^#([0-9a-fA-F]{6})$/);
            if (hexMatch) {
                const hex = hexMatch[1];
                const r = parseInt(hex.slice(0, 2), 16) / 255;
                const g = parseInt(hex.slice(2, 4), 16) / 255;
                const b = parseInt(hex.slice(4, 6), 16) / 255;
                const max = Math.max(r, g, b), min = Math.min(r, g, b);
                let h = 0, s = 0, l = (max + min) / 2;
                if (max !== min) {
                    const d = max - min;
                    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                    switch (max) {
                        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                        case g: h = (b - r) / d + 2; break;
                        case b: h = (r - g) / d + 4; break;
                    }
                    h *= 60;
                }
                return `${h} ${s * 100}% ${l * 100}%`;
            }
            // Fallback sane triplet
            return `210 10% 50%`;
        };

        const setColorPair = (key: string, cssColor: string) => {
            // Legacy full CSS color
            root.style.setProperty(`--color-${key}`, cssColor);
            // Tailwind expects hsl(var(--primary)) => store triplet in --primary
            const kebab = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
            root.style.setProperty(`--${kebab}`, toHslTriplet(cssColor));
        };

        // Colors (dual naming: --color-* full CSS color; --* HSL triplet)
        // Includes extended tokens like info/infoForeground and error/errorForeground
        Object.entries(tokens.colors).forEach(([k, v]) => setColorPair(k, v));

        // Typography sizes
        Object.entries(tokens.typography.fontSize).forEach(([k, v]) => root.style.setProperty(`--font-size-${k}`, v));
        // Spacing
        Object.entries(tokens.spacing).forEach(([k, v]) => root.style.setProperty(`--spacing-${k}`, v));
        // Shadows
        Object.entries(tokens.shadows).forEach(([k, v]) => root.style.setProperty(`--shadow-${k}`, v));
        // Radius
        Object.entries(tokens.borderRadius).forEach(([k, v]) => root.style.setProperty(`--radius-${k}`, v));
        // Animation durations
        if (this.preferences.reducedMotion) {
            root.style.setProperty('--animation-duration-fast', '0ms');
            root.style.setProperty('--animation-duration-medium', '0ms');
            root.style.setProperty('--animation-duration-slow', '0ms');
        } else {
            Object.entries(tokens.animation.duration).forEach(([k, v]) => root.style.setProperty(`--animation-duration-${k}`, v));
        }
        // Font scale variable (consumed in CSS where needed)
        root.style.setProperty('--font-scale', this.getFontSizeScale().toString());

        // Apply user custom color overrides last (primary/secondary/accent)
        const cc = this.preferences.customColors;
        if (cc && typeof cc === 'object') {
            if (cc.primary && typeof cc.primary === 'string') {
                setColorPair('primary', cc.primary);
            }
            if (cc.secondary && typeof cc.secondary === 'string') {
                setColorPair('secondary', cc.secondary);
            }
            if (cc.accent && typeof cc.accent === 'string') {
                setColorPair('accent', cc.accent);
            }
        }

        // Centralized body class updates
        setThemeClass(this.currentTheme, this.preferences.highContrast);
        setFlag('reduced-motion', this.preferences.reducedMotion);
        setFlag('colorblind-support', this.preferences.colorBlindnessSupport);

        // Tailwind dark class sync (EXCLUDES high-contrast deliberately)
        if (this.currentTheme === 'dark' && !this.preferences.highContrast) {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }

        // Persist cookie for SSR parity
        try {
            const resolvedTheme = this.preferences.highContrast ? 'high-contrast' : this.currentTheme;
            const payload = {
                theme: resolvedTheme,
                mode: this.preferences.mode,
                reducedMotion: this.preferences.reducedMotion,
                colorBlind: this.preferences.colorBlindnessSupport,
                highContrast: this.preferences.highContrast,
                customColors: this.preferences.customColors,
            };
            document.cookie = `rp_theme=${encodeURIComponent(JSON.stringify(payload))}; Path=/; Max-Age=31536000; SameSite=Lax`;
        } catch { /* ignore */ }
    }

    private notifyListeners(): void { this.listeners.forEach(l => l(this.currentTheme, { ...this.preferences })); }
    private getFontSizeScale(): number { switch (this.preferences.fontSize) { case 'small': return 0.875; case 'medium': return 1; case 'large': return 1.125; case 'extra-large': return 1.25; default: return 1; } }

    private getThemeTokens(): ThemeTokens {
        if (this.preferences.highContrast || this.currentTheme === 'high-contrast') return highContrastTheme;
        return this.currentTheme === 'dark' ? darkTheme : lightTheme;
    }

    getPreferences(): ThemePreferences { return { ...this.preferences }; }
    getTheme(): ThemeMode { return this.currentTheme; }

    setTheme(mode: ThemeMode): void {
        // No-op if effective mode/theme unchanged
        const prevMode = this.preferences.mode;
        let nextTheme: ThemeMode = mode;
        if (mode === 'auto') {
            const prefersDark = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
            nextTheme = prefersDark ? 'dark' : 'light';
        }
        const effectiveUnchanged = prevMode === mode && this.currentTheme === nextTheme;
        if (effectiveUnchanged) return;

        // Update only mode and derived currentTheme (do not mutate highContrast here)
        this.preferences = { ...this.preferences, mode };
        this.currentTheme = nextTheme;
        this.applyTheme();
        this.savePreferences();
        this.notifyListeners();
    }

    private shallowEqualPrefs(a: Partial<ThemePreferences>, b: Partial<ThemePreferences>): boolean {
        const keys = new Set<keyof ThemePreferences>([
            'mode',
            'reducedMotion',
            'fontSize',
            'colorBlindnessSupport',
            'highContrast',
            'customColors',
        ]);
        for (const k of keys) {
            const av = (a as Record<string, unknown>)[k as string];
            const bv = (b as Record<string, unknown>)[k as string];
            if (k === 'customColors') {
                const ap = (av as { primary?: string; secondary?: string; accent?: string } | undefined) || {};
                const bp = (bv as { primary?: string; secondary?: string; accent?: string } | undefined) || {};
                if (ap.primary !== bp.primary || ap.secondary !== bp.secondary || ap.accent !== bp.accent) return false;
                continue;
            }
            if (av !== bv) return false;
        }
        return true;
    }

    setPreferences(preferences: Partial<ThemePreferences>): void {
        // If only mode provided, delegate to setTheme for idempotency
        if ('mode' in preferences && typeof preferences.mode !== 'undefined') {
            const { mode, ...rest } = preferences as Required<Pick<ThemePreferences, 'mode'>> & Partial<ThemePreferences>;
            // Apply non-mode prefs first if they actually change anything
            const nextPrefs = { ...this.preferences, ...rest } as ThemePreferences;
            const restChanged = !this.shallowEqualPrefs(nextPrefs, this.preferences);
            if (restChanged) this.preferences = nextPrefs;
            this.setTheme(mode);
            return;
        }

        // Mark user-intent for system-tied preferences when keys provided
        if (Object.prototype.hasOwnProperty.call(preferences, 'highContrast')) this.userSetHighContrast = true;
        if (Object.prototype.hasOwnProperty.call(preferences, 'reducedMotion')) this.userSetReducedMotion = true;

        const merged = { ...this.preferences, ...preferences } as ThemePreferences;
        // No-op if nothing actually changed
        if (this.shallowEqualPrefs(merged, this.preferences)) return;
        this.preferences = merged;
        this.applyTheme();
        this.savePreferences();
        this.notifyListeners();
    }

    subscribe(listener: (theme: ThemeMode, preferences: ThemePreferences) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    isDark(): boolean { return this.currentTheme === 'dark' && !this.preferences.highContrast; }
    isHighContrast(): boolean { return this.preferences.highContrast || this.currentTheme === 'high-contrast'; }
    shouldReduceMotion(): boolean { return !!this.preferences.reducedMotion; }
    hasColorBlindnessSupport(): boolean { return !!this.preferences.colorBlindnessSupport; }
}

// React hook for theme system
export const themeSystem = ThemeSystem.getInstance();

export function useTheme() {
    const [mounted, setMounted] = React.useState(false);
    const [theme, setThemeState] = React.useState<ThemeMode>(() => themeSystem.getTheme());
    const [preferences, setPrefsState] = React.useState<ThemePreferences>(() => themeSystem.getPreferences());

    React.useEffect(() => {
        setMounted(true);
        return themeSystem.subscribe((t, p) => { setThemeState(t); setPrefsState(p); });
    }, []);

    return {
        theme: mounted ? theme : 'dark',
        preferences,
        setTheme: themeSystem.setTheme.bind(themeSystem),
        setPreferences: themeSystem.setPreferences.bind(themeSystem),
        isDark: themeSystem.isDark.bind(themeSystem),
        isHighContrast: themeSystem.isHighContrast.bind(themeSystem),
        shouldReduceMotion: themeSystem.shouldReduceMotion.bind(themeSystem),
        hasColorBlindnessSupport: themeSystem.hasColorBlindnessSupport.bind(themeSystem),
    };
}

