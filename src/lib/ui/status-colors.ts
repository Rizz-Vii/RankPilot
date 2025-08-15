// Centralized mapping from legacy status/severity names to semantic color utility classes.
// Eliminates direct Tailwind palette usages (e.g., bg-[red-*], text-[green-*]) in favor of
// semantic tokens already defined in globals (success, warning, destructive).
//
// Mapping rationale:
//  - critical -> destructive (error state)
//  - high / medium -> warning (medium uses subtle variant for hierarchy)
//  - low -> success
// Provide solid + subtle variants and optional hover for interactive elements.

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

interface SeverityStyleOptions {
    variant?: 'solid' | 'subtle';
    withHover?: boolean;
}

const token = {
    destructive: {
        solid: 'bg-destructive text-destructive-foreground',
        subtle: 'bg-destructive/10 text-destructive border border-destructive/30'
    },
    warning: {
        solid: 'bg-warning text-warning-foreground',
        subtle: 'bg-warning/15 text-warning-foreground border border-warning/30'
    },
    success: {
        solid: 'bg-success text-success-foreground',
        subtle: 'bg-success/15 text-success border border-success/30'
    }
};

export function severityClasses(level: SeverityLevel, opts: SeverityStyleOptions = {}): string {
    const { variant = 'solid', withHover = false } = opts;
    switch (level) {
        case 'critical': {
            const base = token.destructive[variant];
            return withHover ? `${base} hover:bg-destructive/90 transition-colors` : base;
        }
        case 'high': {
            const base = token.warning[variant];
            return withHover ? `${base} hover:bg-warning/80 transition-colors` : base;
        }
        case 'medium': {
            const keyVariant = variant === 'solid' ? 'subtle' : variant; // medium = subtle emphasis by default
            const base = token.warning[keyVariant as 'solid' | 'subtle'];
            return withHover ? `${base} hover:bg-warning/25 transition-colors` : base;
        }
        case 'low': {
            const base = token.success[variant];
            return withHover ? `${base} hover:bg-success/80 transition-colors` : base;
        }
        default:
            return '';
    }
}

// Convenience for button/badge style with padding & font baseline
export function severityButtonClasses(level: SeverityLevel): string {
    return `${severityClasses(level, { variant: 'solid', withHover: true })} px-2 py-1 rounded text-xs font-medium`;
}
