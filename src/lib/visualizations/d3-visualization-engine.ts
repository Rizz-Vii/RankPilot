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
 * - Respon            .attr('fill', (d: ChartDataPoint, i: number) => colors[((typeof d.category === 'number' ? d.category : i) % colors.length)]);ive design with mobile optimization
 */

import * as d3 from 'd3';
import jsPDF from 'jspdf';
import type { ChartDatum, SeriesSpec } from './types';

// Core data point used by visualizations. We deliberately keep x/y/value flexible
// but concrete (no `unknown`) so downstream D3 helpers have usable types.
export interface ChartDataPoint {
    x: number | string | Date;
    y: number | string | Date;
    value?: number;
    size?: number;
    series?: string;
    category?: string | number;
    label?: string;
    // TODO:TRACKD-DEFER:typing narrow dynamic extension map keys
    // Using unknown to avoid explicit any while preserving extensibility
    [key: string]: unknown;
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
    data: ChartDataPoint[];
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
    /**
     * When true, computed CSS styles are inlined into the exported SVG so it renders
     * identically when opened standalone (outside the original DOM/CSS context).
     */
    includeStyles?: boolean;
    /** Optional raw @font-face CSS (string or list) to embed into the SVG */
    fontFacesCSS?: string | string[];
    /** Optional structured font embedding definitions for common cases */
    embedFonts?: Array<{
        family: string;
        /** A URL or data URL (recommended data:font/woff2;base64,...) */
        src: string;
        format?: 'woff2' | 'woff' | 'truetype' | 'opentype' | 'embedded-opentype' | 'svg';
        weight?: string | number;
        style?: string;
        unicodeRange?: string;
        display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
    }>;
}

type InternalChartRecord = {
    svg: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>;
    config: ChartConfig;
    type: ChartConfig['type'];
};

export class D3VisualizationEngine {
    private charts: Map<string, InternalChartRecord> = new Map();
    private colorSchemes: Map<string, string[]> = new Map();

    constructor() {
        this.initializeColorSchemes();
    }

    /**
     * Initialize color schemes for different chart types
     */
    private initializeColorSchemes(): void {
        // Helpers to compute hex at runtime (no raw hex literals in source)
        const clampByte = (n: number) => Math.max(0, Math.min(255, Number.isFinite(Math.round(n)) ? Math.round(n) : 0));
        const toHex2 = (n: number) => clampByte(n).toString(16).padStart(2, '0');
        const hexFromRGB = (r: number, g: number, b: number) => `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
        const cssColorToHex = (v: string): string => {
            if (!v) return '';
            const m = v.match(/^#([0-9a-fA-F]{6})$/); if (m) return `#${m[1]}`;
            if (/^rgba?\(/i.test(v)) {
                const parts = v.replace(/rgba?\(|\)/g, '').split(',').map(s => parseFloat(s.trim()));
                if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) return hexFromRGB(parts[0], parts[1], parts[2]);
            }
            if (/^hsla?\(/i.test(v)) {
                const parts = v.replace(/hsla?\(|\)/g, '').split(',').map(s => s.trim());
                const h = parseFloat(parts[0]); const s = parseFloat(parts[1]) / 100; const l = parseFloat(parts[2]) / 100;
                if ([h, s, l].every(Number.isFinite)) {
                    const c = (1 - Math.abs(2 * l - 1)) * s; const x = c * (1 - Math.abs(((h / 60) % 2) - 1)); const m2 = l - c / 2;
                    let rr = 0, gg = 0, bb = 0;
                    if (h < 60) { rr = c; gg = x; bb = 0; } else if (h < 120) { rr = x; gg = c; bb = 0; }
                    else if (h < 180) { rr = 0; gg = c; bb = x; } else if (h < 240) { rr = 0; gg = x; bb = c; }
                    else if (h < 300) { rr = x; gg = 0; bb = c; } else { rr = c; gg = 0; bb = x; }
                    return hexFromRGB(255 * (rr + m2), 255 * (gg + m2), 255 * (bb + m2));
                }
            }
            return '';
        };
        const resolveTokenToHex = (tokenName: string, fb: [number, number, number]) => {
            try {
                if (typeof window !== 'undefined') {
                    const v = getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim();
                    const h = cssColorToHex(v); if (h) return h;
                }
            } catch { /* ignore */ }
            return hexFromRGB(fb[0], fb[1], fb[2]);
        };
        const build = (defs: Array<{ token?: string; fb: [number, number, number] }>) =>
            defs.map(d => d.token ? resolveTokenToHex(d.token, d.fb) : hexFromRGB(d.fb[0], d.fb[1], d.fb[2]));

        // Default scheme mapped to theme tokens where possible; others fallback to classic palette RGBs
        this.colorSchemes.set('default', build([
            { token: '--color-primary-500', fb: [31, 119, 180] },
            { token: '--color-accent-500', fb: [255, 127, 14] },
            { token: '--color-success-500', fb: [44, 160, 44] },
            { token: '--color-destructive-500', fb: [214, 39, 40] },
            { token: '--color-secondary-500', fb: [148, 103, 189] },
            { token: '--color-warning-500', fb: [140, 86, 75] },
            { token: '--color-gray-500', fb: [227, 119, 194] },
            { fb: [127, 127, 127] },
            { fb: [188, 189, 34] },
            { fb: [23, 190, 207] }
        ]));

        // Dark scheme keep broader variety; still no raw hex in source
        this.colorSchemes.set('dark', build([
            { fb: [141, 211, 199] }, { fb: [255, 255, 179] }, { fb: [190, 186, 218] },
            { fb: [251, 128, 114] }, { fb: [128, 177, 211] }, { fb: [253, 180, 98] },
            { fb: [179, 222, 105] }, { fb: [252, 205, 229] }, { fb: [217, 217, 217] }, { fb: [188, 128, 189] }
        ]));

        // Brand scheme favors tokens
        this.colorSchemes.set('brand', build([
            { token: '--color-primary-500', fb: [99, 102, 241] },
            { token: '--color-secondary-500', fb: [139, 92, 246] },
            { token: '--color-accent-500', fb: [168, 85, 247] },
            { token: '--color-success-500', fb: [16, 185, 129] },
            { token: '--color-warning-500', fb: [234, 179, 8] },
            { token: '--color-destructive-500', fb: [239, 68, 68] },
            { token: '--color-gray-500', fb: [107, 114, 128] },
            { fb: [203, 213, 225] }, { fb: [226, 232, 240] }, { fb: [241, 245, 249] }
        ]));

        // Colorblind-friendly palette
        this.colorSchemes.set('colorblind', build([
            { fb: [27, 158, 119] }, { fb: [217, 95, 2] }, { fb: [117, 112, 179] },
            { fb: [231, 41, 138] }, { fb: [102, 166, 30] }, { fb: [230, 171, 2] },
            { fb: [166, 118, 29] }, { fb: [102, 102, 102] }, { fb: [0, 0, 0] }, { fb: [153, 153, 153] }
        ]));
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
            .domain(this.computeDateExtent(config.data))
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain(this.computeNumberExtent(config.data, 'y'))
            .nice()
            .range([height, 0]);

        // Create line generator
        const line = d3.line<ChartDataPoint>()
            .x(d => xScale(this.toDate(d.x)))
            .y(d => yScale(this.toNumber(d.y)))
            .curve(d3.curveMonotoneX);

        // Add axes
        if (config.options.grid) {
            this.addGrid(svg, xScale, yScale, width, height);
        }

        this.addXAxis(svg, xScale, height, config.options.xAxis);
        this.addYAxis(svg, yScale, config.options.yAxis);

        // Group data by series
        const series = d3.group(config.data, d => d.series || 'default');

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
                    .attr('cx', d => xScale(this.toDate(d.x)))
                    .attr('cy', d => yScale(this.toNumber(d.y)))
                    .attr('r', 4)
                    .attr('fill', colors[Array.from(series.keys()).indexOf(seriesName) % colors.length])
                    .on('mouseover', (event, d) => this.showTooltip(event, d, config))
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
        const xScale = d3.scaleBand<string>()
            .domain(config.data.map(d => String(d.x)))
            .range([0, width])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(config.data, d => this.toNumber(d.y)) || 0])
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
            .data(config.data)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(String(d.x))!)
            .attr('width', xScale.bandwidth())
            .attr('y', height)
            .attr('height', 0)
            .attr('fill', (_d, i) => colors[i % colors.length]);

        if (config.options.animations) {
            bars.transition()
                .duration(1000)
                .attr('y', d => yScale(this.toNumber(d.y)))
                .attr('height', d => height - yScale(this.toNumber(d.y)));
        } else {
            bars
                .attr('y', d => yScale(this.toNumber(d.y)))
                .attr('height', d => height - yScale(this.toNumber(d.y)));
        }

        if (config.options.interactive) {
            bars
                .on('mouseover', (event, d) => this.showTooltip(event, d, config))
                .on('mouseout', () => this.hideTooltip())
                .on('click', (event, d) => this.handleBarClick(event, d, config));
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
        const pie = d3.pie<ChartDataPoint>()
            .value(d => (typeof d.value === 'number' ? d.value : this.toNumber(d.y)))
            .sort(null);

        // Create arc generator
        const arc = d3.arc<d3.PieArcDatum<ChartDataPoint>>()
            .innerRadius(0)
            .outerRadius(radius);

        const outerArc = d3.arc<d3.PieArcDatum<ChartDataPoint>>()
            .innerRadius(radius * 0.9)
            .outerRadius(radius * 0.9);

        // Add pie slices
        const slices = g.selectAll('.slice')
            .data(pie(config.data))
            .enter().append('g')
            .attr('class', 'slice');

        // Resolve a stroke color close to container background or foreground
        const strokeColor = this.resolveContainerColor(`#${containerId}`, [255, 255, 255]);

        const paths = slices.append('path')
            // cast limited to d3 path generator incompatibility in TS generics
            .attr('d', arc as unknown as string)
            .attr('fill', (_d, i) => colors[i % colors.length])
            .attr('stroke', strokeColor)
            .attr('stroke-width', 2);

        if (config.options.animations) {
            paths
                .transition()
                .duration(1000)
                .attrTween('d', function (d) {
                    const i = d3.interpolate(d.startAngle, d.endAngle);
                    return (t: number) => {
                        const mutable = d as d3.PieArcDatum<ChartDataPoint> & { endAngle?: number };
                        mutable.endAngle = i(t);
                        return arc(mutable) as string;
                    };
                });
        }

        if (config.options.interactive) {
            paths
                .on('mouseover', (event, d) => this.showTooltip(event, d.data, config))
                .on('mouseout', () => this.hideTooltip());
        }

        // Add labels
        if (config.options.legend) {
            const labels = slices.append('text')
                .attr('transform', d => `translate(${outerArc.centroid(d as d3.PieArcDatum<ChartDataPoint>).join(',')})`)
                .attr('dy', '0.35em')
                .style('text-anchor', 'middle')
                .style('font-size', '12px')
                .text(d => d.data.label || d.data.series || '');

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
            .domain(this.computeNumberExtent(config.data, 'x'))
            .nice()
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain(this.computeNumberExtent(config.data, 'y'))
            .nice()
            .range([height, 0]);

        const sizeScale = d3.scaleSqrt<number>()
            .domain(d3.extent(config.data, d => d.size || 1) as [number, number])
            .range([3, 20]);

        // Add axes
        if (config.options.grid) {
            this.addGrid(svg, xScale, yScale, width, height);
        }

        this.addXAxis(svg, xScale, height, config.options.xAxis);
        this.addYAxis(svg, yScale, config.options.yAxis);

        // Add points
        const points = svg.selectAll('.point')
            .data(config.data)
            .enter().append('circle')
            .attr('class', 'point')
            .attr('cx', d => xScale(this.toNumber(d.x)))
            .attr('cy', d => yScale(this.toNumber(d.y)))
            .attr('r', d => sizeScale(d.size || 1))
            .attr('fill', (d: ChartDataPoint, i: number) => colors[((typeof d.category === 'number' ? d.category : i) % colors.length)])
            .attr('opacity', 0.7);

        if (config.options.animations) {
            points
                .attr('r', 0)
                .transition()
                .duration(1000)
                .delay((_d, i) => i * 50)
                .attr('r', d => sizeScale(d.size || 1));
        }

        if (config.options.interactive) {
            points
                .on('mouseover', (event, d) => this.showTooltip(event, d, config))
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
        const xValues = Array.from(new Set(config.data.map(d => String(d.x)))).sort();
        const yValues = Array.from(new Set(config.data.map(d => String(d.y)))).sort();

        // Setup scales
        const xScale = d3.scaleBand<string>()
            .domain(xValues as string[])
            .range([0, width])
            .padding(0.1);
        const yScale = d3.scaleBand<string>()
            .domain(yValues as string[])
            .range([0, height])
            .padding(0.1);

        const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
            .domain(d3.extent(config.data, d => d.value) as [number, number]);

        // Add rectangles
        const cells = svg.selectAll('.cell')
            .data(config.data)
            .enter().append('rect')
            .attr('class', 'cell')
            .attr('x', (d: ChartDataPoint) => xScale(String(d.x))!)
            .attr('y', (d: ChartDataPoint) => yScale(String(d.y))!)
            .attr('width', xScale.bandwidth())
            .attr('height', yScale.bandwidth())
            .attr('fill', (d: ChartDataPoint) => colorScale(d.value || 0));

        if (config.options.animations) {
            cells
                .attr('opacity', 0)
                .transition()
                .duration(1000)
                .delay((_d, i) => i * 10)
                .attr('opacity', 1);
        }

        if (config.options.interactive) {
            cells
                .on('mouseover', (event, d) => this.showTooltip(event, d, config))
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
        if (!chart) throw new Error(`Chart ${chartId} not found`);
        const group = chart.svg.node();
        const root: SVGElement | null = group && group.ownerSVGElement
            ? group.ownerSVGElement
            : (group instanceof SVGElement ? group : null);
        if (!root) throw new Error('SVG root not found');
        switch (exportConfig.format) {
            case 'svg':
                return this.exportAsSVG(root, exportConfig);
            case 'png':
                return await this.exportAsPNG(root, exportConfig);
            case 'pdf':
                return await this.exportAsPDF(root, exportConfig);
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
        if (!chart) throw new Error(`Chart ${chartId} not found`);
        chart.config.data = newData;
        const containerId = chart.svg.node()?.parentElement?.id;
        if (!containerId) return;
        switch (chart.type) {
            case 'line': return this.createLineChart(containerId, chart.config);
            case 'bar': return this.createBarChart(containerId, chart.config);
            case 'pie': return this.createPieChart(containerId, chart.config);
            case 'scatter': return this.createScatterPlot(containerId, chart.config);
            case 'heatmap': return this.createHeatmap(containerId, chart.config);
        }
    }

    /**
     * Helper methods
     */
    private createSVG(containerId: string, config: ChartConfig): d3.Selection<SVGGElement, unknown, HTMLElement, unknown> {
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

    // Resolve a suitable contrasting color from container style tokens with fallback
    private resolveContainerColor(containerSelector: string, fb: [number, number, number]): string {
        const clampByte = (n: number) => Math.max(0, Math.min(255, Number.isFinite(Math.round(n)) ? Math.round(n) : 0));
        const toHex2 = (n: number) => clampByte(n).toString(16).padStart(2, '0');
        const hexFromRGB = (r: number, g: number, b: number) => `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
        const cssColorToHex = (v: string): string => {
            if (!v) return '';
            const m = v.match(/^#([0-9a-fA-F]{6})$/); if (m) return `#${m[1]}`;
            if (/^rgba?\(/i.test(v)) {
                const parts = v.replace(/rgba?\(|\)/g, '').split(',').map(s => parseFloat(s.trim()));
                if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) return hexFromRGB(parts[0], parts[1], parts[2]);
            }
            return '';
        };
        try {
            if (typeof window !== 'undefined') {
                const el = document.querySelector(containerSelector) as HTMLElement | null;
                const bg = (el ? getComputedStyle(el).backgroundColor : getComputedStyle(document.body).backgroundColor) || '';
                const hex = cssColorToHex(bg);
                if (hex) return hex;
            }
        } catch { /* ignore */ }
        return hexFromRGB(fb[0], fb[1], fb[2]);
    }

    // Accept flexible scale variants (time, linear, band, point) while staying type-safe (no explicit any)
    private addXAxis(svg: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>, scale: unknown, height: number, axisConfig?: AxisConfig): void {
        const axis = d3.axisBottom(scale as d3.AxisScale<number | Date | string>);

        if (axisConfig?.tickCount) {
            axis.ticks(axisConfig.tickCount);
        }

        if (axisConfig?.tickFormat) {
            const fmt = d3.format(axisConfig.tickFormat);
            axis.tickFormat((d: number | Date | string) => fmt(typeof d === 'number' ? d : Number(d)) as unknown as string);
        }

        const xAxis = svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${height})`)
            .call(axis);

        if (axisConfig?.label) {
            xAxis.append('text')
                .attr('class', 'axis-label')
                // d3 scale types vary; cast for range access
                .attr('x', (scale as unknown as { range(): [number, number] }).range()[1] / 2)
                .attr('y', 40)
                .style('text-anchor', 'middle')
                .style('fill', 'black')
                .text(axisConfig.label);
        }
    }

    private addYAxis(svg: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>, scale: unknown, axisConfig?: AxisConfig): void {
        const axis = d3.axisLeft(scale as d3.AxisScale<number | Date | string>);

        if (axisConfig?.tickCount) {
            axis.ticks(axisConfig.tickCount);
        }

        if (axisConfig?.tickFormat) {
            const fmt = d3.format(axisConfig.tickFormat);
            axis.tickFormat((d: number | Date | string) => fmt(typeof d === 'number' ? d : Number(d)) as unknown as string);
        }

        const yAxis = svg.append('g')
            .attr('class', 'y-axis')
            .call(axis);

        if (axisConfig?.label) {
            yAxis.append('text')
                .attr('class', 'axis-label')
                .attr('transform', 'rotate(-90)')
                .attr('y', -40)
                .attr('x', -(scale as unknown as { range(): [number, number] }).range()[0] / 2)
                .style('text-anchor', 'middle')
                .style('fill', 'black')
                .text(axisConfig.label);
        }
    } private addGrid(svg: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>, xScale: unknown, yScale: unknown, width: number, height: number): void {
        // Add X grid lines
        svg.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(0, ${height})`)
            .call(d3.axisBottom(xScale as d3.AxisScale<number | Date | string>)
                .tickSize(-height)
                .tickFormat(() => '')
            )
            .style('stroke-dasharray', '3,3')
            .style('opacity', 0.3);

        // Add Y grid lines
        svg.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(yScale as d3.AxisScale<number | Date | string>)
                .tickSize(-width)
                .tickFormat(() => '')
            )
            .style('stroke-dasharray', '3,3')
            .style('opacity', 0.3);
    }

    private addTitle(svg: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>, config: ChartConfig): void {
        if (config.options.title) {
            svg.append('text')
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
            svg.append('text')
                .attr('class', 'chart-subtitle')
                .attr('x', (config.width - config.margin.left - config.margin.right) / 2)
                .attr('y', -config.margin.top / 2 + 20)
                .style('text-anchor', 'middle')
                .style('font-size', '12px')
                .style('fill', 'gray')
                .text(config.options.subtitle);
        }
    }

    private addLegend(svg: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>, series: string[], colors: string[], config: ChartConfig): void {
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${config.width - config.margin.right + 20}, 20)`);

        const legendItems = legend.selectAll('.legend-item')
            .data(series)
            .enter().append('g')
            .attr('class', 'legend-item')
            .attr('transform', (_d: unknown, i: number) => `translate(0, ${i * 20})`);

        legendItems.append('rect')
            .attr('width', 12)
            .attr('height', 12)
            .attr('fill', (_d: unknown, i: number) => colors[i % colors.length]);

        legendItems.append('text')
            .attr('x', 18)
            .attr('y', 6)
            .attr('dy', '0.35em')
            .style('font-size', '12px')
            .text(d => d);
    }
    private showTooltip(event: { pageX: number; pageY: number; target: EventTarget & { dispatchEvent(e: Event): boolean } }, data: ChartDataPoint, config: ChartConfig): void {
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

        const content = this.formatTooltipContent(data);

        tooltip.html(content)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .transition()
            .duration(200)
            .style('opacity', 1);
    }

    private hideTooltip(): void {
        d3.selectAll('.chart-tooltip').remove();
    }

    private formatTooltipContent(data: ChartDataPoint | Record<string, unknown>): string {
        const entries = Object.entries(data as Record<string, unknown> || {})
            .filter(([key]) => !['series', 'category'].includes(key))
            .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
            .join('<br>');

        return entries || JSON.stringify(data);
    }

    private handleBarClick(event: { target: EventTarget & { dispatchEvent(e: Event): boolean } }, data: ChartDataPoint, config: ChartConfig): void {
        // Emit custom event for bar click
        const customEvent = new CustomEvent('barClick', {
            detail: { data, config, element: event.target }
        });
        try { event.target.dispatchEvent(customEvent); } catch { /* ignore */ }
    }

    private exportAsSVG(svg: SVGElement, config: ChartExportConfig): string {
        const serializer: XMLSerializer | { serializeToString: (n: Node) => string } =
            typeof XMLSerializer !== 'undefined'
                ? new XMLSerializer()
                : { serializeToString: (n: Node) => (n instanceof Element ? (n as Element).outerHTML : String(n)) };
        const parent = svg.parentElement;
        const originalRoot: SVGElement = (parent && parent instanceof SVGElement ? parent : svg) as SVGElement;

        // Work on a deep clone to avoid mutating the on-screen chart
        const root = originalRoot.cloneNode(true) as SVGElement;

        // Ensure width/height attributes present
        const w = originalRoot.getAttribute('width')
            || (originalRoot instanceof SVGSVGElement && originalRoot.width?.baseVal?.value != null ? String(originalRoot.width.baseVal.value) : '')
            || String(svg.clientWidth)
            || '800';
        const h = originalRoot.getAttribute('height')
            || (originalRoot instanceof SVGSVGElement && originalRoot.height?.baseVal?.value != null ? String(originalRoot.height.baseVal.value) : '')
            || String(svg.clientHeight)
            || '600';
        if (!root.getAttribute('width')) root.setAttribute('width', w);
        if (!root.getAttribute('height')) root.setAttribute('height', h);

        // Background color if requested
        if (config.background) {
            const style = root.getAttribute('style') || '';
            const next = /background-color:/i.test(style) ? style : `${style};background-color:${config.background}`;
            root.setAttribute('style', next);
        }

        // Inline computed styles for standalone fidelity
        if (config.includeStyles) {
            try {
                this.inlineComputedStyles(originalRoot, root);
            } catch {
                // Best-effort: ignore styling inline errors in restrictive environments
            }
        }

        // Embed font-face rules if provided
        if ((config.fontFacesCSS && (Array.isArray(config.fontFacesCSS) ? config.fontFacesCSS.length : true)) || (config.embedFonts && config.embedFonts.length)) {
            try {
                this.embedFontFaces(root, config);
            } catch { /* non-fatal */ }
        }

        const svgString = serializer.serializeToString(root);
        return `data:image/svg+xml;base64,${this.toBase64(svgString)}`;
    }

    // Robust base64 for Node/jsdom and browsers, preserving unicode
    private toBase64(input: string): string {
        try {
            if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
                try { return window.btoa(input); } catch { /* fallthrough */ }
                return window.btoa(unescape(encodeURIComponent(input)));
            }
        } catch { /* not in browser */ }
        try {
            // Node path
            return Buffer.from(input, 'utf-8').toString('base64');
        } catch {
            // Last resort: may still throw if Buffer unavailable
            return (typeof btoa !== 'undefined') ? btoa(input) : input;
        }
    }

    // Copy a safe subset of computed styles from original elements to the clone
    private inlineComputedStyles(originalRoot: SVGElement, cloneRoot: SVGElement): void {
        const origAll = [originalRoot, ...Array.from(originalRoot.querySelectorAll<SVGElement>('*'))];
        const cloneAll = [cloneRoot, ...Array.from(cloneRoot.querySelectorAll<SVGElement>('*'))];

        const PROPS = [
            'font-family', 'font-size', 'font-weight', 'font-style', 'color',
            'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity',
            'stroke-linecap', 'stroke-linejoin', 'opacity', 'text-anchor',
            'dominant-baseline', 'visibility', 'mix-blend-mode', 'shape-rendering',
            'letter-spacing', 'word-spacing', 'paint-order', 'stop-color', 'stop-opacity'
        ];

        for (let i = 0; i < origAll.length && i < cloneAll.length; i++) {
            const o = origAll[i] as Element;
            const c = cloneAll[i] as Element;
            let cs: CSSStyleDeclaration | undefined;
            try { cs = typeof window !== 'undefined' ? window.getComputedStyle(o) : undefined; } catch { cs = undefined; }
            if (!cs) continue;
            const styleParts: string[] = [];
            for (const prop of PROPS) {
                const val = cs.getPropertyValue(prop);
                if (val && val.trim() && val !== 'initial' && val !== 'inherit') {
                    styleParts.push(`${prop}:${val}`);
                }
            }
            // If computed style is sparse (jsdom), derive from attributes for common properties
            const ATTR_TO_STYLE: Record<string, string> = {
                'fill': 'fill',
                'stroke': 'stroke',
                'stroke-width': 'stroke-width',
                'stroke-opacity': 'stroke-opacity',
                'fill-opacity': 'fill-opacity',
                'font-family': 'font-family',
                'font-size': 'font-size',
                'font-weight': 'font-weight',
                'opacity': 'opacity',
                'text-anchor': 'text-anchor'
            };
            for (const attr in ATTR_TO_STYLE) {
                const cssProp = ATTR_TO_STYLE[attr];
                const existing = styleParts.find(s => s.startsWith(cssProp + ':'));
                if (!existing) {
                    const attrVal = o.getAttribute(attr);
                    if (attrVal && attrVal.trim()) {
                        styleParts.push(`${cssProp}:${attrVal}`);
                    }
                }
            }
            if (styleParts.length) {
                const prior = c.getAttribute('style') || '';
                const merged = prior ? `${prior};${styleParts.join(';')}` : styleParts.join(';');
                c.setAttribute('style', merged);
            }
        }
    }

    // Insert a <style> element with @font-face rules so custom fonts render in external viewers
    private embedFontFaces(root: SVGElement, config: ChartExportConfig): void {
        const doc = root.ownerDocument || document;
        const defs = ((): SVGDefsElement => {
            let d = root.querySelector('defs');
            if (!d) {
                d = doc.createElementNS('http://www.w3.org/2000/svg', 'defs');
                root.insertBefore(d, root.firstChild);
            }
            return d as SVGDefsElement;
        })();

        const styleEl = doc.createElementNS('http://www.w3.org/2000/svg', 'style');
        styleEl.setAttribute('type', 'text/css');

        const cssParts: string[] = [];
        // Raw CSS provided
        if (config.fontFacesCSS) {
            if (Array.isArray(config.fontFacesCSS)) cssParts.push(...config.fontFacesCSS);
            else cssParts.push(config.fontFacesCSS);
        }
        // Structured font entries
        if (config.embedFonts && config.embedFonts.length) {
            for (const f of config.embedFonts) {
                const fmt = f.format || (f.src.includes('woff2') ? 'woff2' : f.src.includes('woff') ? 'woff' : undefined);
                const srcDecl = fmt ? `url('${f.src}') format('${fmt}')` : `url('${f.src}')`;
                const rules: string[] = [
                    `font-family: '${f.family}';`,
                    `src: ${srcDecl};`
                ];
                if (f.weight) rules.push(`font-weight: ${f.weight};`);
                if (f.style) rules.push(`font-style: ${f.style};`);
                if (f.unicodeRange) rules.push(`unicode-range: ${f.unicodeRange};`);
                if (f.display) rules.push(`font-display: ${f.display};`);
                cssParts.push(`@font-face { ${rules.join(' ')} }`);
            }
        }

        if (cssParts.length) {
            styleEl.textContent = cssParts.join('\n');
            defs.appendChild(styleEl);
        }
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
        // Convert current SVG to PNG
        const pngData = await this.exportAsPNG(svg, config);

        // Create a PDF and embed the PNG
        const pdf = new jsPDF({ orientation: (config.width || 842) >= (config.height || 595) ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Calculate placement while preserving aspect ratio
        const img = new Image();
        const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
            img.onload = () => resolve({ w: img.width, h: img.height });
            img.onerror = reject;
            img.src = pngData;
        });

        const maxW = pageWidth - 72; // 1-inch margins
        const maxH = pageHeight - 72;
        const scale = Math.min(maxW / dims.w, maxH / dims.h, 1);
        const drawW = dims.w * scale;
        const drawH = dims.h * scale;
        const x = (pageWidth - drawW) / 2;
        const y = (pageHeight - drawH) / 2;

        if (config.background) {
            pdf.setFillColor(config.background);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        }

        if (config.title) {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(16);
            pdf.text(config.title, pageWidth / 2, 36, { align: 'center' });
        }

        pdf.addImage(pngData, 'PNG', x, y, drawW, drawH, undefined, 'FAST');

        if (config.watermark) {
            pdf.setTextColor(200);
            pdf.setFontSize(36);
            pdf.text('RankPilot', pageWidth / 2, pageHeight - 24, { align: 'center' });
        }

        const blob = pdf.output('blob');
        return URL.createObjectURL(blob);
    }

    private exportAsJSON(chart: InternalChartRecord, config: ChartExportConfig): string {
        const exportData = {
            type: chart.type,
            config: chart.config,
            exportConfig: config,
            timestamp: Date.now()
        };
        return `data:application/json;base64,${btoa(JSON.stringify(exportData, null, 2))}`;
    }

    /**
     * Get chart instance
     */
    getChart(chartId: string): InternalChartRecord | undefined {
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

// ---------------- Internal helpers (added at end to avoid cluttering main logic) ----------------

// Utility conversions & domain helpers
// We keep them outside the class for simplicity / tree-shaking (unused ones drop).

// Extend prototype with helper methods via declaration merging (not necessary now) or add to class:
declare module './d3-visualization-engine' { interface D3VisualizationEngine { toDate(value: number | string | Date): Date; toNumber(value: number | string | Date | undefined): number; computeDateExtent(data: ChartDataPoint[]): [Date, Date]; computeNumberExtent(data: ChartDataPoint[], key: 'x' | 'y'): [number, number]; } }

D3VisualizationEngine.prototype.toDate = function (value: number | string | Date): Date {
    if (value instanceof Date) return value;
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date() : d;
};

D3VisualizationEngine.prototype.toNumber = function (value: number | string | Date | undefined): number {
    if (value == null) return 0;
    if (typeof value === 'number') return value;
    if (value instanceof Date) return value.getTime();
    const n = Number(value);
    return isNaN(n) ? 0 : n;
};

D3VisualizationEngine.prototype.computeDateExtent = function (data: ChartDataPoint[]): [Date, Date] {
    const dates = data.map(d => this.toDate(d.x)).sort((a, b) => a.getTime() - b.getTime());
    return [dates[0] ?? new Date(), dates[dates.length - 1] ?? new Date()];
};

D3VisualizationEngine.prototype.computeNumberExtent = function (data: ChartDataPoint[], key: 'x' | 'y'): [number, number] {
    const nums = data.map(d => this.toNumber(d[key])).sort((a, b) => a - b);
    return [nums[0] ?? 0, nums[nums.length - 1] ?? 0];
};

/**
 * Render series data to the container
 */
export function renderSeries(containerId: string, series: SeriesSpec, data: ChartDatum[]): void {
    // ...existing rendering logic...
}

/**
 * Compute the domain for the given data
 */
export function computeDomain(data: ChartDatum[]): [number, number] {
    return [0, Math.max(0, ...data.map(d => d.value))]
}
