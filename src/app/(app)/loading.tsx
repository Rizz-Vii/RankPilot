// Generic loading UI for authenticated app segment
export default function AppSegmentLoading() {
    return (
        <div className="p-6">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-28 rounded-md bg-muted animate-pulse" />
                ))}
            </div>
        </div>
    );
}
