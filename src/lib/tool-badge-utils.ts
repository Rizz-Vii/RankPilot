// Shared badge utility for ToolPageHeader across tools & NeuroSEO suite
// Centralizes base feature badges and provenance (live | cache | fallback) badges
// Keep variants within ToolPageHeader accepted union: "outline" | "secondary" | "default"

export type ToolBadge = {
    label: string;
    variant?: "outline" | "secondary" | "default";
    className?: string;
};

// Base feature badges (extend as needed)
const featureBadgeMap: Record<string, ToolBadge[]> = {
    // NeuroSEO suite
    "semantic-map": [neuroseoBadge()],
    "ai-visibility": [neuroseoBadge({ label: "NeuroSEO™ AI" })],
    "neural-crawler": [neuroseoBadge()],
    "rewrite-gen": [neuroseoBadge()],
    "trust-block": [neuroseoBadge()],
    // Other tools
    "keyword-tool": [],
    "seo-audit": [neuroseoBadge()],
    "content-brief": [neuroseoBadge()],
    "serp-view": [neuroseoBadge()],
    "link-view": [neuroseoBadge()],
    "dashboard": [
        {
            label: "Overview",
            variant: "outline",
            className: "text-primary border-primary/40",
        },
    ],
};

function neuroseoBadge(override?: Partial<ToolBadge>): ToolBadge {
    return {
        label: "NeuroSEO™",
        variant: "outline",
        className: "text-primary border-primary/40",
        ...override,
    };
}

export function getFeatureBadges(feature: string, extra?: ToolBadge[]): ToolBadge[] {
    return [...(featureBadgeMap[feature] || []), ...(extra || [])];
}

export type ProvenanceSource = "live" | "cache" | "fallback" | null | undefined;

export function getProvenanceBadges(source: ProvenanceSource): ToolBadge[] {
    switch (source) {
        case "fallback":
            return [
                {
                    label: "Demo Data",
                    variant: "outline",
                    className: "animate-pulse border-warning/60 text-warning",
                },
            ];
        case "cache":
            return [
                {
                    label: "Cache",
                    variant: "secondary",
                },
            ];
        case "live":
            return [
                {
                    label: "Live Data",
                    variant: "outline",
                    className: "border-primary/50 text-primary",
                },
            ];
        default:
            return [];
    }
}

export function composeToolHeaderBadges(
    feature: string,
    provenance?: ProvenanceSource,
    extra?: ToolBadge[]
): ToolBadge[] {
    return [...getFeatureBadges(feature), ...getProvenanceBadges(provenance), ...(extra || [])];
}
