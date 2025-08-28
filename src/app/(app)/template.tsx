// src/app/(app)/template.tsx
// Server-only wrapper to provide route segment config for the entire (app) group
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AppSegmentTemplate({ children }: { children: React.ReactNode }) {
    return children;
}
