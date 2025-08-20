"use client";
import { useEffect, useRef, useState, type ReactNode } from 'react';

interface Column<T> { key: string; header: string; render?: (row: T) => ReactNode; className?: string; }

interface LazyDataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  empty?: string;
  height?: number; // px viewport height
  rowKey?: (row: T, idx: number) => string | number;
  overscan?: number;
  className?: string;
}

const ROW_HEIGHT = 40;

// Simple virtual scroll table (fixed row height) to avoid large DOM
export function LazyDataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  loading,
  empty = 'No records',
  height = 340,
  rowKey,
  overscan = 6,
  className,
}: LazyDataTableProps<T>): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [range, setRange] = useState({
    start: 0,
    end: Math.min(rows.length, Math.ceil(height / ROW_HEIGHT) + overscan),
  });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      const target = containerRef.current;
      if (!target) return;
      const scrollTop = target.scrollTop;
      const vh = target.clientHeight;
      const rowH = ROW_HEIGHT;
      const start = Math.max(0, Math.floor(scrollTop / rowH) - overscan);
      const end = Math.min(rows.length, Math.ceil((scrollTop + vh) / rowH) + overscan);
      setRange({ start, end });
    };

    onScroll();
    el.addEventListener('scroll', onScroll);
    return () => {
      el.removeEventListener('scroll', onScroll);
    };
  }, [rows.length, overscan, height]);
  const totalH = rows.length * ROW_HEIGHT;
  if (loading) return <div className="rounded-md border p-4 text-xs text-muted-foreground">Loading...</div>;
  if (!rows.length) return <div className="rounded-md border p-4 text-xs text-muted-foreground">{empty}</div>;
  return (
    <div className={`border rounded-md overflow-hidden bg-background/50 ${className ?? ''}`}>
      <div className="flex text-[11px] uppercase tracking-wide bg-muted/50 border-b">
        {columns.map((c) => (
          <div key={c.key} className={`px-2 py-2 flex-1 font-medium ${c.className ?? ''}`}>{c.header}</div>
        ))}
      </div>
      <div ref={containerRef} style={{ maxHeight: height }} className="relative overflow-auto text-xs">
        <div style={{ height: totalH }} className="relative">
          {rows.slice(range.start, range.end).map((r, i) => {
            const idx = range.start + i;
            const top = idx * ROW_HEIGHT;
            return (
              <div
                key={rowKey ? rowKey(r, idx) : idx}
                style={{ transform: `translateY(${top}px)` }}
                className="absolute inset-x-0 flex border-b last:border-b-0 hover:bg-muted/30"
              >
                {columns.map((c) => (
                  <div key={c.key} className={`px-2 py-2 flex-1 truncate ${c.className ?? ''}`}>
                    {c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? '')}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
