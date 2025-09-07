// Shared narrowed widget mutation types bridging client & server builders.
// Excludes immutable fields (id, position). Position handled separately in APIs.
import type { DashboardWidget } from "@/lib/dashboard/custom-dashboard-builder";

export type WidgetCreateInput = Partial<
  Pick<
    DashboardWidget,
    | "type"
    | "title"
    | "dataSource"
    | "visualization"
    | "styling"
    | "permissions"
  >
> & { type?: DashboardWidget["type"]; title?: string };

export type WidgetMutation = Partial<
  Pick<
    DashboardWidget,
    "title" | "dataSource" | "visualization" | "styling" | "permissions"
  >
>;

// Lightweight sanitizers (no deep schema validation to keep perf + small bundle)
export function sanitizeWidgetCreate(input: unknown): WidgetCreateInput {
  const obj =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};
  const out: WidgetCreateInput = {};
  if (typeof obj.title === "string") out.title = obj.title.slice(0, 120);
  // TODO:TRACKD-DEFER:typing refine type narrowing to concrete discriminated union for widget types
  if (typeof obj.type === "string")
    out.type = obj.type as DashboardWidget["type"];
  if (obj.dataSource && typeof obj.dataSource === "object")
    out.dataSource = obj.dataSource as unknown as DashboardWidget["dataSource"];
  if (obj.visualization && typeof obj.visualization === "object")
    out.visualization =
      obj.visualization as unknown as DashboardWidget["visualization"];
  if (obj.styling && typeof obj.styling === "object")
    out.styling = obj.styling as unknown as DashboardWidget["styling"];
  if (obj.permissions && typeof obj.permissions === "object")
    out.permissions =
      obj.permissions as unknown as DashboardWidget["permissions"];
  return out;
}

export function sanitizeWidgetMutation(input: unknown): WidgetMutation {
  const obj =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};
  const out: WidgetMutation = {};
  if (typeof obj.title === "string") out.title = obj.title.slice(0, 120);
  if (obj.dataSource && typeof obj.dataSource === "object")
    out.dataSource = obj.dataSource as unknown as DashboardWidget["dataSource"];
  if (obj.visualization && typeof obj.visualization === "object")
    out.visualization =
      obj.visualization as unknown as DashboardWidget["visualization"];
  if (obj.styling && typeof obj.styling === "object")
    out.styling = obj.styling as unknown as DashboardWidget["styling"];
  if (obj.permissions && typeof obj.permissions === "object")
    out.permissions =
      obj.permissions as unknown as DashboardWidget["permissions"];
  return out;
}
