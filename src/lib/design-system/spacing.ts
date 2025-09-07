/**
 * RankPilot Design System - Spacing System
 * Consistent spacing scale for mobile-first design
 */

export const spacing = {
  // Component spacing
  component: {
    xs: "p-2", // 8px - Tight components
    sm: "p-3", // 12px - Form inputs, small cards
    base: "p-4", // 16px - Standard cards, buttons
    lg: "p-6", // 24px - Large cards, modals
    xl: "p-8", // 32px - Page sections
    "2xl": "p-12", // 48px - Hero sections
  },

  // Vertical rhythm
  stack: {
    xs: "space-y-1", // 4px - Tight lists
    sm: "space-y-2", // 8px - Form fields
    base: "space-y-4", // 16px - Card sections
    lg: "space-y-6", // 24px - Page sections
    xl: "space-y-8", // 32px - Major sections
    "2xl": "space-y-12", // 48px - Page breaks
  },

  // Top margins for sections
  section: {
    sm: "mt-4", // 16px - Small sections
    base: "mt-6", // 24px - Standard sections
    lg: "mt-8", // 32px - Major sections
    xl: "mt-12", // 48px - Page headers
  },

  // Mobile-specific touch targets
  touch: {
    min: "min-h-[44px]", // iOS minimum
    comfortable: "min-h-[48px]", // Material Design
    large: "min-h-[56px]", // Large targets
  },

  // Container widths
  container: {
    xs: "max-w-sm", // 384px
    sm: "max-w-md", // 448px
    base: "max-w-lg", // 512px
    lg: "max-w-2xl", // 672px
    xl: "max-w-4xl", // 896px
    full: "max-w-full", // No limit
  },
} as const;

// Safe area spacing for mobile devices
export const safeArea = {
  top: "pt-safe-area-inset-top",
  bottom: "pb-safe-area-inset-bottom",
  left: "pl-safe-area-inset-left",
  right: "pr-safe-area-inset-right",
} as const;

// Mobile breakpoints for responsive spacing
export const responsiveSpacing = {
  cardPadding: "p-4 md:p-6 lg:p-8",
  sectionMargin: "mt-6 md:mt-8 lg:mt-12",
  stackSpacing: "space-y-4 md:space-y-6 lg:space-y-8",
} as const;
