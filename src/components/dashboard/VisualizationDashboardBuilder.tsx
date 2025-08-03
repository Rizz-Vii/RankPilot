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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    BatchExportConfig,
    chartExportManager
} from '@/lib/visualizations/chart-export-manager';
import {
    ChartConfig,
    ChartDataPoint,
    d3VisualizationEngine
} from '@/lib/visualizations/d3-visualization-engine';
import {
    BarChart3,
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
    TrendingUp
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface DashboardWidget {
    id: string;
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
    onExport?: (format: string, _data: unknown) => void;
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
    const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const chartRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [sampleData, setSampleData] = useState<Map<string, ChartDataPoint[]>>(new Map());

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
            { label: 'Organic Search', _value: 45, x: 0, y: 45 },
            { label: 'Paid Search', _value: 25, x: 1, y: 25 },
            { label: 'Social Media', _value: 15, x: 2, y: 15 },
            { label: 'Direct', _value: 10, x: 3, y: 10 },
            { label: 'Referral', _value: 5, x: 4, y: 5 }
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

    // Render charts when widgets change
    useEffect(() => {
        layout.widgets.forEach(widget => {
            if (widget.type === 'chart' && widget.chartConfig) {
                const chartElement = chartRefs.current.get(widget.id);
                if (chartElement) {
                    renderChart(widget);
                }
            }
        });
    }, [layout.widgets, sampleData]);

    const renderChart = useCallback((widget: DashboardWidget) => {
        if (!widget.chartConfig) return;

        const chartElement = chartRefs.current.get(widget.id);
        if (!chartElement) return;

        // Get sample data for chart type
        const chartData = sampleData.get(widget.chartConfig.type) || [];

        // Update chart config with current data
        const config: ChartConfig = {
            ...widget.chartConfig,
            _data: chartData,
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
        } catch (_error) {
            console.error('Failed to render chart:', _error);
            chartElement.innerHTML = `<div class="p-4 text-red-500">Error rendering chart: ${_error}</div>`;
        }
    }, [sampleData]);

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
                _data: [],
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
    };

    const updateWidget = (widgetId: string, updates: Partial<DashboardWidget>) => {
        setLayout(prev => ({
            ...prev,
            widgets: prev.widgets.map(widget =>
                widget.id === widgetId ? { ...widget, ...updates } : widget
            ),
            updated: new Date()
        }));
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

            let result: string = '';

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

        } catch (_error) {
            console.error('Export failed:', _error);
        } finally {
            setIsExporting(false);
        }
    };

    const saveDashboard = () => {
        if (onSave) {
            onSave(layout);
        }
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
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            {!isPreviewMode && !readOnly && (
                <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
                    <div className="p-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Dashboard Builder</h2>
                        <p className="text-sm text-gray-500">Drag and drop to create visualizations</p>
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
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
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
                                    onValueChange={themeValue =>
                                        setLayout(prev => ({
                                            ...prev,
                                            settings: { ...prev.settings, theme: themeValue as 'light' | 'dark' | 'auto' }
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
                <div className="bg-white border-b border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">{layout.name}</h1>
                            {layout.description && (
                                <p className="text-sm text-gray-500">{layout.description}</p>
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
                                        onClick={saveDashboard}
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
                                    onClick={() => exportDashboard('pdf')}
                                    disabled={isExporting}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    PDF
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => exportDashboard('excel')}
                                    disabled={isExporting}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Excel
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => exportDashboard('json')}
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
                                    ? 'ring-2 ring-blue-500'
                                    : ''
                                    }`}
                                onClick={() => !isPreviewMode && setSelectedWidget(widget.id)}
                            >
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
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
                                            <div className="text-2xl font-bold text-blue-600">1,234</div>
                                            <div className="text-sm text-gray-500">Sample Metric</div>
                                        </div>
                                    ) : widget.type === 'text' ? (
                                        <div className="text-sm text-gray-600">
                                            This is a sample text widget. You can add any content here.
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500">
                                            Table widget placeholder
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}

                        {layout.widgets.length === 0 && (
                            <div className="col-span-full text-center py-12">
                                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No widgets yet</h3>
                                <p className="text-gray-500 mb-4">Add your first widget to get started</p>
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

const WidgetPropertiesPanel: React.FC<WidgetPropertiesPanelProps> = ({ widget, onUpdate }) => {
    return (
        <div className="space-y-3 mt-2">
            <div>
                <Label className="text-xs text-gray-500">Title</Label>
                <Input
                    value={widget.title}
                    onChange={(e) => onUpdate({ title: e.target.value })}
                    className="mt-1 text-sm"
                />
            </div>

            {widget.type === 'chart' && widget.chartConfig && (
                <>
                    <div>
                        <Label className="text-xs text-gray-500">Chart Type</Label>
                        <Select
                            value={widget.chartConfig.type}
                            onValueChange={typeValue =>
                                onUpdate({
                                    chartConfig: { ...widget.chartConfig!, type: typeValue as ChartConfig['type'] }
                                })
                            }
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="line">Line Chart</SelectItem>
                                <SelectItem value="bar">Bar Chart</SelectItem>
                                <SelectItem value="pie">Pie Chart</SelectItem>
                                <SelectItem value="scatter">Scatter Plot</SelectItem>
                                <SelectItem value="heatmap">Heatmap</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label className="text-xs text-gray-500">Color Scheme</Label>
                        <Select
                            value={widget.chartConfig.styling.colorScheme || 'default'}
                            onValueChange={colorSchemeValue =>
                                onUpdate({
                                    chartConfig: {
                                        ...widget.chartConfig!,
                                        styling: { ...widget.chartConfig!.styling, colorScheme: colorSchemeValue as ChartConfig['styling']['colorScheme'] }
                                    }
                                })
                            }
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="default">Default</SelectItem>
                                <SelectItem value="brand">Brand</SelectItem>
                                <SelectItem value="dark">Dark</SelectItem>
                                <SelectItem value="colorblind">Colorblind Friendly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between">
                        <Label className="text-xs text-gray-500">Animations</Label>
                        <Switch
                            checked={widget.chartConfig.options.animations || false}
                            onCheckedChange={(checked) =>
                                onUpdate({
                                    chartConfig: {
                                        ...widget.chartConfig!,
                                        options: { ...widget.chartConfig!.options, animations: checked }
                                    }
                                })
                            }
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <Label className="text-xs text-gray-500">Interactive</Label>
                        <Switch
                            checked={widget.chartConfig.options.interactive || false}
                            onCheckedChange={(checked) =>
                                onUpdate({
                                    chartConfig: {
                                        ...widget.chartConfig!,
                                        options: { ...widget.chartConfig!.options, interactive: checked }
                                    }
                                })
                            }
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <Label className="text-xs text-gray-500">Grid</Label>
                        <Switch
                            checked={widget.chartConfig.options.grid || false}
                            onCheckedChange={(checked) =>
                                onUpdate({
                                    chartConfig: {
                                        ...widget.chartConfig!,
                                        options: { ...widget.chartConfig!.options, grid: checked }
                                    }
                                })
                            }
                        />
                    </div>
                </>
            )}

            <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-500">Auto Update</Label>
                <Switch
                    checked={widget.config.autoUpdate || false}
                    onCheckedChange={(checked) =>
                        onUpdate({
                            config: { ...widget.config, autoUpdate: checked }
                        })
                    }
                />
            </div>
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

export default VisualizationDashboardBuilder;
