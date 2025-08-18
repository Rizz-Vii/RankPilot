/**
 * Server-only artifact generation for visualizations.
 * Splitting this out avoids importing client code on the server and keeps SSR clean.
 */
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { ExportFormat, ServerChartArtifactData } from '@/types/visualization-exports';

// Helper to safely extract a 2D table from mixed chart data shapes
function extractTable(input: ServerChartArtifactData | { table?: unknown[][]; data?: unknown[] }): unknown[][] {
  const anyInput = input as any; // localized cast boundary
  if (Array.isArray(anyInput?.table)) return anyInput.table as unknown[][];
  if (Array.isArray(anyInput?.data)) return anyInput.data.map((d: unknown) => Array.isArray(d) ? d : [d]);
  return [["Chart Export"], [new Date().toISOString()]];
}

export interface ServerArtifactConfig {
  title?: string;
  width?: number;
  height?: number;
  watermark?: boolean;
}

export async function generateServerArtifact(
  format: ExportFormat,
  chartData: ServerChartArtifactData | { table?: unknown[][]; data?: unknown[]; svg?: string; image?: string },
  config: Partial<ServerArtifactConfig> = {}
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
      const imgWidth = config.width || pageWidth - 40;
      const imgHeight = config.height || imgWidth * 0.6;
      const x = (pageWidth - imgWidth) / 2;
      const y = config.title ? 35 : 20;
      try { pdf.addImage(chartData.image, 'PNG', x, y, imgWidth, imgHeight); } catch { /* ignore addImage failures */ }
    }
    if (config.watermark) {
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
    const wb = XLSX.utils.book_new();
    const table = extractTable(chartData);
    const ws = XLSX.utils.aoa_to_sheet(table);
    XLSX.utils.book_append_sheet(wb, ws, 'Chart Data');
    const buffer: Buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as unknown as Buffer;
    return { buffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx' };
  }

  if (format === 'json') {
    const payload = { chart: chartData, config, exported: new Date().toISOString(), version: '1.0' };
    const buffer = Buffer.from(JSON.stringify(payload, null, 2), 'utf-8');
    return { buffer, contentType: 'application/json', ext: 'json' };
  }

  if (format === 'png') {
    const dataUrl: string | undefined = chartData?.image;
    const match = dataUrl?.match(/^data:([^;]+);base64,(.*)$/i);
    if (match) {
      const [, mime, b64] = match;
      const buffer = Buffer.from(b64, 'base64');
      return { buffer, contentType: mime || 'image/png', ext: 'png' };
    }
    const svg: string | undefined = chartData?.svg;
    if (typeof svg === 'string' && svg.trim().length) {
      const sharpMod: any = await import('sharp');
      const sharp = sharpMod.default || sharpMod;
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
    const svg: string | undefined = chartData?.svg;
    if (typeof svg === 'string' && svg.trim().length) {
      const buffer = Buffer.from(svg, 'utf-8');
      return { buffer, contentType: 'image/svg+xml', ext: 'svg' };
    }
    throw new Error('SVG server export requires svg markup in chartData.svg');
  }

  throw new Error(`Unsupported server export format: ${format}`);
}
