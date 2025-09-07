import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shimmer?: boolean;
}

function Skeleton({ className, shimmer = false, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        shimmer ? "skeleton-shimmer" : "animate-pulse",
        className
      )}
      {...props}
    />
  );
}

// Global shimmer style injected once (idempotent)
if (
  typeof document !== "undefined" &&
  !document.getElementById("skeleton-shimmer-style")
) {
  const style = document.createElement("style");
  style.id = "skeleton-shimmer-style";
  style.textContent = `
  @keyframes skeletonShimmerMove { 0% { transform: translateX(-100%);} 100% { transform: translateX(100%);} }
  .skeleton-shimmer { background: linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--muted)) 40%, hsl(var(--muted-foreground)/0.10) 50%, hsl(var(--muted)) 60%, hsl(var(--muted)) 100%); position: relative; }
  .skeleton-shimmer::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent); animation: skeletonShimmerMove 1.4s linear infinite; }
    @media (prefers-reduced-motion: reduce) { .skeleton-shimmer::after { animation: none; } }
  `;
  document.head.appendChild(style);
}

export { Skeleton };
