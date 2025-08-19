"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export interface VirtualMessage {
  id: string | number;
  // Additional properties allowed
  [key: string]: unknown;  
}

interface VirtualizedMessageListProps<T extends VirtualMessage> {
  items: T[];
  /** Estimated average item height (px) used before measurement */
  estimatedItemHeight?: number;
  /** Overscan in pixels before/after viewport */
  overscanPx?: number;
  /** Classname for scroll container */
  className?: string;
  /** Render a message; provide absolute style props already set */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Auto scroll to bottom when new item appended and user near bottom */
  autoScroll?: boolean;
}

// Lightweight variable-height virtualization (prefix-sum + ResizeObserver)
export function VirtualizedMessageList<T extends VirtualMessage>({
  items,
  estimatedItemHeight = 80,
  overscanPx = 320,
  className,
  renderItem,
  autoScroll = true,
}: VirtualizedMessageListProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const heightsRef = useRef<Map<string | number, number>>(new Map());
  const [tick, setTick] = useState(0); // force rerender when heights change
  const prefixRef = useRef<number[]>([]); // prefix sum cache
  const prevLengthRef = useRef(0);

  const recomputePrefix = useCallback(() => {
    const arr: number[] = new Array(items.length);
    let running = 0;
    for (let i = 0; i < items.length; i++) {
      const h = heightsRef.current.get(items[i].id) ?? estimatedItemHeight;
      running += h;
      arr[i] = running;
    }
    prefixRef.current = arr;
  }, [items, estimatedItemHeight]);

  useLayoutEffect(() => {
    recomputePrefix();
  }, [items, tick, recomputePrefix]);

  useEffect(() => {
    if (!autoScroll) return;
    const el = containerRef.current; if(!el) return;
    const nearBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) < 200;
    if (items.length > prevLengthRef.current && nearBottom) {
      requestAnimationFrame(() => { if(containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight; });
    }
    prevLengthRef.current = items.length;
  }, [items, autoScroll]);

  const findStartIndex = (scrollTop: number) => {
    const prefix = prefixRef.current; if (!prefix.length) return 0;
    let low = 0, high = prefix.length - 1, mid; 
    while (low < high) {
      mid = (low + high) >>> 1;
      if (prefix[mid] >= scrollTop) high = mid; else low = mid + 1;
    }
    return low;
  };

  const [range, setRange] = useState({ start: 0, end: 0 });

  const updateRange = useCallback(() => {
    const el = containerRef.current; if(!el) return;
    const scrollTop = el.scrollTop;
    const vh = el.clientHeight;
    const startPx = Math.max(0, scrollTop - overscanPx);
    const endPx = scrollTop + vh + overscanPx;
    const startIndex = findStartIndex(startPx);
    const prefix = prefixRef.current; let endIndex = startIndex;
    while (endIndex < prefix.length && prefix[endIndex] < endPx) endIndex++;
    setRange({ start: startIndex, end: Math.min(items.length, endIndex + 1) });
  }, [items.length, overscanPx]);

  useEffect(() => { updateRange(); }, [items.length, tick, updateRange]);

  useEffect(() => {
    const el = containerRef.current; if(!el) return;
    const onScroll = () => updateRange();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [updateRange]);

  const setMeasuredRef = (id: string | number) => (node: HTMLDivElement | null) => {
    if (!node) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const h = entry.contentRect.height;
        if (heightsRef.current.get(id) !== h) {
          heightsRef.current.set(id, h);
            setTick(t => t + 1);
        }
      }
    });
    ro.observe(node);
  };

  const totalHeight = prefixRef.current.length ? prefixRef.current[prefixRef.current.length - 1] : 0;

  return (
    <div ref={containerRef} className={"relative overflow-y-auto h-full " + (className || "")}> 
      <div style={{ height: totalHeight }} className="relative w-full">
        {items.slice(range.start, range.end).map((item, i) => {
          const index = range.start + i;
          const top = (prefixRef.current[index - 1] || 0);
          return (
            <div
              key={item.id}
              ref={setMeasuredRef(item.id)}
              style={{ position: 'absolute', top, left: 0, right: 0 }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            No messages yet
          </div>
        )}
      </div>
    </div>
  );
}
