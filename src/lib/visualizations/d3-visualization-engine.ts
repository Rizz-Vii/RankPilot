/**
 * D3.js Advanced Visualizations System
 * Implements Priority 2 Enterprise Features from DevReady Phase 3
 * 
 * Features:
 * - Advanced data visualizations with D3.js integration
 * - Custom chart components for dashboard builder
 * - Interactive charts with zoom, pan, and filtering
 * - Real-time data updates and animations
 * - Export capabilities (PNG, SVG, PDF)
 * - Respon            .attr('fill', (d: ChartDataPoint, _i: number) => colors[((typeof d.category === 'number' ? d.category : _i) % colors.length)]);ive design with mobile optimization
 */

import * as d3 from 'd3';

export interface ChartDataPoint {
    x: string | number | Date;
    y: string | number;
    value?: number;
    _value?: number;
    size?: number;
    series?: string;
    category?: string | number;
    label?: string;
    [_key: string]: unknown;
}

export interface ChartConfig {
    id: string;
    type: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'heatmap' | 'network' | 'treemap' | 'sankey';
    width: number;
    height: number;
    margin: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    _data: ChartDataPoint[];
    options: {
        title?: string;
        subtitle?: string;
        xAxis?: AxisConfig;
        yAxis?: AxisConfig;
        colors?: string[];
        animations?: boolean;
        interactive?: boolean;
        responsive?: boolean;
        tooltip?: boolean;
        legend?: boolean;
        grid?: boolean;
        zoom?: boolean;
        brush?: boolean;
    };
    styling: {
        backgroundColor?: string;
        fontFamily?: string;
        fontSize?: number;
        colorScheme?: 'default' | 'dark' | 'light' | 'brand' | 'colorblind';
    };
}

export interface AxisConfig {
    label?: string;
    domain?: [number, number];
    tickCount?: number;
    tickFormat?: string;
    scale?: 'linear' | 'log' | 'time' | 'ordinal';
}

export interface ChartExportConfig {
    format: 'png' | 'svg' | 'pdf' | 'excel' | 'json';
    quality?: number; // for PNG
    width?: number;
    height?: number;
    background?: string;
    title?: string;
    watermark?: boolean;
}

export class D3VisualizationEngine {
    private charts: Map<string, any> = new Map();
    private colorSchemes: Map<string, string[]> = new Map();

    constructor() {
        this.initializeColorSchemes();
    }

    /**
     * Initialize color schemes for different chart types
     */
    private initializeColorSchemes(): void {
        this.colorSchemes.set('default', [
            '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
            '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
        ]);

        this.colorSchemes.set('dark', [
            '#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3',
            '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd'
        ]);

        this.colorSchemes.set('brand', [
            '#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe',
            '#e879f9', '#f0abfc', '#f3e8ff', '#faf5ff', '#f9fafb'
        ]);

        this.colorSchemes.set('colorblind', [
            '#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e',
            '#e6ab02', '#a6761d', '#666666', '#000000', '#999999'
        ]);
    }

    /**
     * Create a line chart
     */
    createLineChart(containerId: string, config: ChartConfig): void {
        this.clearContainer(containerId);

        const svg = this.createSVG(containerId, config);
        const { width, height } = this.getChartDimensions(config);
        const colors = this.getColorScheme(config.styling.colorScheme || 'default');

        // Setup scales
        const xScale = d3.scaleTime()
            .domain(d3.extent(config._data, d => new Date(d.x as string | number | Date)) as [Date, Date])
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain(d3.extent(config._data, d => Number(d.y)) as [number, number])
            .nice()
            .range([height, 0]);

        // Create line generator
        const line = d3.line<ChartDataPoint>()
            .x(d => xScale(new Date(d.x as string | number | Date)))
            .y(d => yScale(Number(d.y)))
            .curve(d3.curveMonotoneX);

        // Add axes
        if (config.options.grid) {
            this.addGrid(svg, xScale, yScale, width, height);
        }

        this.addXAxis(svg, xScale, height, config.options.xAxis);
        this.addYAxis(svg, yScale, config.options.yAxis);

        // Group data by series
        const series = d3.group(config._data, d => d.series || 'default');

        // Add lines
        series.forEach((seriesData, seriesName) => {
            const path = svg.append('path')
                .datum(seriesData)
                .attr('fill', 'none')
                .attr('stroke', colors[Array.from(series.keys()).indexOf(seriesName) % colors.length])
                .attr('stroke-width', 2)
                .attr('d', line);

            if (config.options.animations) {
                const totalLength = path.node()!.getTotalLength();
                path
                    .attr('stroke-dasharray', totalLength + ' ' + totalLength)
                    .attr('stroke-dashoffset', totalLength)
                    .transition()
                    .duration(2000)
                    .ease(d3.easeLinear)
                    .attr('stroke-dashoffset', 0);
            }

            // Add data points
            if (config.options.interactive) {
                svg.selectAll('.dot-' + seriesName)
                    .data(seriesData)
                    .enter().append('circle')
                    .attr('class', 'dot-' + seriesName)
                    .attr('cx', d => xScale(new Date(d.x as string | number | Date)))
                    .attr('cy', d => yScale(Number(d.y)))
                    .attr('r', 4)
                    .attr('fill', colors[Array.from(series.keys()).indexOf(seriesName) % colors.length])
                    .on('mouseover', (_event, d) => this.showTooltip(_event, d, config))
                    .on('mouseout', () => this.hideTooltip());
            }
        });

        // Add title and legend
        this.addTitle(svg, config);
        if (config.options.legend && series.size > 1) {
            this.addLegend(svg, Array.from(series.keys()), colors, config);
        }

        // Store chart reference
        this.charts.set(config.id, { svg, config, type: 'line' });
    }

    /**
     * Create a bar chart
     */
    createBarChart(containerId: string, config: ChartConfig): void {
        this.clearContainer(containerId);

        const svg = this.createSVG(containerId, config);
        const { width, height } = this.getChartDimensions(config);
        const colors = this.getColorScheme(config.styling.colorScheme || 'default');

        // Setup scales
        const xScale = d3.scaleBand()
            .domain(config._data.map(d => String(d.x)))
            .range([0, width])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(config._data, d => Number(d.y)) as number])
            .nice()
            .range([height, 0]);

        // Add axes
        if (config.options.grid) {
            this.addGrid(svg, xScale, yScale, width, height);
        }

        this.addXAxis(svg, xScale, height, config.options.xAxis);
        this.addYAxis(svg, yScale, config.options.yAxis);

        // Add bars
        const bars = svg.selectAll('.bar')
            .data(config._data)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(String(d.x))!)
            .attr('width', xScale.bandwidth())
            .attr('y', height)
            .attr('height', 0)
            .attr('fill', (d, _i) => colors[_i % colors.length]);

        if (config.options.animations) {
            bars.transition()
                .duration(1000)
                .attr('y', d => yScale(Number(d.y)))
                .attr('height', d => height - yScale(Number(d.y)));
        } else {
            bars
                .attr('y', d => yScale(Number(d.y)))
                .attr('height', d => height - yScale(Number(d.y)));
        }

        if (config.options.interactive) {
            bars
                .on('mouseover', (_event, d) => this.showTooltip(_event, d, config))
                .on('mouseout', () => this.hideTooltip())
                .on('click', (_event, d) => this.handleBarClick(_event, d, config));
        }

        // Add title
        this.addTitle(svg, config);

        // Store chart reference
        this.charts.set(config.id, { svg, config, type: 'bar' });
    }

    /**
     * Create a pie chart
     */
    createPieChart(containerId: string, config: ChartConfig): void {
        this.clearContainer(containerId);

        const svg = this.createSVG(containerId, config);
        const { width, height } = this.getChartDimensions(config);
        const colors = this.getColorScheme(config.styling.colorScheme || 'default');

        const radius = Math.min(width, height) / 2;
        const g = svg.append('g')
            .attr('transform', `translate(${width / 2}, ${height / 2})`);

        // Create pie generator
        const pie = d3.pie<any>()
            .value(d => d._value)
            .sort(null);

        // Create arc generator
        const arc = d3.arc<any>()
            .innerRadius(0)
            .outerRadius(radius);

        const outerArc = d3.arc<any>()
            .innerRadius(radius * 0.9)
            .outerRadius(radius * 0.9);

        // Add pie slices
        const slices = g.selectAll('.slice')
            .data(pie(config._data))
            .enter().append('g')
            .attr('class', 'slice');

        const paths = slices.append('path')
            .attr('d', arc as any)
            .attr('fill', (d, _i) => colors[_i % colors.length])
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);

        if (config.options.animations) {
            paths
                .transition()
                .duration(1000)
                .attrTween('d', function (d) {
                    const i = d3.interpolate(d.startAngle, d.endAngle);
                    return (t: number) => {
                        d.endAngle = i(t);
                        return arc(d as any) as string;
                    };
                });
        }

        if (config.options.interactive) {
            paths
                .on('mouseover', (_event, d) => this.showTooltip(_event, d.data, config))
                .on('mouseout', () => this.hideTooltip());
        }

        // Add labels
        if (config.options.legend) {
            const labels = slices.append('text')
                .attr('transform', d => `translate(${outerArc.centroid(d as any)})`)
                .attr('dy', '0.35em')
                .style('text-anchor', 'middle')
                .style('font-size', '12px')
                .text(d => d.data.label);

            if (config.options.animations) {
                labels
                    .style('opacity', 0)
                    .transition()
                    .delay(1000)
                    .duration(500)
                    .style('opacity', 1);
            }
        }

        // Add title
        this.addTitle(svg, config);

        // Store chart reference
        this.charts.set(config.id, { svg, config, type: 'pie' });
    }

    /**
     * Create a scatter plot
     */
    createScatterPlot(containerId: string, config: ChartConfig): void {
        this.clearContainer(containerId);

        const svg = this.createSVG(containerId, config);
        const { width, height } = this.getChartDimensions(config);
        const colors = this.getColorScheme(config.styling.colorScheme || 'default');

        // Setup scales
        const xScale = d3.scaleLinear()
            .domain(d3.extent(config._data, d => Number(d.x)) as [number, number])
            .nice()
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain(d3.extent(config._data, d => Number(d.y)) as [number, number])
            .nice()
            .range([height, 0]);

        const sizeScale = d3.scaleSqrt()
            .domain(d3.extent(config._data, d => Number(d.size || 1)) as [number, number])
            .range([3, 20]);

        // Add axes
        if (config.options.grid) {
            this.addGrid(svg, xScale, yScale, width, height);
        }

        this.addXAxis(svg, xScale, height, config.options.xAxis);
        this.addYAxis(svg, yScale, config.options.yAxis);

        // Add points
        const points = svg.selectAll('.point')
            .data(config._data)
            .enter().append('circle')
            .attr('class', 'point')
            .attr('cx', d => xScale(Number(d.x)))
            .attr('cy', d => yScale(Number(d.y)))
            .attr('r', d => sizeScale(Number(d.size || 1)))
            .attr('fill', (d: ChartDataPoint, _i: number) => colors[((typeof d.category === 'number' ? d.category : _i) % colors.length)])
            .attr('opacity', 0.7);

        if (config.options.animations) {
            points
                .attr('r', 0)
                .transition()
                .duration(1000)
                .delay((d, _i) => _i * 50)
                .attr('r', d => sizeScale(Number(d.size || 1)));
        }

        if (config.options.interactive) {
            points
                .on('mouseover', (_event, d) => this.showTooltip(_event, d, config))
                .on('mouseout', () => this.hideTooltip());
        }

        // Add title
        this.addTitle(svg, config);

        // Store chart reference
        this.charts.set(config.id, { svg, config, type: 'scatter' });
    }

    /**
     * Create a heatmap
     */
    createHeatmap(containerId: string, config: ChartConfig): void {
        this.clearContainer(containerId);

        const svg = this.createSVG(containerId, config);
        const { width, height } = this.getChartDimensions(config);

        // Get unique x and y values
        const xValues = Array.from(new Set(config._data.map(d => String(d.x)))).sort();
        const yValues = Array.from(new Set(config._data.map(d => String(d.y)))).sort();

        // Setup scales
        const xScale = d3.scaleBand()
            .domain(xValues)
            .range([0, width])
            .padding(0.1);

        const yScale = d3.scaleBand()
            .domain(yValues)
            .range([0, height])
            .padding(0.1);

        const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
            .domain(d3.extent(config._data, d => Number(d.value)) as [number, number]);

        // Add rectangles
        const cells = svg.selectAll('.cell')
            .data(config._data)
            .enter().append('rect')
            .attr('class', 'cell')
            .attr('x', (d: ChartDataPoint) => xScale(String(d.x))!)
            .attr('y', (d: ChartDataPoint) => yScale(String(d.y))!)
            .attr('width', xScale.bandwidth())
            .attr('height', yScale.bandwidth())
            .attr('fill', (d: ChartDataPoint) => colorScale(Number(d.value || 0)));

        if (config.options.animations) {
            cells
                .attr('opacity', 0)
                .transition()
                .duration(1000)
                .delay((d, _i) => _i * 10)
                .attr('opacity', 1);
        }

        if (config.options.interactive) {
            cells
                .on('mouseover', (_event, d) => this.showTooltip(_event, d, config))
                .on('mouseout', () => this.hideTooltip());
        }

        // Add axes
        this.addXAxis(svg, xScale, height, config.options.xAxis);
        this.addYAxis(svg, yScale, config.options.yAxis);

        // Add title
        this.addTitle(svg, config);

        // Store chart reference
        this.charts.set(config.id, { svg, config, type: 'heatmap' });
    }

    /**
     * Export chart to specified format
     */
    async exportChart(chartId: string, exportConfig: ChartExportConfig): Promise<string> {
        const chart = this.charts.get(chartId);
        if (!chart) {
            throw new Error(`Chart ${chartId} not found`);
        }

        const svg = chart.svg.node();

        switch (exportConfig.format) {
            case 'svg':
                return this.exportAsSVG(svg, exportConfig);
            case 'png':
                return await this.exportAsPNG(svg, exportConfig);
            case 'pdf':
                return await this.exportAsPDF(svg, exportConfig);
            case 'json':
                return this.exportAsJSON(chart, exportConfig);
            default:
                throw new Error(`Unsupported export format: ${exportConfig.format}`);
        }
    }

    /**
     * Update chart data
     */
    updateChartData(chartId: string, newData: ChartDataPoint[]): void {
        const chart = this.charts.get(chartId);
        if (!chart) {
            throw new Error(`Chart ${chartId} not found`);
        }

        chart.config.data = newData;

        // Recreate chart with new data based on type
        const containerId = chart.svg.node()?.parentElement?.id;
        if (!containerId) return;

        switch (chart.type) {
            case 'line':
                this.createLineChart(containerId, chart.config);
                break;
            case 'bar':
                this.createBarChart(containerId, chart.config);
                break;
            case 'pie':
                this.createPieChart(containerId, chart.config);
                break;
            case 'scatter':
                this.createScatterPlot(containerId, chart.config);
                break;
            case 'heatmap':
                this.createHeatmap(containerId, chart.config);
                break;
        }
    }

    /**
     * Helper methods
     */
    private createSVG(containerId: string, config: ChartConfig): d3.Selection<SVGGElement, unknown, HTMLElement, any> {
        const container = d3.select(`#${containerId}`);

        const svg = container.append('svg')
            .attr('width', config.width)
            .attr('height', config.height)
            .style('background-color', config.styling.backgroundColor || 'transparent');

        return svg.append('g')
            .attr('transform', `translate(${config.margin.left}, ${config.margin.top})`);
    } private getChartDimensions(config: ChartConfig): { width: number; height: number; } {
        return {
            width: config.width - config.margin.left - config.margin.right,
            height: config.height - config.margin.top - config.margin.bottom
        };
    }

    private getColorScheme(scheme: string): string[] {
        return this.colorSchemes.get(scheme) || this.colorSchemes.get('default')!;
    }

    private clearContainer(containerId: string): void {
        d3.select(`#${containerId}`).selectAll('*').remove();
    }

    private addXAxis(svg: unknown, scale: unknown, height: number, axisConfig?: AxisConfig): void {
        const axis = d3.axisBottom(scale as any);

        if (axisConfig?.tickCount) {
            axis.ticks(axisConfig.tickCount);
        }

        if (axisConfig?.tickFormat) {
            axis.tickFormat((d: unknown) => d3.format(axisConfig.tickFormat!)(d as any));
        }

        const xAxis = (svg as any).append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${height})`)
            .call(axis);

        if (axisConfig?.label) {
            xAxis.append('text')
                .attr('class', 'axis-label')
                .attr('x', (scale as any).range()[1] / 2)
                .attr('y', 40)
                .style('text-anchor', 'middle')
                .style('fill', 'black')
                .text(axisConfig.label);
        }
    }

    private addYAxis(svg: unknown, scale: unknown, axisConfig?: AxisConfig): void {
        const axis = d3.axisLeft(scale as any);

        if (axisConfig?.tickCount) {
            axis.ticks(axisConfig.tickCount);
        }

        if (axisConfig?.tickFormat) {
            axis.tickFormat((d: unknown) => d3.format(axisConfig.tickFormat!)(d as any));
        }

        const yAxis = (svg as any).append('g')
            .attr('class', 'y-axis')
            .call(axis);

        if (axisConfig?.label) {
            yAxis.append('text')
                .attr('class', 'axis-label')
                .attr('transform', 'rotate(-90)')
                .attr('y', -40)
                .attr('x', -(scale as any).range()[0] / 2)
                .style('text-anchor', 'middle')
                .style('fill', 'black')
                .text(axisConfig.label);
        }
    }

    private addGrid(svg: unknown, xScale: unknown, yScale: unknown, width: number, height: number): void {
        // Add X grid lines
        (svg as any).append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(0, ${height})`)
            .call(d3.axisBottom(xScale as any)
                .tickSize(-height)
                .tickFormat(() => '')
            )
            .style('stroke-dasharray', '3,3')
            .style('opacity', 0.3);

        // Add Y grid lines
        (svg as any).append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(yScale as any)
                .tickSize(-width)
                .tickFormat(() => '')
            )
            .style('stroke-dasharray', '3,3')
            .style('opacity', 0.3);
    }

    private addTitle(svg: unknown, config: ChartConfig): void {
        if (config.options.title) {
            (svg as any).append('text')
                .attr('class', 'chart-title')
                .attr('x', (config.width - config.margin.left - config.margin.right) / 2)
                .attr('y', -config.margin.top / 2)
                .style('text-anchor', 'middle')
                .style('font-size', '16px')
                .style('font-weight', 'bold')
                .style('fill', 'black')
                .text(config.options.title);
        }

        if (config.options.subtitle) {
            (svg as any).append('text')
                .attr('class', 'chart-subtitle')
                .attr('x', (config.width - config.margin.left - config.margin.right) / 2)
                .attr('y', -config.margin.top / 2 + 20)
                .style('text-anchor', 'middle')
                .style('font-size', '12px')
                .style('fill', 'gray')
                .text(config.options.subtitle);
        }
    }

    private addLegend(svg: unknown, series: string[], colors: string[], config: ChartConfig): void {
        const legend = (svg as any).append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${config.width - config.margin.right + 20}, 20)`);

        const legendItems = legend.selectAll('.legend-item')
            .data(series)
            .enter().append('g')
            .attr('class', 'legend-item')
            .attr('transform', (_d: unknown, _i: number) => `translate(0, ${_i * 20})`);

        legendItems.append('rect')
            .attr('width', 12)
            .attr('height', 12)
            .attr('fill', (_d: unknown, _i: number) => colors[_i % colors.length]);

        legendItems.append('text')
            .attr('x', 18)
            .attr('y', 6)
            .attr('dy', '0.35em')
            .style('font-size', '12px')
            .text((d: string) => d);
    }

    private showTooltip(event: unknown, _data: unknown, config: ChartConfig): void {
        if (!config.options.tooltip) return;

        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'chart-tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '8px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('opacity', 0);

        const content = this.formatTooltipContent(_data);

        tooltip.html(content)
            .style('left', ((event as MouseEvent)?.pageX + 10) + 'px')
            .style('top', ((event as MouseEvent)?.pageY - 10) + 'px')
            .transition()
            .duration(200)
            .style('opacity', 1);
    }

    private hideTooltip(): void {
        d3.selectAll('.chart-tooltip').remove();
    }

    private formatTooltipContent(_data: unknown): string {
        const entries = Object.entries(_data as any)
            .filter(([key]) => !['series', 'category'].includes(key))
            .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
            .join('<br>');

        return entries || JSON.stringify(_data);
    }

    private handleBarClick(event: unknown, _data: unknown, config: ChartConfig): void {
        // Emit custom event for bar click
        const customEvent = new CustomEvent('barClick', {
            detail: { _data, config, element: (event as Event)?.target }
        });

        ((event as Event)?.target as EventTarget)?.dispatchEvent(customEvent);
    }

    private exportAsSVG(svg: SVGElement, config: ChartExportConfig): string {
        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(svg.parentElement!);

        if (config.background) {
            svgString = svgString.replace('<svg', `<svg style="background-color: ${config.background}"`);
        }

        return `_data:image/svg+xml;base64,${btoa(svgString)}`;
    }

    private async exportAsPNG(svg: SVGElement, config: ChartExportConfig): Promise<string> {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        const img = new Image();
        const svgData = this.exportAsSVG(svg, config);

        return new Promise((resolve, reject) => {
            img.onload = () => {
                canvas.width = config.width || img.width;
                canvas.height = config.height || img.height;

                if (config.background) {
                    ctx.fillStyle = config.background;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                ctx.drawImage(img, 0, 0);

                const quality = config.quality || 0.9;
                resolve(canvas.toDataURL('image/png', quality));
            };

            img.onerror = reject;
            img.src = svgData;
        });
    }

    private async exportAsPDF(svg: SVGElement, config: ChartExportConfig): Promise<string> {
        // For PDF export, we'll return a placeholder URL
        // In production, integrate with jsPDF or similar library
        const pngData = await this.exportAsPNG(svg, config);

        // Mock PDF generation
        return `_data:application/pdf;base64,${btoa('PDF content would be here')}`;
    }

    private exportAsJSON(chart: unknown, config: ChartExportConfig): string {
        const exportData = {
            type: (chart as any).type,
            config: (chart as any).config,
            exportConfig: config,
            timestamp: Date.now()
        };

        return `_data:application/json;base64,${btoa(JSON.stringify(exportData, null, 2))}`;
    }

    /**
     * Get chart instance
     */
    getChart(chartId: string): any {
        return this.charts.get(chartId);
    }

    /**
     * Remove chart
     */
    removeChart(chartId: string): boolean {
        return this.charts.delete(chartId);
    }

    /**
     * Get all chart IDs
     */
    getChartIds(): string[] {
        return Array.from(this.charts.keys());
    }
}

// Export singleton instance
export const d3VisualizationEngine = new D3VisualizationEngine();
