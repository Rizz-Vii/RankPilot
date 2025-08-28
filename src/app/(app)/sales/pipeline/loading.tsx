export default function SalesPipelineLoading() {
    return (
        <div className="p-6 space-y-4">
            <div className="h-6 w-48 bg-muted rounded animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-48 bg-muted rounded animate-pulse" />
                <div className="h-48 bg-muted rounded animate-pulse" />
            </div>
        </div>
    );
}
