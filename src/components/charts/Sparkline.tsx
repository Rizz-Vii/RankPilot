"use client";
import React from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
  className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 120,
  height = 32,
  stroke = 'hsl(var(--primary))',
  strokeWidth = 2,
  className,
}) => {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(1, max - min);
  const step = width / Math.max(1, data.length - 1);
  const points = data
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');
  const last = data[data.length - 1];
  const prev = data.length > 1 ? data[data.length - 2] : last;
  const up = last >= prev;
  return (
    <div className={className} aria-label="trend sparkline">
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points && (
          <circle
            r={3}
            fill={stroke}
            cx={step * (data.length - 1)}
            cy={height - ((last - min) / range) * height}
          />
        )}
      </svg>
      <div className="mt-1 text-[10px] font-medium flex items-center gap-1 text-muted-foreground">
        <span>{last}</span>
        <span className={up ? 'text-green-600' : 'text-red-600'}>
          {up ? '▲' : '▼'}
        </span>
      </div>
    </div>
  );
};
