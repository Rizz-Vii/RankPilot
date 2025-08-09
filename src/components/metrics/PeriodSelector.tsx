"use client";
import React from 'react';

interface PeriodSelectorProps {
  value: number; // months window
  onChange: (months: number) => void;
  options?: number[];
  className?: string;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({ value, onChange, options = [3,6,12], className }) => {
  return (
    <div className={"flex items-center gap-2 text-xs " + (className||"")}> 
      <span className="text-muted-foreground">Period:</span>
      <select
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="h-7 rounded-md border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        {options.map(o => <option key={o} value={o}>Last {o}m</option>)}
      </select>
    </div>
  );
};
