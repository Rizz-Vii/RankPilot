"use client";
import { useState, useCallback, useMemo, type FC } from "react";

export type Provenance = "live" | "cache" | "fallback" | null;

export interface UseProvenanceOptions { initial?: Provenance; }

export function useProvenance(opts: UseProvenanceOptions = {}) {
  const [provenance, setProvenance] = useState<Provenance>(opts.initial ?? null);
  const markLive = useCallback(() => setProvenance("live"), []);
  const markCache = useCallback(() => setProvenance("cache"), []);
  const markFallback = useCallback(() => setProvenance("fallback"), []);

  const ProvenanceLegend = useMemo(() => {
    const ProvenanceLegendComponent: FC = function ProvenanceLegendComponent() {
      if (!provenance) return null;
      return (
        <div className="text-xs text-muted-foreground border rounded-md px-2 py-1 bg-muted/30 max-w-[260px]">
          <p className="font-semibold mb-1">Provenance Legend</p>
          <ul className="space-y-0.5 list-disc pl-4 marker:text-muted-foreground/70">
            <li><span className="font-medium">Live Data:</span> Fresh AI analysis just computed.</li>
            <li><span className="font-medium">Cache:</span> Recently cached result (≤10m old).</li>
            <li><span className="font-medium">Demo Data:</span> Deterministic fallback sample.</li>
          </ul>
        </div>
      );
    };
    return ProvenanceLegendComponent;
  }, [provenance]);

  return { provenance, setProvenance, markLive, markCache, markFallback, ProvenanceLegend };
}

// Explicit re-export to satisfy any anomalous module resolution caching
export const _useProvenance = useProvenance;
