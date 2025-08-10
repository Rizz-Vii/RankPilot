"use client";
import React, { useMemo, useState, useRef, useCallback } from 'react';

interface LatencySparklineProps {
  samples: number[]; // durations in ms
  maxPoints?: number;
  height?: number;
  id?: string;
  describedBy?: string; // aria-describedby id
}

// Lightweight inline SVG sparkline (no external lib) for latency distribution
export const LatencySparkline: React.FC<LatencySparklineProps> = ({ samples, maxPoints = 40, height = 36, id, describedBy }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastClientX = useRef<number | null>(null);
  const debounceRef = useRef<number | null>(null);
  const slice = useMemo(() => samples.slice(-maxPoints), [samples, maxPoints]);
  const max = useMemo(() => slice.length ? Math.max(...slice) : 0, [slice]);
  const min = useMemo(() => slice.length ? Math.min(...slice) : 0, [slice]);
  const range = max - min || 1;
  const pointList = useMemo(() => slice.map((v, i) => {
    const x = (i / (slice.length - 1 || 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return { x, y, v };
  }), [slice, min, range]);
  const polyPoints = pointList.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

  const handleMoveImmediate = useCallback((clientX: number) => {
    if (!containerRef.current || !pointList.length) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rel = ((clientX - rect.left) / rect.width) * 100;
    let nearest = 0;
    let best = Infinity;
    pointList.forEach((p, i) => {
      const d = Math.abs(p.x - rel);
      if (d < best) { best = d; nearest = i; }
    });
    setHoverIdx(nearest);
  }, [pointList]);

  const scheduleMove = useCallback((clientX: number) => {
    lastClientX.current = clientX;
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      if (lastClientX.current !== null) handleMoveImmediate(lastClientX.current);
    }, 32); // ~30fps debounce
  }, [handleMoveImmediate]);

  if (!pointList.length) return <div className="text-[11px] text-muted-foreground">No latency data</div>;

  const active = hoverIdx !== null ? pointList[hoverIdx] : null;

  return (
    <div ref={containerRef} id={id} className="relative flex flex-col gap-1 select-none" aria-label="Latency distribution sparkline" aria-describedby={describedBy} tabIndex={0}
      onMouseLeave={() => setHoverIdx(null)}
      onMouseMove={(e) => scheduleMove(e.clientX)}
      onFocus={() => setHoverIdx(p => p ?? pointList.length - 1)}
      onKeyDown={(e) => {
        if (!pointList.length) return;
        if (e.key === 'ArrowRight') { setHoverIdx(i => Math.min(pointList.length - 1, (i ?? 0) + 1)); }
        if (e.key === 'ArrowLeft') { setHoverIdx(i => Math.max(0, (i ?? 0) - 1)); }
      }}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full cursor-crosshair" style={{ height }}>
        <defs>
          <linearGradient id="latencyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--emerald-500,140,70%,40%))" stopOpacity="0.15" />
            <stop offset="60%" stopColor="hsl(var(--amber-500,40,90%,45%))" stopOpacity="0.12" />
            <stop offset="100%" stopColor="hsl(var(--rose-500,350,90%,55%))" stopOpacity="0.18" />
          </linearGradient>
        </defs>
        <rect x={0} y={0} width={100} height={100} fill="url(#latencyGradient)" rx={2} />
        <polyline
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={polyPoints}
        />
        {active && (
          <g>
            <line x1={active.x} x2={active.x} y1={0} y2={100} stroke="hsl(var(--primary))" strokeWidth={0.3} strokeDasharray="2 2" />
            <circle cx={active.x} cy={active.y} r={1.8} fill="hsl(var(--primary))" />
          </g>
        )}
      </svg>
      {active && (
        <div className="absolute -top-1 left-0 translate-x-1/2 pointer-events-none" style={{ left: `${active.x}%` }}>
          <div className="rounded bg-popover px-1.5 py-0.5 shadow text-[10px] font-medium border border-border/50">
            {active.v.toFixed(0)}ms
          </div>
        </div>
      )}
    </div>
  );
};

export default LatencySparkline;
