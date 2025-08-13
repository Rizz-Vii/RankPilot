/**
 * Advanced Theme System for RankPilot
 * (Rebuilt after corruption) – Provides deterministic, accessible theming.
 */

import React from 'react';
import { setThemeClass, setFlag } from '@/lib/dom/classListManager';

export type ThemeMode = 'light' | 'dark' | 'high-contrast' | 'auto';

export interface ThemePreferences {
    mode: ThemeMode; // user-selected mode (auto resolves to system preference)
    reducedMotion: boolean;
    fontSize: 'small' | 'medium' | 'large' | 'extra-large';
    colorBlindnessSupport: boolean;
    highContrast: boolean; // explicit high contrast override (can be system derived)
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
    private currentTheme: ThemeMode = 'light';
    private preferences: ThemePreferences = {
        mode: 'light',
        reducedMotion: false,
        fontSize: 'medium',
        colorBlindnessSupport: false,
        highContrast: false,
    };
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
                this.preferences = { ...this.preferences, ...JSON.parse(stored) };
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

        this.preferences.reducedMotion = prefersReducedMotion;
        this.preferences.highContrast = prefersHighContrast;

        // Listen for system preference changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (this.preferences.mode === 'auto') {
                this.currentTheme = e.matches ? 'dark' : 'light';
                this.applyTheme();
                this.notifyListeners();
            }
        });

        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            this.preferences.reducedMotion = e.matches;
            this.applyTheme();
            this.notifyListeners();
        });

        window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
            this.preferences.highContrast = e.matches;
            this.applyTheme();
            this.notifyListeners();
        });
    }

    private applyTheme(): void {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;
        const tokens = this.getThemeTokens();

        // Colors (dual naming: legacy --color-* and Tailwind expected --background / --primary-foreground)
        Object.entries(tokens.colors).forEach(([k, v]) => {
            root.style.setProperty(`--color-${k}`, v);
            const kebab = k.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
            root.style.setProperty(`--${kebab}`, v);
        });

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
        this.preferences.mode = mode;
        if (mode === 'auto') {
            const prefersDark = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
            this.currentTheme = prefersDark ? 'dark' : 'light';
        } else {
            this.currentTheme = mode;
        }
        // Reset explicit high contrast flag if leaving high-contrast mode directly
        if (mode !== 'high-contrast' && this.preferences.highContrast) this.preferences.highContrast = false;
        if (mode === 'high-contrast') this.preferences.highContrast = true;
        this.applyTheme();
        this.savePreferences();
        this.notifyListeners();
    }

    setPreferences(preferences: Partial<ThemePreferences>): void {
        const modeChange = preferences.mode && preferences.mode !== this.preferences.mode;
        this.preferences = { ...this.preferences, ...preferences };
        if (modeChange) {
            this.setTheme(this.preferences.mode);
            return;
        }
        // Maintain currentTheme vs highContrast interplay
        if (this.preferences.highContrast) {
            // keep currentTheme as underlying base but highContrast overrides tokens
        }
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
        theme: mounted ? theme : 'light',
        preferences,
        setTheme: themeSystem.setTheme.bind(themeSystem),
        setPreferences: themeSystem.setPreferences.bind(themeSystem),
        isDark: themeSystem.isDark.bind(themeSystem),
        isHighContrast: themeSystem.isHighContrast.bind(themeSystem),
        shouldReduceMotion: themeSystem.shouldReduceMotion.bind(themeSystem),
        hasColorBlindnessSupport: themeSystem.hasColorBlindnessSupport.bind(themeSystem),
    };
}

