"use client";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSalesContext } from "./sales-context";

interface FunnelEntry {
  stage: string;
  count: number;
  conversion?: number | string | null;
  [key: string]: unknown;
}
interface Props {
  onStageClick?: (stage: string) => void;
}
type ChartClickParam = { payload?: FunnelEntry } | FunnelEntry;
export default function FunnelStageConversion({
  onStageClick,
}: Props): JSX.Element {
  const { data } = useSalesContext();
  const funnel: FunnelEntry[] = data?.funnel || [];
  return (
    <div className="rounded-xl border p-4 bg-gradient-to-br from-background to-muted/30 h-[260px] flex flex-col">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Stage Conversion Funnel
      </h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={funnel}
            layout="vertical"
            margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
          >
            <XAxis
              type="number"
              hide
              domain={[0, (dataMax: number) => dataMax * 1.1]}
            />
            <YAxis
              type="category"
              dataKey="stage"
              width={24}
              tick={{ fontSize: 10 }}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted)/0.4)" }}
              labelStyle={{ fontSize: 12 }}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar
              dataKey="count"
              radius={4}
              fill="hsl(var(--primary)/0.3)"
              onClick={(d: ChartClickParam) => {
                const payload =
                  (d as { payload?: FunnelEntry }).payload ??
                  (d as FunnelEntry | undefined);
                const stage = payload?.stage;
                if (onStageClick && typeof stage === "string")
                  onStageClick(stage);
              }}
              cursor={onStageClick ? "pointer" : "default"}
            >
              <LabelList
                dataKey="conversion"
                position="right"
                formatter={(label: React.ReactNode) => {
                  const v =
                    typeof label === "number" || typeof label === "string"
                      ? label
                      : "";
                  return `${String(v ?? "")}%`;
                }}
                className="text-[10px] fill-current"
              />
              {funnel.map((f: FunnelEntry, i: number) => (
                <Cell
                  key={f?.stage ?? i}
                  fill={`hsl(var(--primary)/${0.15 + 0.6 * (1 - i / funnel.length)})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Labels show % conversion to each stage.
      </p>
    </div>
  );
}
