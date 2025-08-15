/**
 * RankPilot Design System - Mobile Sidebar Styles
 * Optimized mobile navigation with proper touch targets
 */

export const sidebarStyles = {
    // Container styles
    container: {
        base: 'h-full bg-sidebar text-sidebar-foreground',
        mobile: 'w-[280px]', // Fixed mobile width
        desktop: 'w-[var(--sidebar-width)]',
    },

    // Navigation items
    navItem: {
        base: 'flex items-center gap-3 rounded-lg transition-all duration-200',
        padding: 'px-3 py-2.5', // 44px minimum touch target
        interactive: 'hover:bg-sidebar-accent active:bg-sidebar-accent/80',
        selected: 'bg-sidebar-accent border-l-2 border-primary',
    },

    // Navigation groups
    navGroup: {
        container: 'mb-6',
        header: 'text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3',
        content: 'space-y-1',
    },

    // User switching section
    userSwitch: {
        container: 'border-t border-sidebar-border pt-4 mt-4',
        trigger: 'flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-sidebar-accent',
        dropdown: 'bg-sidebar border border-sidebar-border rounded-lg shadow-lg mt-1',
        userItem: 'flex items-center gap-3 px-4 py-3 hover:bg-sidebar-accent transition-colors',
    },

    // Badges and indicators
    badge: {
        ai: 'bg-accent text-accent-foreground px-2 py-0.5 rounded text-xs font-medium',
        tier: 'bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-medium',
        count: 'bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-xs',
    },

    // Typography
    text: {
        primary: 'text-sm font-medium text-sidebar-foreground',
        secondary: 'text-xs text-muted-foreground',
        userEmail: 'text-xs text-muted-foreground truncate',
        tierLabel: 'text-xs text-muted-foreground',
    },

    // Icons
    icon: {
        size: 'w-5 h-5',
        color: 'text-muted-foreground group-hover:text-foreground',
        selected: 'text-primary',
    }
} as const;

// Mobile-specific touch optimizations
export const mobileSidebarOptimizations = {
    // Ensure all interactive elements meet touch standards
    touchTarget: 'min-h-[44px] min-w-[44px]',

    // Improved spacing for mobile
    mobileSpacing: {
        itemPadding: 'px-4 py-3', // Larger touch areas
        groupSpacing: 'mb-6',     // More breathing room
        userSpacing: 'py-4',      // Larger user switching area
    },

    // Mobile typography enhancements
    mobileText: {
        navItem: 'text-base font-medium', // Larger for readability
        badge: 'text-xs font-semibold',
        userInfo: 'text-sm',
    },

    // Responsive behavior
    responsive: {
        hideOnMobile: 'hidden md:block',
        showOnMobile: 'block md:hidden',
        mobileOnly: 'md:hidden',
    }
} as const;
