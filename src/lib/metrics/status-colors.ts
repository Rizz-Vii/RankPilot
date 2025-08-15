// Centralized status -> semantic color class mapping for metrics & dashboards
// Use only semantic design tokens (no raw palette utilities) to ensure consistent theming.

export type StatusState = 'good' | 'warn' | 'bad' | 'on' | 'near' | 'far';

// Background (solid) fill color for progress bars / inline indicators
export function statusBarBg(state: StatusState | string): string {
    switch (state) {
        case 'good':
        case 'on':
            return 'bg-success';
        case 'warn':
        case 'near':
            return 'bg-warning';
        case 'bad':
        case 'far':
            return 'bg-destructive';
        default:
            return 'bg-primary';
    }
}

// Badge surface (background + text) mapping – reserved for future consolidation
export function statusBadgeSurface(state: StatusState | string): string {
    switch (state) {
        case 'good':
        case 'on':
            return 'bg-success/10 text-success-foreground';
        case 'warn':
        case 'near':
            return 'bg-warning/10 text-warning-foreground';
        case 'bad':
        case 'far':
            return 'bg-destructive/10 text-destructive-foreground';
        default:
            return 'bg-primary/10 text-primary';
    }
}
