"use client";
/**
 * Enhanced Dashboard Builder with D3.js Visualizations
 * Integrates Priority 2 Enterprise Features from DevReady Phase 3
 *
 * Features:
 * - D3.js visualization engine integration
 * - Advanced chart export capabilities
 * - Real-time data binding and updates
 * - Professional report generation
 * - Custom dashboard layouts
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExportButton } from '@/components/ui/ExportButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
    BatchExportConfig
} from '@/lib/visualizations/chart-export-manager';
import {
    chartExportManager
} from '@/lib/visualizations/chart-export-manager';
import type {
    ChartConfig,
    ChartDataPoint
} from '@/lib/visualizations/d3-visualization-engine';
import {
    d3VisualizationEngine
} from '@/lib/visualizations/d3-visualization-engine';
import {
    ArrowUpDown,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    Download,
    Edit,
    Eye,
    FileText,
    LineChart,
    PieChart,
    Plus,
    Save,
    ScatterChart,
    Settings,
    Share2,
    Trash2,
    TrendingUp,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
// NOTE: Server-side canonical dashboard types live in lib/dashboard/custom-dashboard-builder.
// We intentionally alias them to avoid clashing with the legacy builder shapes below.
// Follow-up: unify these (client) widget shapes with server `DashboardWidget` subset (dataSource, visualization, styling, permissions) via a thin mapper.
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { DashboardWidget as ServerDashboardWidget } from '@/lib/dashboard/custom-dashboard-builder';
import { mergeServerWidget, serverToClientWidget, toServerCreate, toServerMutation } from '@/lib/dashboard/widget-mapping';
import { toast as sonnerToast } from 'sonner';
// Shared safe error message extractor (mirrors server util pattern)
const errMsg = (e: unknown): string => {
    if (typeof e === 'string') return e;
    if (e && typeof e === 'object' && 'message' in e) {
        const msg = (e as { message?: unknown }).message;
        if (typeof msg === 'string') return msg;
    }
    return 'Unknown error';
};

// Legacy client widget (will be converged into server shape). Kept minimal for current UI interactions.
export interface DashboardWidget {
    id: string;
    // server authoritative id (set when persisted/hydrated)
    serverId?: string;
    type: 'chart' | 'metric' | 'text' | 'table';
    title: string;
    chartConfig?: ChartConfig;
    data?: ChartDataPoint[];
    position: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    config: {
        refreshInterval?: number;
        autoUpdate?: boolean;
        exportEnabled?: boolean;
        interactivity?: boolean;
    };
}

// Legacy client layout (distinct from server layout until convergence work lands)
export interface DashboardLayout {
    id: string;
    name: string;
    description?: string;
    widgets: DashboardWidget[];
    settings: {
        theme: 'light' | 'dark' | 'auto';
        exportOptions: BatchExportConfig;
        refreshInterval: number;
        autoSave: boolean;
    };
    created: Date;
    updated: Date;
}

interface VisualizationDashboardBuilderProps {
    initialLayout?: DashboardLayout;
    onSave?: (layout: DashboardLayout) => void;
    onExport?: (format: string, data: unknown) => void;
    readOnly?: boolean;
}

export const VisualizationDashboardBuilder: React.FC<VisualizationDashboardBuilderProps> = ({
    initialLayout,
    onSave,
    onExport,
    readOnly = false
}) => {
    const [layout, setLayout] = useState<DashboardLayout>(
        initialLayout || createDefaultLayout()
    );
    // remote dashboard id (set after first successful server create)
    const [serverDashboardId, setServerDashboardId] = useState<string | null>(null);
    // const [persisting, setPersisting] = useState(false); // reserved for future persistence spinner
    // Initialize server dashboard id from localStorage if present
    useEffect(() => {
        try {
            const cached = (typeof window !== 'undefined') ? localStorage.getItem('serverDashboardId') : null;
            if (cached) setServerDashboardId(cached);
        } catch {}
    }, []);
    // Hydrate server dashboard widgets when id available
    useEffect(() => {
        if (!serverDashboardId) return;
        let cancelled = false;
        function hydrate(): void {
            try {
                const token = (typeof window !== 'undefined') ? localStorage.getItem('authToken') : null;
                if (!token) return;
                void fetch('/api/dashboard/custom?action=dashboards', { headers: { 'Authorization': `Bearer ${token}` } })
                    .then(res => {
                        if (!res.ok) return null;
                        return res.json();
                    })
                    .then(json => {
                        if (!json) return;
                        const dashboardsUnknown: unknown = json?.dashboards;
                        const dashboards: Array<{ id: string; widgets?: ServerDashboardWidget[] }> = Array.isArray(dashboardsUnknown)
                            ? dashboardsUnknown.filter(d => d && typeof d === 'object' && 'id' in d) as Array<{ id: string; widgets?: ServerDashboardWidget[] }>
                            : [];
                        const serverDash = dashboards.find(d => d.id === serverDashboardId);
                        if (!serverDash || cancelled) return;
                        const serverWidgets: ServerDashboardWidget[] = serverDash.widgets || [];
                        setLayout(prev => {
                            const existing = new Set(prev.widgets.map(w => w.serverId || w.id));
                            const additions = serverWidgets.filter(sw => !existing.has(sw.id)).map(sw => serverToClientWidget(sw));
                            if (additions.length === 0) return prev;
                            return { ...prev, widgets: [...prev.widgets, ...additions], updated: new Date() };
                        });
                    })
                    .catch(() => { /* silent */ });
            } catch { /* silent */ }
        }
        hydrate();
        return () => { cancelled = true; };
    }, [serverDashboardId]);
    const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const chartRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [sampleData, setSampleData] = useState<Map<string, ChartDataPoint[]>>(new Map());
    type TableSortBy = 'metric' | 'value' | 'change';
    type TableDirection = 'asc' | 'desc';
    type TableRowType = { metric: string; value: string; change: string };
    const [tableState, setTableState] = useState<Map<string, { sortBy: TableSortBy; direction: TableDirection; page: number; pageSize: number }>>(new Map());
    const [tableData, setTableData] = useState<Map<string, { rows: TableRowType[]; total: number; loading: boolean; error?: string }>>(new Map());

    // Initialize sample data
    useEffect(() => {
        const data = new Map<string, ChartDataPoint[]>();

        // Sample line chart data
        data.set('line', [
            { x: '2024-01', y: 100, series: 'Revenue' },
            { x: '2024-02', y: 150, series: 'Revenue' },
            { x: '2024-03', y: 120, series: 'Revenue' },
            { x: '2024-04', y: 180, series: 'Revenue' },
            { x: '2024-05', y: 200, series: 'Revenue' },
            { x: '2024-01', y: 80, series: 'Costs' },
            { x: '2024-02', y: 110, series: 'Costs' },
            { x: '2024-03', y: 90, series: 'Costs' },
            { x: '2024-04', y: 140, series: 'Costs' },
            { x: '2024-05', y: 160, series: 'Costs' }
        ]);

        // Sample bar chart data
        data.set('bar', [
            { x: 'Q1', y: 250000 },
            { x: 'Q2', y: 340000 },
            { x: 'Q3', y: 290000 },
            { x: 'Q4', y: 420000 }
        ]);

        // Sample pie chart data
        data.set('pie', [
            { label: 'Organic Search', value: 45, x: 0, y: 45 },
            { label: 'Paid Search', value: 25, x: 1, y: 25 },
            { label: 'Social Media', value: 15, x: 2, y: 15 },
            { label: 'Direct', value: 10, x: 3, y: 10 },
            { label: 'Referral', value: 5, x: 4, y: 5 }
        ]);

        // Sample scatter plot data
        data.set('scatter', [
            { x: 10, y: 20, size: 5, category: 'A' },
            { x: 15, y: 25, size: 8, category: 'B' },
            { x: 20, y: 15, size: 6, category: 'A' },
            { x: 25, y: 30, size: 10, category: 'C' },
            { x: 30, y: 35, size: 7, category: 'B' },
            { x: 35, y: 25, size: 9, category: 'C' }
        ]);

        setSampleData(data);
    }, []);

    const renderChart = useCallback((widget: DashboardWidget) => {
        if (!widget.chartConfig) return;

        const chartElement = chartRefs.current.get(widget.id);
        if (!chartElement) return;

        // Get sample data for chart type
        const data = sampleData.get(widget.chartConfig.type) || [];

        // Update chart config with current data
        const config: ChartConfig = {
            ...widget.chartConfig,
            data: data,
            id: widget.id
        };

        try {
            // Clear previous chart
            chartElement.innerHTML = '';
            chartElement.id = `chart-${widget.id}`;

            // Render new chart
            switch (config.type) {
                case 'line':
                    d3VisualizationEngine.createLineChart(`chart-${widget.id}`, config);
                    break;
                case 'bar':
                    d3VisualizationEngine.createBarChart(`chart-${widget.id}`, config);
                    break;
                case 'pie':
                    d3VisualizationEngine.createPieChart(`chart-${widget.id}`, config);
                    break;
                case 'scatter':
                    d3VisualizationEngine.createScatterPlot(`chart-${widget.id}`, config);
                    break;
                case 'heatmap':
                    d3VisualizationEngine.createHeatmap(`chart-${widget.id}`, config);
                    break;
            }
        } catch (error) {
            console.error('Failed to render chart:', error);
            try { sonnerToast.error('Render failed', { description: errMsg(error) }); } catch {}
            chartElement.innerHTML = `<div class=\"p-4 text-destructive-foreground\">Error rendering chart: ${String(error)}</div>`;
        }
    }, [sampleData]);

    // Render charts when widgets or sample data change (renderChart declared above)
    useEffect(() => {
        layout.widgets.forEach(widget => {
            if (widget.type === 'chart' && widget.chartConfig) {
                const chartElement = chartRefs.current.get(widget.id);
                if (chartElement) renderChart(widget);
            }
        });
    }, [layout.widgets, sampleData, renderChart]);

    const addWidget = (type: DashboardWidget['type']) => {
        const newWidget: DashboardWidget = {
            id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
            position: {
                x: 0,
                y: layout.widgets.length * 200,
                width: 400,
                height: 300
            },
            config: {
                refreshInterval: 60000,
                autoUpdate: true,
                exportEnabled: true,
                interactivity: true
            }
        };

        if (type === 'chart') {
            newWidget.chartConfig = {
                id: newWidget.id,
                type: 'line',
                width: 400,
                height: 300,
                margin: { top: 20, right: 20, bottom: 40, left: 40 },
                data: [],
                options: {
                    title: 'Sample Chart',
                    animations: true,
                    interactive: true,
                    tooltip: true,
                    legend: true,
                    grid: true
                },
                styling: {
                    colorScheme: 'brand',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 12
                }
            };
        }

        setLayout(prev => ({
            ...prev,
            widgets: [...prev.widgets, newWidget],
            updated: new Date()
        }));

        setSelectedWidget(newWidget.id);

        // Fire-and-forget remote persistence (best-effort) after state update
    void (async () => {
            try {
                // Acquire auth token (heuristic); if absent skip persistence silently.
                const token = (typeof window !== 'undefined') ? localStorage.getItem('authToken') : null;
                if (!token) return;
                // Ensure dashboard exists server-side
        const dashId = await ensureServerDashboard(token);
        if (dashId && !serverDashboardId) setServerDashboardId(dashId);
                if (!dashId) return;
                const serverInput = toServerCreate(newWidget);
                const pos = newWidget.position;
                await fetch('/api/dashboard/custom', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ action: 'update', dashboardId: dashId, widgetConfig: serverInput, position: { x: pos.x, y: pos.y, width: pos.width, height: pos.height } })
                }).then(r => r.json()).then(json => {
                    if (json?.widget?.id) {
                        // Optionally merge back server authoritative fields
                        setLayout(prev => ({
                            ...prev,
                            widgets: prev.widgets.map(w => w.id === newWidget.id ? mergeServerWidget(w, json.widget) : w)
                        }));
                    }
                }).catch(() => { /* silent degrade */ });
            } catch { /* ignore */ }
        })();
    };

    // Table helpers
    const getDefaultTableState = useCallback((): { sortBy: TableSortBy; direction: TableDirection; page: number; pageSize: number } => ({ sortBy: 'metric', direction: 'asc', page: 0, pageSize: 5 }), []);

    // Removed unused table helper functions previously defined here (cleanup for lint).

    const handleSort = (widgetId: string, column: 'metric' | 'value' | 'change') => {
        setTableState(prev => {
            const next = new Map(prev);
            const current = next.get(widgetId) || getDefaultTableState();
            const direction: 'asc' | 'desc' = current.sortBy === column && current.direction === 'asc' ? 'desc' : 'asc';
            next.set(widgetId, { ...current, sortBy: column, direction, page: 0 });
            return next;
        });
    };

    const handlePageChange = (widgetId: string, delta: number, totalPages: number) => {
        setTableState(prev => {
            const next = new Map(prev);
            const current = next.get(widgetId) || getDefaultTableState();
            const newPage = Math.max(0, Math.min(current.page + delta, Math.max(0, totalPages - 1)));
            next.set(widgetId, { ...current, page: newPage });
            return next;
        });
    };

    const handlePageSizeChange = (widgetId: string, pageSize: number) => {
        setTableState(prev => {
            const next = new Map(prev);
            const current = next.get(widgetId) || getDefaultTableState();
            next.set(widgetId, { ...current, pageSize, page: 0 });
            return next;
        });
    };

    // Build query string for server API
    const buildTableQuery = useCallback((widgetId: string, state: { sortBy: TableSortBy; direction: TableDirection; page: number; pageSize: number }, opts?: { all?: boolean; format?: 'json' | 'csv' }) => {
        const params = new URLSearchParams();
        params.set('widgetId', widgetId);
        params.set('sortBy', state.sortBy);
        params.set('direction', state.direction);
        params.set('page', String(state.page));
        params.set('pageSize', String(state.pageSize));
        if (opts?.all) params.set('all', '1');
        if (opts?.format) params.set('format', opts.format);
        return params.toString();
    }, []);

    // Fetch server-side table data for all table widgets when relevant state changes
    const widgetsKey = React.useMemo(() => layout.widgets.map(w => `${w.id}:${w.type}`).join('|'), [layout.widgets]);
    useEffect(() => {
        const controllers: AbortController[] = [];
        const widgets = layout.widgets.filter(w => w.type === 'table');
        widgets.forEach(w => {
            const state = tableState.get(w.id) || getDefaultTableState();
            const controller = new AbortController();
            controllers.push(controller);
            // set loading
            setTableData(prev => {
                const next = new Map(prev);
                const curr = next.get(w.id);
                next.set(w.id, { rows: curr?.rows || [], total: curr?.total || 0, loading: true, error: undefined });
                return next;
            });
            fetch(`/api/table-data?${buildTableQuery(w.id, state)}`, { signal: controller.signal })
                .then(async (res) => {
                    if (!res.ok) throw new Error(`Failed to load table data (${res.status})`);
                    const json = await res.json();
                    setTableData(prev => {
                        const next = new Map(prev);
                        next.set(w.id, { rows: json.rows as TableRowType[], total: json.total as number, loading: false, error: undefined });
                        return next;
                    });
                })
                .catch(err => {
                    if (controller.signal.aborted) return;
                    console.error('Table data fetch error', err);
                    try { sonnerToast.error('Failed to load table data', { description: errMsg(err) }); } catch {}
                    setTableData(prev => {
                        const next = new Map(prev);
                        const curr = next.get(w.id);
                        next.set(w.id, { rows: curr?.rows || [], total: curr?.total || 0, loading: false, error: errMsg(err) });
                        return next;
                    });
                });
        });
        return () => controllers.forEach(c => c.abort());
    }, [widgetsKey, tableState, buildTableQuery, getDefaultTableState, layout.widgets]);

    const updateWidget = (widgetId: string, updates: Partial<DashboardWidget>) => {
        setLayout(prev => ({
            ...prev,
            widgets: prev.widgets.map(widget =>
                widget.id === widgetId ? { ...widget, ...updates } : widget
            ),
            updated: new Date()
        }));

        // Remote mutation best-effort
    void (async () => {
            try {
                const token = (typeof window !== 'undefined') ? localStorage.getItem('authToken') : null;
                if (!token) return;
                if (!serverDashboardId) return; // only persist if dashboard created
                const current = layout.widgets.find(w => w.id === widgetId);
                if (!current) return;
                const serverMutation = toServerMutation(current, updates);
                if (Object.keys(serverMutation).length === 0) return;
                await fetch('/api/dashboard/custom', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ action: 'update', dashboardId: serverDashboardId, updates: { widgetId, ...serverMutation } })
                });
            } catch { /* ignore */ }
        })();
    };

    const deleteWidget = (widgetId: string) => {
        setLayout(prev => ({
            ...prev,
            widgets: prev.widgets.filter(widget => widget.id !== widgetId),
            updated: new Date()
        }));

        if (selectedWidget === widgetId) {
            setSelectedWidget(null);
        }

        // Remove chart from D3 engine
        d3VisualizationEngine.removeChart(widgetId);

        // Remote deletion best-effort
        void (async () => {
            try {
                const token = (typeof window !== 'undefined') ? localStorage.getItem('authToken') : null;
                if (!token || !serverDashboardId) return;
                await fetch('/api/dashboard/custom', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ action: 'delete', dashboardId: serverDashboardId, updates: { widgetId } })
                });
            } catch { /* ignore */ }
        })();
    };

    const exportDashboard = async (format: 'pdf' | 'excel' | 'json') => {
        setIsExporting(true);

        try {
            const chartIds = layout.widgets
                .filter(widget => widget.type === 'chart')
                .map(widget => widget.id);

            if (chartIds.length === 0) {
                throw new Error('No charts to export');
            }

            let result: string;

            if (format === 'json') {
                // JSON export - handle separately without createBatch
                const exportData = {
                    layout,
                    metadata: {
                        exported: new Date().toISOString(),
                        version: '1.0.0',
                        chartCount: chartIds.length
                    }
                };
                const jsonString = JSON.stringify(exportData, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                result = URL.createObjectURL(blob);
            } else {
                // PDF/Excel export - use createBatch
                const batchId = chartExportManager.createBatch(chartIds, format, {
                    title: layout.name,
                    subtitle: layout.description,
                    author: 'RankPilot User',
                    company: 'RankPilot',
                    includeTimestamp: true,
                    watermark: true
                });

                if (format === 'pdf') {
                    result = await chartExportManager.exportBatchToPDF(batchId);
                } else {
                    result = await chartExportManager.exportBatchToExcel(batchId);
                }
            }

            // Trigger download
            const link = document.createElement('a');
            link.href = result;
            link.download = `dashboard_${layout.name}_${format}.${format === 'excel' ? 'xlsx' : format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            if (onExport) {
                onExport(format, result);
            }

        } catch (error) {
            console.error('Export failed:', error);
            try { sonnerToast.error('Dashboard export failed', { description: errMsg(error) }); } catch {}
        } finally {
            setIsExporting(false);
        }
    };

    const saveDashboard = () => {
        if (onSave) {
            onSave(layout);
        }
        // Attempt server create if not yet persisted
    void (async () => {
            try {
                const token = (typeof window !== 'undefined') ? localStorage.getItem('authToken') : null;
                if (!token || serverDashboardId) return;
        const id = await ensureServerDashboard(token);
        if (id) setServerDashboardId(id);
            } catch {/* ignore */}
        })();
    };

    const getChartIcon = (type: string) => {
        switch (type) {
            case 'line': return <LineChart className="w-4 h-4" />;
            case 'bar': return <BarChart3 className="w-4 h-4" />;
            case 'pie': return <PieChart className="w-4 h-4" />;
            case 'scatter': return <ScatterChart className="w-4 h-4" />;
            default: return <BarChart3 className="w-4 h-4" />;
        }
    };

    return (
    <div className="flex h-screen bg-background">
            {/* Sidebar */}
            {!isPreviewMode && !readOnly && (
                <div className="w-80 bg-background border-r border-border overflow-y-auto">
                    <div className="p-4 border-b border-border">
                        <h2 className="text-lg font-semibold text-foreground">Dashboard Builder</h2>
                        <p className="text-sm text-muted-foreground">Drag and drop to create visualizations</p>
                    </div>

                    <Tabs defaultValue="widgets" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mx-4 mt-4">
                            <TabsTrigger value="widgets">Widgets</TabsTrigger>
                            <TabsTrigger value="settings">Settings</TabsTrigger>
                        </TabsList>

                        <TabsContent value="widgets" className="p-4 space-y-4">
                            <div>
                                <Label className="text-sm font-medium">Add Widgets</Label>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addWidget('chart')}
                                        className="h-20 flex flex-col items-center justify-center"
                                    >
                                        <BarChart3 className="w-6 h-6 mb-1" />
                                        <span className="text-xs">Chart</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addWidget('metric')}
                                        className="h-20 flex flex-col items-center justify-center"
                                    >
                                        <TrendingUp className="w-6 h-6 mb-1" />
                                        <span className="text-xs">Metric</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addWidget('text')}
                                        className="h-20 flex flex-col items-center justify-center"
                                    >
                                        <FileText className="w-6 h-6 mb-1" />
                                        <span className="text-xs">Text</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addWidget('table')}
                                        className="h-20 flex flex-col items-center justify-center"
                                    >
                                        <Settings className="w-6 h-6 mb-1" />
                                        <span className="text-xs">Table</span>
                                    </Button>
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <Label className="text-sm font-medium">Current Widgets</Label>
                                <div className="space-y-2 mt-2">
                                    {layout.widgets.map(widget => (
                                        <div
                                            key={widget.id}
                                            className={`p-2 border rounded-lg cursor-pointer ${selectedWidget === widget.id
                                                ? 'border-primary/50 bg-primary/10'
                                                : 'border-border hover:border-border'
                                                }`}
                                            onClick={() => setSelectedWidget(widget.id)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    {widget.type === 'chart' && widget.chartConfig &&
                                                        getChartIcon(widget.chartConfig.type)
                                                    }
                                                    <span className="text-sm font-medium">{widget.title}</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedWidget(widget.id);
                                                        }}
                                                    >
                                                        <Edit className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteWidget(widget.id);
                                                        }}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <Badge variant="secondary" className="text-xs mt-1">
                                                {widget.type}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {selectedWidget && (
                                <>
                                    <Separator />
                                    <div>
                                        <Label className="text-sm font-medium">Widget Properties</Label>
                                        <WidgetPropertiesPanel
                                            widget={layout.widgets.find(w => w.id === selectedWidget)!}
                                            onUpdate={(updates) => updateWidget(selectedWidget, updates)}
                                        />
                                    </div>
                                </>
                            )}
                        </TabsContent>

                        <TabsContent value="settings" className="p-4 space-y-4">
                            <div>
                                <Label htmlFor="dashboard-name" className="text-sm font-medium">Dashboard Name</Label>
                                <Input
                                    id="dashboard-name"
                                    value={layout.name}
                                    onChange={(e) => setLayout(prev => ({ ...prev, name: e.target.value }))}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="dashboard-description" className="text-sm font-medium">Description</Label>
                                <Input
                                    id="dashboard-description"
                                    value={layout.description || ''}
                                    onChange={(e) => setLayout(prev => ({ ...prev, description: e.target.value }))}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label className="text-sm font-medium">Theme</Label>
                                <Select
                                    value={layout.settings.theme}
                                    onValueChange={(value: 'light' | 'dark' | 'auto') =>
                                        setLayout(prev => ({
                                            ...prev,
                                            settings: { ...prev.settings, theme: value }
                                        }))
                                    }
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="light">Light</SelectItem>
                                        <SelectItem value="dark">Dark</SelectItem>
                                        <SelectItem value="auto">Auto</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center justify-between">
                                <Label htmlFor="auto-save" className="text-sm font-medium">Auto Save</Label>
                                <Switch
                                    id="auto-save"
                                    checked={layout.settings.autoSave}
                                    onCheckedChange={(checked) =>
                                        setLayout(prev => ({
                                            ...prev,
                                            settings: { ...prev.settings, autoSave: checked }
                                        }))
                                    }
                                />
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="bg-background border-b border-border p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold text-foreground">{layout.name}</h1>
                            {layout.description && (
                                <p className="text-sm text-muted-foreground">{layout.description}</p>
                            )}
                        </div>

                        <div className="flex items-center space-x-2">
                            {!readOnly && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        {isPreviewMode ? 'Edit' : 'Preview'}
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => { saveDashboard(); }}
                                    >
                                        <Save className="w-4 h-4 mr-2" />
                                        Save
                                    </Button>
                                </>
                            )}

                            <div className="flex items-center space-x-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => { void exportDashboard('pdf'); }}
                                    disabled={isExporting}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    PDF
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => { void exportDashboard('excel'); }}
                                    disabled={isExporting}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Excel
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => { void exportDashboard('json'); }}
                                    disabled={isExporting}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    JSON
                                </Button>
                            </div>

                            <Button variant="outline" size="sm">
                                <Share2 className="w-4 h-4 mr-2" />
                                Share
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Dashboard Canvas */}
                <div className="flex-1 p-4 overflow-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {layout.widgets.map(widget => (
                            <Card
                                key={widget.id}
                                className={`${selectedWidget === widget.id && !isPreviewMode
                                    ? 'ring-2 ring-primary'
                                    : ''
                                    }`}
                                onClick={() => !isPreviewMode && setSelectedWidget(widget.id)}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
                                        {widget.type === 'chart' && (
                                            <div className="flex items-center gap-2">
                                                <ExportButton
                                                    chartId={widget.id}
                                                    format="png"
                                                    label="PNG"
                                                    onDone={(url) => {
                                                        try { sonnerToast.success('Chart export ready', { description: 'PNG generated' }); } catch {}
                                                        window.open(url, '_blank', 'noopener,noreferrer');
                                                    }}
                                                />
                                                <ExportButton
                                                    chartId={widget.id}
                                                    format="pdf"
                                                    label="PDF"
                                                    onDone={(url) => {
                                                        try { sonnerToast.success('Chart export ready', { description: 'PDF generated' }); } catch {}
                                                        window.open(url, '_blank', 'noopener,noreferrer');
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {widget.type === 'chart' ? (
                                        <div
                                            ref={(el) => {
                                                if (el) {
                                                    chartRefs.current.set(widget.id, el);
                                                    // Render chart after ref is set
                                                    setTimeout(() => renderChart(widget), 0);
                                                }
                                            }}
                                            className="w-full h-64"
                                        />
                                    ) : widget.type === 'metric' ? (
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-primary">1,234</div>
                                            <div className="text-sm text-muted-foreground">Sample Metric</div>
                                        </div>
                                    ) : widget.type === 'text' ? (
                                        <div className="text-sm text-muted-foreground">
                                            This is a sample text widget. You can add any content here.
                                        </div>
                                    ) : (
                                        <div className="text-sm">
                                            {(() => {
                                                const state = tableState.get(widget.id) || getDefaultTableState();
                                                const data = tableData.get(widget.id) || { rows: [], total: 0, loading: false };
                                                const totalPages = Math.max(1, Math.ceil((data.total || 0) / state.pageSize));
                                                return (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className="text-xs text-muted-foreground">
                                                                    {data.loading ? 'Loading…' : `${data.total} items • Page ${state.page + 1} of ${totalPages}`}
                                                                </div>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        const qs = buildTableQuery(widget.id, state, { all: true, format: 'csv' });
                                                                        const url = `/api/table-data?${qs}`;
                                                                        window.open(url, '_blank', 'noopener,noreferrer');
                                                                    }}
                                                                    className="h-8"
                                                                    title="Download CSV"
                                                                >
                                                                    <Download className="h-4 w-4 mr-1" /> CSV
                                                                </Button>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Select value={String(state.pageSize)} onValueChange={(v) => handlePageSizeChange(widget.id, parseInt(v))}>
                                                                    <SelectTrigger className="h-8 w-[110px]">
                                                                        <SelectValue placeholder="Rows" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="5">5 / page</SelectItem>
                                                                        <SelectItem value="10">10 / page</SelectItem>
                                                                        <SelectItem value="20">20 / page</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                <div className="flex items-center">
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePageChange(widget.id, -1, totalPages)} disabled={state.page === 0 || data.loading}>
                                                                        <ChevronLeft className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePageChange(widget.id, 1, totalPages)} disabled={state.page >= totalPages - 1 || data.loading}>
                                                                        <ChevronRight className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort(widget.id, 'metric')}>
                                                                        <div className="flex items-center gap-1">Metric <ArrowUpDown className="h-3.5 w-3.5" /></div>
                                                                    </TableHead>
                                                                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort(widget.id, 'value')}>
                                                                        <div className="flex items-center gap-1">Value <ArrowUpDown className="h-3.5 w-3.5" /></div>
                                                                    </TableHead>
                                                                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort(widget.id, 'change')}>
                                                                        <div className="flex items-center gap-1">Change <ArrowUpDown className="h-3.5 w-3.5" /></div>
                                                                    </TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {(data.rows || []).map((row, idx) => (
                                                                    <TableRow key={idx}>
                                                                        <TableCell>{row.metric}</TableCell>
                                                                        <TableCell>{row.value}</TableCell>
                                                                        <TableCell className={(row.change.startsWith('-') ? 'text-destructive-foreground' : 'text-success-foreground')}>
                                                                            {row.change}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}

                        {layout.widgets.length === 0 && (
                            <div className="col-span-full text-center py-12">
                                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-foreground mb-2">No widgets yet</h3>
                                <p className="text-muted-foreground mb-4">Add your first widget to get started</p>
                                {!readOnly && (
                                    <Button onClick={() => addWidget('chart')}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Chart
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Widget Properties Panel Component
interface WidgetPropertiesPanelProps {
    widget: DashboardWidget;
    onUpdate: (updates: Partial<DashboardWidget>) => void;
}

// Minimal inline properties panel (placeholder until unified with server types)
const WidgetPropertiesPanel: React.FC<WidgetPropertiesPanelProps> = ({ widget, onUpdate }) => {
    return (
        <div className="mt-2 space-y-3">
            <div>
                <Label className="text-xs uppercase tracking-wide">Title</Label>
                <Input value={widget.title} onChange={e => onUpdate({ title: e.target.value })} className="mt-1 h-8 text-sm" />
            </div>
            <div>
                <Label className="text-xs uppercase tracking-wide">Type</Label>
                <Select value={widget.type} onValueChange={(val: DashboardWidget['type']) => onUpdate({ type: val })}>
                    <SelectTrigger className="h-8 text-sm" />
                    <SelectContent>
                        <SelectItem value="chart">Chart</SelectItem>
                        <SelectItem value="metric">Metric</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="table">Table</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {widget.type === 'chart' && (
                <div>
                    <Label className="text-xs uppercase tracking-wide">Chart Type</Label>
                    <Select value={widget.chartConfig?.type || 'line'} onValueChange={(val: ChartConfig['type']) => onUpdate({ chartConfig: { id: widget.chartConfig?.id || `chart_${widget.id}`, width: widget.chartConfig?.width || 400, height: widget.chartConfig?.height || 300, margin: widget.chartConfig?.margin || { top: 10, right: 10, bottom: 30, left: 40 }, data: widget.chartConfig?.data || [], options: widget.chartConfig?.options || {}, styling: widget.chartConfig?.styling || {}, type: val } })}>
                        <SelectTrigger className="h-8 text-sm" />
                        <SelectContent>
                            <SelectItem value="line">Line</SelectItem>
                            <SelectItem value="bar">Bar</SelectItem>
                            <SelectItem value="pie">Pie</SelectItem>
                            <SelectItem value="scatter">Scatter</SelectItem>
                            <SelectItem value="heatmap">Heatmap</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
    );
};

// Helper function to create default layout
function createDefaultLayout(): DashboardLayout {
    return {
        id: `dashboard_${Date.now()}`,
        name: 'New Dashboard',
        description: 'Created with RankPilot Dashboard Builder',
        widgets: [],
        settings: {
            theme: 'light',
            exportOptions: {
                title: 'Dashboard Export',
                author: 'RankPilot User',
                includeTimestamp: true,
                watermark: true
            },
            refreshInterval: 60000,
            autoSave: true
        },
        created: new Date(),
        updated: new Date()
    };
}

// Ensure dashboard exists server-side; creates once and caches id.
async function ensureServerDashboard(token: string): Promise<string | null> {
    try {
        // Simple in-memory cache (closure-level variable could be used; relying on localStorage for simplicity)
        const cached = (typeof window !== 'undefined') ? localStorage.getItem('serverDashboardId') : null;
        if (cached) return cached;
        const name = 'My Dashboard';
        const res = await fetch('/api/dashboard/custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ action: 'create', name })
        });
        if (!res.ok) return null;
        const json = await res.json();
        const id = json?.dashboard?.id;
        if (id && typeof window !== 'undefined') localStorage.setItem('serverDashboardId', id);
        return id || null;
    } catch {
        return null;
    }
}

export default VisualizationDashboardBuilder;
