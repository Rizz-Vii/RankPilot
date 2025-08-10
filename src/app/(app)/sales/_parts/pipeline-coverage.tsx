"use client";
import React from 'react';
import { useSalesContext } from '../_parts/sales-context';

export default function PipelineCoverage() {
  const { data } = useSalesContext();
  const coverage = data?.coverage || { pipeline:0, target:1, coverageRatio:0};
  const ratio = coverage.coverageRatio;
  const pct = Math.min(ratio/3,1); // scale for arc fill (assuming 3x ideal upper bound)
  const radius = 70; const stroke = 14; const c = 2 * Math.PI * radius; const filled = c * pct;
  return (
    <div className="rounded-xl border p-4 bg-gradient-to-br from-background to-muted/30 h-[260px] flex flex-col">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Pipeline Coverage</h3>
      <div className="flex-1 flex flex-col items-center justify-center">
        <svg width={180} height={120} role="img" aria-label={`Pipeline coverage ${ratio.toFixed(1)} times target`}>
          <g transform="translate(90,100)">
            <circle r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={0} opacity={0.35} />
            <circle r={radius} fill="none" stroke="hsl(var(--primary))" strokeWidth={stroke} strokeDasharray={`${filled} ${c-filled}`} strokeDashoffset={c*0.25} strokeLinecap="round" transform="rotate(-90)" />
            <text textAnchor="middle" y={-10} fontSize={20} fontWeight={600}>{ratio.toFixed(1)}x</text>
            <text textAnchor="middle" y={12} fontSize={10} className="uppercase tracking-wide fill-[hsl(var(--muted-foreground))]">Coverage</text>
          </g>
        </svg>
        <p className="text-[11px] text-muted-foreground mt-2">{coverage.pipeline.toLocaleString()} / {coverage.target.toLocaleString()} target</p>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">Goal ≥ 3x; arc scales until 3x.</p>
    </div>
  );
}
