"use client";
import { useEffect, useState } from "react";

interface Summary {
  totalUnique: number;
  keys: Record<string, number>;
}

export function ListenerBadge() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    let mounted = true;
    const fetchSummary = () => {
      // Internal async IIFE; fire & forget (network read only, state set guarded by mounted flag)
      void (async () => {
        try {
          const res = await fetch("/api/diagnostics/listeners");
          if (!res.ok) return;
          const json = await res.json();
          if (mounted) setSummary(json.listeners);
        } catch {
          /* swallow */
        }
      })();
    };
    fetchSummary();
    const id = setInterval(fetchSummary, 4000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);
  if (process.env.NODE_ENV !== "development") return null;
  if (!summary) return null;
  return (
    <div
      onClick={() => setVisible((v) => !v)}
      className="fixed z-[9999] bottom-3 right-3 select-none text-xs font-mono bg-black/70 text-white px-2 py-1 rounded shadow cursor-pointer backdrop-blur-sm"
      title="Firestore listener summary (dev-only). Click to expand."
    >
      🔌 {summary.totalUnique} listeners
      {visible && (
        <div className="mt-1 max-h-48 overflow-auto bg-black/80 p-2 rounded w-[260px] space-y-1">
          {Object.entries(summary.keys).map(([k, c]) => (
            <div key={k} className="truncate">
              <span className="text-emerald-300">{c}×</span>{" "}
              <span className="opacity-80">{k}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
