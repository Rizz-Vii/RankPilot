/**
 * RankPilot Design System - Typography Scale
 * Mobile-first typography with consistent hierarchy
 */

export const typography = {
    // Display sizes for hero sections
    display: {
        '2xl': 'text-4xl md:text-5xl lg:text-6xl font-bold',
        xl: 'text-3xl md:text-4xl lg:text-5xl font-bold',
        lg: 'text-2xl md:text-3xl lg:text-4xl font-bold',
    },

    // Heading hierarchy
    heading: {
        h1: 'text-2xl md:text-3xl font-semibold tracking-tight',
        h2: 'text-xl md:text-2xl font-semibold tracking-tight',
        h3: 'text-lg md:text-xl font-semibold',
        h4: 'text-base md:text-lg font-medium',
        h5: 'text-sm md:text-base font-medium',
    },

    // Body text
    body: {
        lg: 'text-lg leading-relaxed',
        base: 'text-base leading-normal',
        sm: 'text-sm leading-normal',
        xs: 'text-xs leading-tight',
    },

    // UI text
    ui: {
        label: 'text-sm font-medium text-gray-700',
        helper: 'text-xs text-gray-500',
        caption: 'text-xs text-gray-400',
        button: 'text-sm font-medium',
    },

    // Status and feedback
    status: {
        success: 'text-green-700 font-medium',
        warning: 'text-amber-700 font-medium',
        _error: 'text-red-700 font-medium',
        info: 'text-blue-700 font-medium',
    },

    // Navigation and sidebar
    nav: {
        primary: 'text-sm font-medium text-gray-900',
        secondary: 'text-sm text-gray-600',
        badge: 'text-xs font-semibold uppercase tracking-wide',
        user: 'text-xs text-gray-500',
    },

    // Form elements
    form: {
        label: 'text-sm font-medium text-gray-900 mb-2',
        input: 'text-base text-gray-900 placeholder:text-gray-400',
        helper: 'text-xs text-gray-600 mt-1',
        _error: 'text-xs text-red-600 mt-1',
    },

    // Cards and components
    card: {
        title: 'text-lg font-semibold text-gray-900',
        subtitle: 'text-sm text-gray-600',
        _value: 'text-2xl font-bold text-gray-900',
        metric: 'text-xs text-gray-500 uppercase tracking-wide',
    },

    // Mobile-optimized readability
    mobile: {
        title: 'text-xl font-semibold leading-tight',
        body: 'text-base leading-relaxed',
        caption: 'text-sm leading-normal',
        button: 'text-base font-medium', // Larger for touch
    }
} as const;

// Typography utility functions
export const getTypographyClass = (variant: keyof typeof typography, size: string) => {
    const variantStyles = typography[variant] as Record<string, string>;
    return variantStyles[size] || typography.body.base;
};
