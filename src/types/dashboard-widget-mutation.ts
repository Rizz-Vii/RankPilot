// Shared narrowed widget mutation types bridging client & server builders.
// Excludes immutable fields (id, position). Position handled separately in APIs.
import type { DashboardWidget } from '@/lib/dashboard/custom-dashboard-builder';

export type WidgetCreateInput = Partial<Pick<DashboardWidget,
    'type' | 'title' | 'dataSource' | 'visualization' | 'styling' | 'permissions'
>> & { type?: DashboardWidget['type']; title?: string };

export type WidgetMutation = Partial<Pick<DashboardWidget,
    'title' | 'dataSource' | 'visualization' | 'styling' | 'permissions'
>>;

// Lightweight sanitizers (no deep schema validation to keep perf + small bundle)
export function sanitizeWidgetCreate(input: unknown): WidgetCreateInput {
    const obj = (input && typeof input === 'object') ? input as Record<string, unknown> : {};
    const out: WidgetCreateInput = {};
    if (typeof obj.title === 'string') out.title = obj.title.slice(0, 120);
    if (typeof obj.type === 'string') out.type = obj.type as any;
    if (obj.dataSource && typeof obj.dataSource === 'object') out.dataSource = obj.dataSource as any;
    if (obj.visualization && typeof obj.visualization === 'object') out.visualization = obj.visualization as any;
    if (obj.styling && typeof obj.styling === 'object') out.styling = obj.styling as any;
    if (obj.permissions && typeof obj.permissions === 'object') out.permissions = obj.permissions as any;
    return out;
}

export function sanitizeWidgetMutation(input: unknown): WidgetMutation {
    const obj = (input && typeof input === 'object') ? input as Record<string, unknown> : {};
    const out: WidgetMutation = {};
    if (typeof obj.title === 'string') out.title = obj.title.slice(0, 120);
    if (obj.dataSource && typeof obj.dataSource === 'object') out.dataSource = obj.dataSource as any;
    if (obj.visualization && typeof obj.visualization === 'object') out.visualization = obj.visualization as any;
    if (obj.styling && typeof obj.styling === 'object') out.styling = obj.styling as any;
    if (obj.permissions && typeof obj.permissions === 'object') out.permissions = obj.permissions as any;
    return out;
}
