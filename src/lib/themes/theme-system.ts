/**
 * Advanced Theme System for RankPilot
 * Priority 3 Feature Implementation - DevReady Phase 3
 * 
 * Features:
 * - Light/Dark/High-Contrast/Auto themes
 * - User-configurable interface preferences
 * - System-wide theme consistency
 * - Accessibility-focused color schemes
 * - Performance-optimized theme switching
 */

import React from 'react';

export type ThemeMode = 'light' | 'dark' | 'high-contrast' | 'auto';

export interface ThemePreferences {
    mode: ThemeMode;
    reducedMotion: boolean;
    fontSize: 'small' | 'medium' | 'large' | 'extra-large';
    colorBlindnessSupport: boolean;
    highContrast: boolean;
    customColors?: {
        primary?: string;
        secondary?: string;
        accent?: string;
    };
}

export interface ThemeTokens {
    colors: {
        // Base colors
        background: string;
        foreground: string;

        // Content colors
        primary: string;
        primaryForeground: string;
        secondary: string;
        secondaryForeground: string;

        // Interactive colors
        accent: string;
        accentForeground: string;
        muted: string;
        mutedForeground: string;

        // Semantic colors
        destructive: string;
        destructiveForeground: string;
        success: string;
        successForeground: string;
        warning: string;
        warningForeground: string;
        info: string;
        infoForeground: string;

        // UI colors
        border: string;
        input: string;
        ring: string;

        // Card colors
        card: string;
        cardForeground: string;

        // Popover colors
        popover: string;
        popoverForeground: string;
    };

    spacing: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        '2xl': string;
        '3xl': string;
        '4xl': string;
    };

    typography: {
        fontFamily: {
            sans: string;
            mono: string;
            heading: string;
        };
        fontSize: {
            xs: string;
            sm: string;
            base: string;
            lg: string;
            xl: string;
            '2xl': string;
            '3xl': string;
            '4xl': string;
            '5xl': string;
        };
        fontWeight: {
            normal: string;
            medium: string;
            semibold: string;
            bold: string;
        };
        lineHeight: {
            tight: string;
            normal: string;
            relaxed: string;
        };
    };

    shadows: {
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };

    borderRadius: {
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };

    animation: {
        duration: {
            fast: string;
            medium: string;
            slow: string;
        };
        easing: {
            easeIn: string;
            easeOut: string;
            easeInOut: string;
        };
    };
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
        } catch (_error) {
            console.warn('Failed to load theme preferences:', _error);
        }
    }

    private savePreferences(): void {
        try {
            localStorage.setItem('rankpilot-theme-preferences', JSON.stringify(this.preferences));
        } catch (_error) {
            console.warn('Failed to save theme preferences:', _error);
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
        const theme = this.getThemeTokens();

        // Apply theme colors as CSS custom properties
        Object.entries(theme.colors).forEach(([_key, value]) => {
            root.style.setProperty(`--color-${key}`, _value);
        });

        // Apply typography
        Object.entries(theme.typography.fontSize).forEach(([_key, value]) => {
            root.style.setProperty(`--font-size-${key}`, _value);
        });

        // Apply spacing
        Object.entries(theme.spacing).forEach(([_key, value]) => {
            root.style.setProperty(`--spacing-${key}`, _value);
        });

        // Apply shadows
        Object.entries(theme.shadows).forEach(([_key, value]) => {
            root.style.setProperty(`--shadow-${key}`, _value);
        });

        // Apply border radius
        Object.entries(theme.borderRadius).forEach(([_key, value]) => {
            root.style.setProperty(`--radius-${key}`, _value);
        });

        // Apply animation settings
        if (this.preferences.reducedMotion) {
            root.style.setProperty('--animation-duration-fast', '0ms');
            root.style.setProperty('--animation-duration-medium', '0ms');
            root.style.setProperty('--animation-duration-slow', '0ms');
        } else {
            Object.entries(theme.animation.duration).forEach(([_key, value]) => {
                root.style.setProperty(`--animation-duration-${key}`, _value);
            });
        }

        // Apply font size scaling
        const fontSizeScale = this.getFontSizeScale();
        root.style.setProperty('--font-scale', fontSizeScale.toString());

        // Apply theme class to body
        const themeClass = this.preferences.highContrast ? 'high-contrast' : this.currentTheme;
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(`theme-${themeClass}`);

        // Apply accessibility preferences
        if (this.preferences.reducedMotion) {
            document.body.classList.add('reduced-motion');
        } else {
            document.body.classList.remove('reduced-motion');
        }

        if (this.preferences.colorBlindnessSupport) {
            document.body.classList.add('colorblind-support');
        } else {
            document.body.classList.remove('colorblind-support');
        }
    }

    private getThemeTokensInternal(): ThemeTokens {
        const baseTheme = this.preferences.highContrast
            ? highContrastTheme
            : this.currentTheme === 'dark'
                ? darkTheme
                : lightTheme;

        // Apply custom colors if specified
        if (this.preferences.customColors) {
            const customTheme = { ...baseTheme };
            if (this.preferences.customColors.primary) {
                customTheme.colors.primary = this.preferences.customColors.primary;
            }
            if (this.preferences.customColors.secondary) {
                customTheme.colors.secondary = this.preferences.customColors.secondary;
            }
            if (this.preferences.customColors.accent) {
                customTheme.colors.accent = this.preferences.customColors.accent;
            }
            return customTheme;
        }

        return baseTheme;
    }

    private getFontSizeScale(): number {
        switch (this.preferences.fontSize) {
            case 'small': return 0.875;
            case 'medium': return 1;
            case 'large': return 1.125;
            case 'extra-large': return 1.25;
            default: return 1;
        }
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => {
            listener(this.currentTheme, this.preferences);
        });
    }

    // Public API methods
    setTheme(mode: ThemeMode): void {
        this.preferences.mode = mode;

        if (mode === 'auto') {
            const prefersDark = typeof window !== 'undefined'
                ? window.matchMedia('(prefers-color-scheme: dark)').matches
                : false;
            this.currentTheme = prefersDark ? 'dark' : 'light';
        } else {
            this.currentTheme = mode;
        }

        this.applyTheme();
        this.savePreferences();
        this.notifyListeners();
    }

    setPreferences(preferences: Partial<ThemePreferences>): void {
        this.preferences = { ...this.preferences, ...preferences };

        if (preferences.mode) {
            this.setTheme(preferences.mode);
        } else {
            this.applyTheme();
            this.savePreferences();
            this.notifyListeners();
        }
    }

    getTheme(): ThemeMode {
        return this.currentTheme;
    }

    getPreferences(): ThemePreferences {
        return { ...this.preferences };
    }

    getThemeTokens(): ThemeTokens {
        return this.getThemeTokensInternal();
    }

    subscribe(listener: (theme: ThemeMode, preferences: ThemePreferences) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    // Utility methods for components
    isDark(): boolean {
        return this.currentTheme === 'dark' || this.preferences.highContrast;
    }

    isHighContrast(): boolean {
        return this.preferences.highContrast;
    }

    shouldReduceMotion(): boolean {
        return this.preferences.reducedMotion;
    }

    hasColorBlindnessSupport(): boolean {
        return this.preferences.colorBlindnessSupport;
    }
}

// Export singleton instance
export const themeSystem = ThemeSystem.getInstance();

// React hook for theme system
export function useTheme() {
    const [theme, setTheme] = React.useState<ThemeMode>(() => themeSystem.getTheme());
    const [preferences, setPreferences] = React.useState<ThemePreferences>(() => themeSystem.getPreferences());

    React.useEffect(() => {
        return themeSystem.subscribe((newTheme, newPreferences) => {
            setTheme(newTheme);
            setPreferences(newPreferences);
        });
    }, []);

    return {
        theme,
        preferences,
        setTheme: themeSystem.setTheme.bind(themeSystem),
        setPreferences: themeSystem.setPreferences.bind(themeSystem),
        isDark: themeSystem.isDark.bind(themeSystem),
        isHighContrast: themeSystem.isHighContrast.bind(themeSystem),
        shouldReduceMotion: themeSystem.shouldReduceMotion.bind(themeSystem),
        hasColorBlindnessSupport: themeSystem.hasColorBlindnessSupport.bind(themeSystem),
    };
}
