/**
 * RankPilot Design System - Color System
 * Consistent color usage for status, feedback, and UI elements
 */

export const colors = {
    // Status colors (semantic)
    status: {
        success: {
            bg: 'bg-green-50',
            text: 'text-green-700',
            border: 'border-green-200',
            badge: 'bg-green-100 text-green-800',
        },
        warning: {
            bg: 'bg-amber-50',
            text: 'text-amber-700',
            border: 'border-amber-200',
            badge: 'bg-amber-100 text-amber-800',
        },
        error: {
            bg: 'bg-red-50',
            text: 'text-red-700',
            border: 'border-red-200',
            badge: 'bg-red-100 text-red-800',
        },
        info: {
            bg: 'bg-blue-50',
            text: 'text-blue-700',
            border: 'border-blue-200',
            badge: 'bg-blue-100 text-blue-800',
        }
    },

    // Project status colors (from screenshots)
    projectStatus: {
        active: {
            bg: 'bg-green-100',
            text: 'text-green-800',
            dot: 'bg-green-500',
        },
        planning: {
            bg: 'bg-blue-100',
            text: 'text-blue-800',
            dot: 'bg-blue-500',
        },
        completed: {
            bg: 'bg-gray-100',
            text: 'text-gray-800',
            dot: 'bg-gray-500',
        },
        high: {
            bg: 'bg-orange-100',
            text: 'text-orange-800',
            dot: 'bg-orange-500',
        },
        medium: {
            bg: 'bg-yellow-100',
            text: 'text-yellow-800',
            dot: 'bg-yellow-500',
        }
    },

    // System health colors
    health: {
        healthy: {
            bg: 'bg-green-50',
            text: 'text-green-700',
            badge: 'bg-green-100 text-green-800 font-medium',
        },
        warning: {
            bg: 'bg-amber-50',
            text: 'text-amber-700',
            badge: 'bg-amber-100 text-amber-800 font-medium',
        },
        critical: {
            bg: 'bg-red-50',
            text: 'text-red-700',
            badge: 'bg-red-100 text-red-800 font-medium',
        }
    },

    // Tier badges (from sidebar)
    tierBadges: {
        ai: 'bg-purple-500 text-white px-2 py-1 rounded-md text-xs font-semibold',
        enterprise: 'bg-blue-500 text-white px-2 py-1 rounded-md text-xs font-semibold',
        agency: 'bg-green-500 text-white px-2 py-1 rounded-md text-xs font-semibold',
        starter: 'bg-amber-500 text-white px-2 py-1 rounded-md text-xs font-semibold',
        free: 'bg-gray-500 text-white px-2 py-1 rounded-md text-xs font-semibold',
    },

    // Text colors with proper contrast
    text: {
        primary: 'text-gray-900',
        secondary: 'text-gray-600',
        muted: 'text-gray-500',
        inverse: 'text-white',
        link: 'text-blue-600 hover:text-blue-700',
    },

    // Background colors
    background: {
        primary: 'bg-white',
        secondary: 'bg-gray-50',
        muted: 'bg-gray-100',
        dark: 'bg-gray-900',
        card: 'bg-white border border-gray-200',
    }
} as const;

// Color utility functions
export const getStatusColor = (status: 'success' | 'warning' | 'error' | 'info', type: 'bg' | 'text' | 'border' | 'badge') => {
    return colors.status[status][type];
};

export const getProjectStatusColor = (status: string) => {
    const statusKey = status.toLowerCase() as keyof typeof colors.projectStatus;
    return colors.projectStatus[statusKey] || colors.projectStatus.active;
};

export const getTierBadgeColor = (tier: string) => {
    const tierKey = tier.toLowerCase() as keyof typeof colors.tierBadges;
    return colors.tierBadges[tierKey] || colors.tierBadges.free;
};
