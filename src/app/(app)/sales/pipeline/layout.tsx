// src/app/(app)/sales/pipeline/layout.tsx
// Mark the sales pipeline segment as dynamic to avoid static export errors
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
    return children;
}
