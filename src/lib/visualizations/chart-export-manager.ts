/**
 * Advanced Chart Export System
 * Implements Priority 2 Enterprise Features from DevReady Phase 3
 * 
 * Features:
 * - PDF export with jsPDF integration
 * - Excel export with xlsx library
 * - Multiple chart formats (PNG, SVG, PDF, JSON)
 * - Professional report generation
 * - Custom branding and watermarks
 */

import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { ChartExportConfig } from './d3-visualization-engine';

export interface ExportBatch {
    id: string;
    charts: string[];
    format: 'pdf' | 'excel' | 'json' | 'zip';
    config: BatchExportConfig;
}

export interface BatchExportConfig {
    title?: string;
    subtitle?: string;
    author?: string;
    company?: string;
    logo?: string;
    watermark?: boolean;
    includeMetadata?: boolean;
    includeTimestamp?: boolean;
    pageOrientation?: 'portrait' | 'landscape';
    margins?: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
}

export interface ExcelWorkbook {
    sheets: ExcelSheet[];
    metadata: {
        title: string;
        author: string;
        created: Date;
        company?: string;
    };
}

export interface ExcelSheet {
    name: string;
    data: any[][];
    charts?: ExcelChart[];
    formatting?: ExcelFormatting;
}

export interface ExcelChart {
    type: 'line' | 'bar' | 'pie' | 'scatter';
    dataRange: string;
    position: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    title?: string;
}

export interface ExcelFormatting {
    headerStyle?: {
        font?: { bold?: boolean; size?: number; color?: string; };
        fill?: { fgColor?: string; };
        alignment?: { horizontal?: string; vertical?: string; };
    };
    cellStyle?: {
        font?: { size?: number; color?: string; };
        fill?: { fgColor?: string; };
    };
}

export class ChartExportManager {
    private exportHistory: Map<string, any> = new Map();
    private batchQueue: Map<string, ExportBatch> = new Map();

    constructor() {
        // Initialize export history tracking
        this.loadExportHistory();
    }

    /**
     * Export single chart with enhanced options
     */
    async exportChart(
        chartId: string,
        chartData: any,
        config: ChartExportConfig
    ): Promise<string> {
        try {
            let result: string;

            switch (config.format) {
                case 'pdf':
                    result = await this.exportChartToPDF(chartData, config);
                    break;
                case 'excel':
                    result = await this.exportChartToExcel(chartData, config);
                    break;
                case 'png':
                    result = await this.exportChartToPNG(chartData, config);
                    break;
                case 'svg':
                    result = this.exportChartToSVG(chartData, config);
                    break;
                case 'json':
                    result = this.exportChartToJSON(chartData, config);
                    break;
                default:
                    throw new Error(`Unsupported export format: ${config.format}`);
            }

            // Track export in history
            this.addToExportHistory(chartId, config, result);

            return result;
        } catch (error) {
            console.error('Chart export failed:', error);
            throw error;
        }
    }

    /**
     * Export multiple charts to PDF report
     */
    async exportBatchToPDF(batchId: string): Promise<string> {
        const batch = this.batchQueue.get(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }

        const pdf = new jsPDF({
            orientation: batch.config.pageOrientation || 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margins = batch.config.margins || { top: 20, right: 20, bottom: 20, left: 20 };

        // Add title page
        this.addPDFTitlePage(pdf, batch.config, pageWidth, pageHeight, margins);

        // Add charts
        for (let i = 0; i < batch.charts.length; i++) {
            const chartId = batch.charts[i];

            if (i > 0) {
                pdf.addPage();
            }

            await this.addChartToPDF(pdf, chartId, pageWidth, pageHeight, margins);
        }

        // Add metadata and watermark
        if (batch.config.watermark) {
            this.addPDFWatermark(pdf, batch.config.company || 'RankPilot');
        }

        if (batch.config.includeMetadata) {
            this.addPDFMetadata(pdf, batch.config);
        }

        const pdfBlob = pdf.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);

        // Track batch export
        this.addToBatchHistory(batchId, 'pdf', pdfUrl);

        return pdfUrl;
    }

    /**
     * Export multiple charts to Excel workbook
     */
    async exportBatchToExcel(batchId: string): Promise<string> {
        const batch = this.batchQueue.get(batchId);
        if (!batch) {
            throw new Error(`Batch ${batchId} not found`);
        }

        const workbook: ExcelWorkbook = {
            sheets: [],
            metadata: {
                title: batch.config.title || 'Chart Export',
                author: batch.config.author || 'RankPilot',
                created: new Date(),
                company: batch.config.company
            }
        };

        // Create summary sheet
        const summarySheet = this.createSummarySheet(batch);
        workbook.sheets.push(summarySheet);

        // Add individual chart sheets
        for (const chartId of batch.charts) {
            const chartSheet = await this.createChartSheet(chartId);
            workbook.sheets.push(chartSheet);
        }

        // Generate Excel file
        const wb = XLSX.utils.book_new();

        // Add metadata
        wb.Props = {
            Title: workbook.metadata.title,
            Author: workbook.metadata.author,
            CreatedDate: workbook.metadata.created,
            Company: workbook.metadata.company
        };

        // Add sheets
        workbook.sheets.forEach(sheet => {
            const ws = XLSX.utils.aoa_to_sheet(sheet.data);

            // Apply formatting if available
            if (sheet.formatting) {
                this.applyExcelFormatting(ws, sheet.formatting);
            }

            XLSX.utils.book_append_sheet(wb, ws, sheet.name);
        });

        // Generate binary
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const excelUrl = URL.createObjectURL(excelBlob);

        // Track batch export
        this.addToBatchHistory(batchId, 'excel', excelUrl);

        return excelUrl;
    }

    /**
     * Create export batch
     */
    createBatch(chartIds: string[], format: 'pdf' | 'excel', config: BatchExportConfig): string {
        const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const batch: ExportBatch = {
            id: batchId,
            charts: chartIds,
            format,
            config
        };

        this.batchQueue.set(batchId, batch);
        return batchId;
    }

    /**
     * Get export history
     */
    getExportHistory(): any[] {
        return Array.from(this.exportHistory.values());
    }

    /**
     * Clear export history
     */
    clearExportHistory(): void {
        this.exportHistory.clear();
        this.saveExportHistory();
    }

    /**
     * Private helper methods
     */
    private async exportChartToPDF(chartData: any, config: ChartExportConfig): Promise<string> {
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Add title
        if (config.title) {
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text(config.title, pageWidth / 2, 20, { align: 'center' });
        }

        // Add chart image
        if (chartData.image) {
            const imgWidth = config.width || pageWidth - 40;
            const imgHeight = config.height || (imgWidth * 0.6);
            const x = (pageWidth - imgWidth) / 2;
            const y = config.title ? 35 : 20;

            pdf.addImage(chartData.image, 'PNG', x, y, imgWidth, imgHeight);
        }

        // Add timestamp
        if (config.watermark) {
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(128, 128, 128);
            pdf.text(`Generated by RankPilot on ${new Date().toLocaleString()}`, 10, pageHeight - 10);
        }

        const pdfBlob = pdf.output('blob');
        return URL.createObjectURL(pdfBlob);
    }

    private async exportChartToExcel(chartData: any, config: ChartExportConfig): Promise<string> {
        const workbook: ExcelWorkbook = {
            sheets: [
                {
                    name: 'Chart Data',
                    data: this.convertChartDataToTable(chartData),
                    formatting: {
                        headerStyle: {
                            font: { bold: true, size: 12, color: '#FFFFFF' },
                            fill: { fgColor: '#4F46E5' },
                            alignment: { horizontal: 'center', vertical: 'center' }
                        },
                        cellStyle: {
                            font: { size: 10 }
                        }
                    }
                }
            ],
            metadata: {
                title: config.title || 'Chart Export',
                author: 'RankPilot',
                created: new Date()
            }
        };

        return this.generateExcelFile(workbook);
    }

    private async exportChartToPNG(chartData: any, config: ChartExportConfig): Promise<string> {
        // This would typically use the chart's SVG element
        // For now, return a placeholder
        return chartData.image || 'data:image/png;base64,';
    }

    private exportChartToSVG(chartData: any, config: ChartExportConfig): string {
        return chartData.svg || '<svg></svg>';
    }

    private exportChartToJSON(chartData: any, config: ChartExportConfig): string {
        const exportData = {
            chart: chartData,
            config,
            exported: new Date().toISOString(),
            version: '1.0'
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        return URL.createObjectURL(blob);
    }

    private addPDFTitlePage(pdf: jsPDF, config: BatchExportConfig, pageWidth: number, pageHeight: number, margins: any): void {
        // Add logo if provided
        if (config.logo) {
            pdf.addImage(config.logo, 'PNG', margins.left, margins.top, 40, 20);
        }

        // Add title
        if (config.title) {
            pdf.setFontSize(24);
            pdf.setFont('helvetica', 'bold');
            pdf.text(config.title, pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });
        }

        // Add subtitle
        if (config.subtitle) {
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'normal');
            pdf.text(config.subtitle, pageWidth / 2, pageHeight / 2, { align: 'center' });
        }

        // Add author and company
        if (config.author || config.company) {
            pdf.setFontSize(12);
            const authorText = config.author ? `By: ${config.author}` : '';
            const companyText = config.company ? `Company: ${config.company}` : '';

            let yPos = pageHeight / 2 + 40;
            if (authorText) {
                pdf.text(authorText, pageWidth / 2, yPos, { align: 'center' });
                yPos += 10;
            }
            if (companyText) {
                pdf.text(companyText, pageWidth / 2, yPos, { align: 'center' });
            }
        }

        // Add timestamp
        if (config.includeTimestamp) {
            pdf.setFontSize(10);
            pdf.setTextColor(128, 128, 128);
            pdf.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - margins.bottom, { align: 'center' });
        }
    }

    private async addChartToPDF(pdf: jsPDF, chartId: string, pageWidth: number, pageHeight: number, margins: any): Promise<void> {
        // This would fetch the actual chart data and image
        // For now, add a placeholder
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Chart: ${chartId}`, margins.left, margins.top + 20);

        // Add chart placeholder
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(margins.left, margins.top + 30, pageWidth - margins.left - margins.right, 100);

        pdf.setFontSize(10);
        pdf.setTextColor(128, 128, 128);
        pdf.text('Chart image would be rendered here', pageWidth / 2, margins.top + 80, { align: 'center' });
    }

    private addPDFWatermark(pdf: jsPDF, text: string): void {
        const pageCount = pdf.getNumberOfPages();

        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setTextColor(220, 220, 220);
            pdf.setFontSize(50);
            pdf.saveGraphicsState();
            pdf.text(text, pdf.internal.pageSize.getWidth() / 2, pdf.internal.pageSize.getHeight() / 2, {
                align: 'center',
                angle: 45
            });
            pdf.restoreGraphicsState();
        }
    }

    private addPDFMetadata(pdf: jsPDF, config: BatchExportConfig): void {
        pdf.setProperties({
            title: config.title || 'Chart Export',
            subject: config.subtitle || 'Generated by RankPilot',
            author: config.author || 'RankPilot',
            creator: 'RankPilot Chart Export System',
            keywords: 'charts, analytics, SEO, RankPilot'
        });
    }

    private createSummarySheet(batch: ExportBatch): ExcelSheet {
        const data: any[][] = [
            ['Chart Export Summary'],
            [''],
            ['Export Details'],
            ['Batch ID:', batch.id],
            ['Generated:', new Date().toLocaleString()],
            ['Format:', batch.format],
            ['Charts Count:', batch.charts.length.toString()],
            [''],
            ['Chart List'],
            ['Chart ID', 'Status']
        ];

        // Add chart list
        batch.charts.forEach(chartId => {
            data.push([chartId, 'Exported']);
        });

        return {
            name: 'Summary',
            data,
            formatting: {
                headerStyle: {
                    font: { bold: true, size: 14, color: '#FFFFFF' },
                    fill: { fgColor: '#4F46E5' }
                }
            }
        };
    }

    private async createChartSheet(chartId: string): Promise<ExcelSheet> {
        // This would fetch actual chart data
        // For now, create a sample sheet
        const data: any[][] = [
            [`Chart Data: ${chartId}`],
            [''],
            ['X Axis', 'Y Axis', 'Series'],
            ['Jan', '100', 'Revenue'],
            ['Feb', '150', 'Revenue'],
            ['Mar', '120', 'Revenue'],
            ['Apr', '180', 'Revenue'],
            ['May', '200', 'Revenue']
        ];

        return {
            name: chartId.substring(0, 31), // Excel sheet name limit
            data,
            formatting: {
                headerStyle: {
                    font: { bold: true, size: 12, color: '#FFFFFF' },
                    fill: { fgColor: '#10B981' }
                }
            }
        };
    }

    private applyExcelFormatting(worksheet: any, formatting: ExcelFormatting): void {
        // Apply header formatting to first row
        if (formatting.headerStyle) {
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
                if (!worksheet[cellAddress]) continue;

                worksheet[cellAddress].s = formatting.headerStyle;
            }
        }

        // Apply cell formatting to data rows
        if (formatting.cellStyle) {
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
            for (let row = 1; row <= range.e.r; row++) {
                for (let col = range.s.c; col <= range.e.c; col++) {
                    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                    if (!worksheet[cellAddress]) continue;

                    worksheet[cellAddress].s = formatting.cellStyle;
                }
            }
        }
    }

    private convertChartDataToTable(chartData: any): any[][] {
        // Convert chart data to table format for Excel
        const headers = ['X', 'Y', 'Series', 'Value'];
        const rows = [headers];

        if (chartData.data && Array.isArray(chartData.data)) {
            chartData.data.forEach((point: any) => {
                rows.push([
                    point.x || '',
                    point.y || '',
                    point.series || 'Default',
                    point.value || point.y || ''
                ]);
            });
        }

        return rows;
    }

    private generateExcelFile(workbook: ExcelWorkbook): string {
        const wb = XLSX.utils.book_new();

        // Add metadata
        wb.Props = {
            Title: workbook.metadata.title,
            Author: workbook.metadata.author,
            CreatedDate: workbook.metadata.created,
            Company: workbook.metadata.company
        };

        // Add sheets
        workbook.sheets.forEach(sheet => {
            const ws = XLSX.utils.aoa_to_sheet(sheet.data);

            if (sheet.formatting) {
                this.applyExcelFormatting(ws, sheet.formatting);
            }

            XLSX.utils.book_append_sheet(wb, ws, sheet.name);
        });

        // Generate binary
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        return URL.createObjectURL(excelBlob);
    }

    private addToExportHistory(chartId: string, config: ChartExportConfig, result: string): void {
        const historyEntry = {
            id: `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            chartId,
            config,
            result,
            timestamp: new Date().toISOString(),
            type: 'single'
        };

        this.exportHistory.set(historyEntry.id, historyEntry);
        this.saveExportHistory();
    }

    private addToBatchHistory(batchId: string, format: string, result: string): void {
        const historyEntry = {
            id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            batchId,
            format,
            result,
            timestamp: new Date().toISOString(),
            type: 'batch'
        };

        this.exportHistory.set(historyEntry.id, historyEntry);
        this.saveExportHistory();
    }

    private loadExportHistory(): void {
        try {
            const saved = localStorage.getItem('chartExportHistory');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.exportHistory = new Map(parsed);
            }
        } catch (error) {
            console.warn('Failed to load export history:', error);
        }
    }

    private saveExportHistory(): void {
        try {
            const serialized = JSON.stringify(Array.from(this.exportHistory.entries()));
            localStorage.setItem('chartExportHistory', serialized);
        } catch (error) {
            console.warn('Failed to save export history:', error);
        }
    }
}

/**
 * Server-side artifact generation helpers for API usage.
 * Produces raw buffers instead of object URLs for Node.js environments.
 */
export async function generateServerArtifact(
    format: 'pdf' | 'excel' | 'json' | 'png' | 'svg',
    chartData: any,
    config: Partial<ChartExportConfig> = {}
): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
    if (format === 'pdf') {
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        if (config.title) {
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text(config.title, pageWidth / 2, 20, { align: 'center' });
        }
        if (chartData?.image) {
            const imgWidth = (config as any).width || pageWidth - 40;
            const imgHeight = (config as any).height || imgWidth * 0.6;
            const x = (pageWidth - imgWidth) / 2;
            const y = config.title ? 35 : 20;
            try { pdf.addImage(chartData.image, 'PNG', x, y, imgWidth, imgHeight); } catch { /* ignore addImage failures */ }
        }
        if ((config as any)?.watermark) {
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(128, 128, 128);
            pdf.text(`Generated on ${new Date().toISOString()}`, 10, pageHeight - 10);
        }
        const ab = pdf.output('arraybuffer') as ArrayBuffer;
        const buffer = Buffer.from(new Uint8Array(ab));
        return { buffer, contentType: 'application/pdf', ext: 'pdf' };
    }

    if (format === 'excel') {
        // Minimal single-sheet workbook with chart data table
        const wb = XLSX.utils.book_new();
        const table = Array.isArray(chartData?.table)
            ? chartData.table
            : Array.isArray(chartData?.data)
                ? chartData.data
                : [["Chart Export"], [new Date().toISOString()]];
        const ws = XLSX.utils.aoa_to_sheet(table);
        XLSX.utils.book_append_sheet(wb, ws, 'Chart Data');
        // Node: write as Buffer
        const buffer: Buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as unknown as Buffer;
        return { buffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx' };
    }

    if (format === 'json') {
        const payload = {
            chart: chartData,
            config,
            exported: new Date().toISOString(),
            version: '1.0'
        };
        const buffer = Buffer.from(JSON.stringify(payload, null, 2), 'utf-8');
        return { buffer, contentType: 'application/json', ext: 'json' };
    }

    if (format === 'png') {
        // Prefer provided PNG data URL when available
        const dataUrl: string | undefined = chartData?.image;
        const match = dataUrl?.match(/^data:([^;]+);base64,(.*)$/i);
        if (match) {
            const [, mime, b64] = match;
            const buffer = Buffer.from(b64, 'base64');
            return { buffer, contentType: mime || 'image/png', ext: 'png' };
        }
        // Otherwise, rasterize from SVG markup if provided
        const svg: string | undefined = chartData?.svg;
        if (typeof svg === 'string' && svg.trim().length) {
            // Lazy import to avoid bundling in browsers
            const sharpMod = await import('sharp');
            const sharp = (sharpMod as any).default || sharpMod;
            const img = sharp(Buffer.from(svg, 'utf-8'), { density: 300 });
            const w = (config.width && Number(config.width)) || undefined;
            const h = (config.height && Number(config.height)) || undefined;
            const pipeline = (w || h) ? img.resize(w, h, { fit: 'inside' }) : img;
            const buffer: Buffer = await pipeline.png().toBuffer();
            return { buffer, contentType: 'image/png', ext: 'png' };
        }
        throw new Error('PNG server export requires data URL in chartData.image or svg markup in chartData.svg');
    }

    if (format === 'svg') {
        // Expect raw SVG markup in chartData.svg
        const svg: string | undefined = chartData?.svg;
        if (typeof svg === 'string' && svg.trim().length) {
            const buffer = Buffer.from(svg, 'utf-8');
            return { buffer, contentType: 'image/svg+xml', ext: 'svg' };
        }
        throw new Error('SVG server export requires svg markup in chartData.svg');
    }

    throw new Error(`Unsupported server export format: ${format}`);
}

// Export singleton instance
export const chartExportManager = new ChartExportManager();
