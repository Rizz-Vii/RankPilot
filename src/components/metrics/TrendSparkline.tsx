"use client";
import React, { useMemo } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface TrendSparklineProps {
  data: Array<number>;
  stroke?: string;
  positiveColor?: string;
  negativeColor?: string;
  width?: number | string;
  height?: number;
}

export function TrendSparkline({
  data,
  stroke = "hsl(var(--primary))",
  positiveColor = "hsl(var(--emerald-500))",
  negativeColor = "hsl(var(--rose-500))",
  width = "100%",
  height = 48,
}: TrendSparklineProps) {
  const points = useMemo(() => data.map((v, i) => ({ i, v })), [data]);
  const first = data[0];
  const last = data[data.length - 1];
  const up = last >= first;

  return (
    <ResponsiveContainer
      width={width}
      height={height}
      className="overflow-visible"
    >
      <LineChart
        data={points}
        margin={{ top: 6, bottom: 2, left: 0, right: 0 }}
      >
        <Line
          type="monotone"
          dataKey="v"
          stroke={up ? positiveColor : negativeColor}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
