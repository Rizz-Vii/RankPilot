import type { DashboardWidget as ClientWidget } from '@/components/dashboard/VisualizationDashboardBuilder';
import type { DashboardWidget as ServerDashboardWidget } from '@/lib/dashboard/custom-dashboard-builder';
import type { WidgetCreateInput, WidgetMutation } from '@/types/dashboard-widget-mutation';

type WidgetType = ClientWidget['type'];
type ChartType = 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap';

// Map client widget -> server create input (initial minimal subset)
export function toServerCreate(widget: ClientWidget): WidgetCreateInput {
    return {
        type: widget.type as WidgetType,
        title: widget.title,
        dataSource: { type: 'custom', query: widget.id },
        visualization: widget.chartConfig ? {
            chartType: widget.chartConfig.type as ChartType,
            showLegend: true,
            showGrid: true,
            customConfig: {}
        } : undefined,
        styling: widget.chartConfig ? {
            // Use design tokens instead of raw hex codes
            backgroundColor: 'var(--color-surface-base)',
            borderColor: 'var(--color-border-subtle)',
            borderRadius: 8,
            padding: 16,
            fontSize: 12,
            fontFamily: widget.chartConfig.styling?.fontFamily
        } : undefined,
        permissions: { viewRoles: ['viewer', 'editor', 'admin'], editRoles: ['editor', 'admin'], exportAccess: true }
    };
}

// Map client updates -> server mutation subset
export function toServerMutation(_widget: ClientWidget, updates: Partial<ClientWidget>): WidgetMutation {
    const m: WidgetMutation = {};
    if (updates.title) m.title = updates.title;
    if (updates.chartConfig) m.visualization = { chartType: updates.chartConfig.type as ChartType };
    return m;
}

// Merge server authoritative fields back into existing client widget (non-destructive)
export function mergeServerWidget(client: ClientWidget, server: ServerDashboardWidget): ClientWidget {
    return {
        ...client,
        serverId: server.id || client.serverId,
        title: server.title || client.title,
        type: (server.type as WidgetType) || client.type,
        chartConfig: client.chartConfig ? { ...client.chartConfig, type: (server.visualization?.chartType as ChartType) || client.chartConfig.type } : client.chartConfig
    };
}

// Convert a server widget into a client widget shape (baseline hydration)
export function serverToClientWidget(server: ServerDashboardWidget): ClientWidget {
    const isChart = !!server.visualization?.chartType && ['line', 'bar', 'pie', 'scatter', 'heatmap'].includes(server.visualization.chartType as string);
    return {
        id: server.id, // use server id as client id for hydrated widgets
        serverId: server.id,
        type: (server.type === 'iframe' || server.type === 'map') ? 'text' as WidgetType : (server.type as WidgetType),
        title: server.title,
        position: server.position || { x: 0, y: 0, width: 400, height: 300 },
        config: { exportEnabled: true, interactivity: true },
        chartConfig: isChart ? {
            id: server.id,
            type: server.visualization!.chartType as ChartType,
            width: server.position?.width || 400,
            height: server.position?.height || 300,
            margin: { top: 20, right: 20, bottom: 40, left: 40 },
            data: [],
            options: {
                legend: server.visualization?.showLegend,
                grid: server.visualization?.showGrid,
                title: server.title
            },
            styling: {
                fontFamily: server.styling?.fontFamily || 'Inter, sans-serif',
                fontSize: server.styling?.fontSize || 12,
                colorScheme: server.visualization?.colorScheme || 'brand'
            }
        } : undefined
    } as ClientWidget;
}
