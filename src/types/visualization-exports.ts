// Shared types for server-side visualization exports
export type ExportFormat = 'pdf' | 'excel' | 'json' | 'png' | 'svg';

export interface ServerChartArtifactData {
    userId: string;
    id: string;
    config?: { type?: string; width?: number; height?: number; title?: string };
    svg?: string;
    image?: string; // data URL preferred for png/pdf embedding
    data?: unknown; // raw series / table structure (not persisted derived ratios)
    previewImage?: string; // optional lightweight thumbnail
    metadata?: Record<string, string | number | boolean | undefined>;
}

export interface ServerDashboardArtifactData {
    userId: string;
    id: string;
    widgets?: Array<{ id: string; type: string }>;
}
