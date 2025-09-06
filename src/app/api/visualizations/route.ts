/**
 * D3.js Visualizations API Routes
 * Implements Priority 2 Enterprise Features from DevReady Phase 3
 *
 * Features:
 * - RESTful API for chart management
 * - Export functionality with multiple formats
 * - Real-time data streaming
 * - Dashboard persistence
 */

import { adminAuth, adminDb } from '@/lib/firebase-admin';
// Note: adminStorage will be imported after fixing corrupted code below.
import { enforceProvenance, withProvenance } from '@/lib/middleware/provenance';
import { generateChartExport, generateDashboardExport, persistExportArtifact } from '@/lib/visualizations/server-exports';
import type { ExportFormat, ServerChartArtifactData, ServerDashboardArtifactData } from '@/types/visualization-exports';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const POST = withProvenance(async function POST(request: NextRequest) {
    try {
        // Verify authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(enforceProvenance({ error: 'Unauthorized' }, { path: 'visualizations', note: 'auth' }), { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (error) {
            console.warn('[Visualizations API] Firebase admin initialization error:', error);
            return NextResponse.json(enforceProvenance({ error: 'Authentication service unavailable' }, { path: 'visualizations', note: 'auth' }), { status: 503 });
        }
        const userId = decodedToken.uid;
        // Check subscription tier access
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json(enforceProvenance({ error: 'User not found' }, { path: 'visualizations', note: 'not_found' }), { status: 404 });
        }
        const userData = userDoc.data()!;
        const subscriptionTier = userData.subscriptionTier || 'free';
        if (!['agency', 'enterprise', 'admin'].includes(subscriptionTier)) {
            return NextResponse.json(enforceProvenance({ error: 'Advanced visualizations require Agency tier or higher' }, { path: 'visualizations', note: 'tier' }), { status: 403 });
        }
        const raw = await request.text();
        let body: unknown = {};
        try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
        const action: string | undefined = (body && typeof body === 'object') ? (body as { action?: unknown }).action as string | undefined : undefined;
        if (!action || typeof action !== 'string') {
            return NextResponse.json(enforceProvenance({ error: 'Invalid action' }, { path: 'visualizations', note: 'invalid_action' }), { status: 400 });
        }
        const data = (body && typeof body === 'object') ? (body as { data?: unknown }).data : undefined;
        switch (action) {
            case 'create_chart':
                return await createChart(userId, data);
            case 'update_chart':
                return await updateChart(userId, data);
            case 'export_chart':
                return await exportChart(userId, data);
            case 'create_dashboard':
                return await createDashboard(userId, data);
            case 'update_dashboard':
                return await updateDashboard(userId, data);
            case 'export_dashboard':
                return await exportDashboard(userId, data);
            default:
                return NextResponse.json(enforceProvenance({ error: 'Invalid action' }, { path: 'visualizations', note: 'invalid_action' }), { status: 400 });
        }
    } catch (error) {
        console.error('Visualizations API error:', error);
        return NextResponse.json(enforceProvenance({ error: 'Internal server error' }, { path: 'visualizations', note: 'exception' }), { status: 500 });
    }
}, { path: 'visualizations' });

export const GET = withProvenance(async function GET(request: NextRequest) {
    try {
        // Verify authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(enforceProvenance({ error: 'Unauthorized' }, { path: 'visualizations', note: 'auth' }), { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;
        const url = new URL(request.url);
        const type = url.searchParams.get('type');
        const id = url.searchParams.get('id');
        switch (type) {
            case 'charts':
                return await getCharts(userId);
            case 'chart':
                if (!id) {
                    return NextResponse.json(enforceProvenance({ error: 'Chart ID required' }, { path: 'visualizations', note: 'validation' }), { status: 400 });
                }
                return await getChart(userId, id);
            case 'dashboards':
                return await getDashboards(userId);
            case 'dashboard':
                if (!id) {
                    return NextResponse.json(enforceProvenance({ error: 'Dashboard ID required' }, { path: 'visualizations', note: 'validation' }), { status: 400 });
                }
                return await getDashboard(userId, id);
            default:
                return NextResponse.json(enforceProvenance({ error: 'Invalid type' }, { path: 'visualizations', note: 'invalid_type' }), { status: 400 });
        }
    } catch (error) {
        console.error('Visualizations API error:', error);
        return NextResponse.json(enforceProvenance({ error: 'Internal server error' }, { path: 'visualizations', note: 'exception' }), { status: 500 });
    }
}, { path: 'visualizations' });

export const DELETE = withProvenance(async function DELETE(request: NextRequest) {
    try {
        // Verify authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(enforceProvenance({ error: 'Unauthorized' }, { path: 'visualizations', note: 'auth' }), { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;
        const url = new URL(request.url);
        const type = url.searchParams.get('type');
        const id = url.searchParams.get('id');
        if (!type || !id) {
            return NextResponse.json(enforceProvenance({ error: 'Type and ID required' }, { path: 'visualizations', note: 'validation' }), { status: 400 });
        }
        switch (type) {
            case 'chart':
                return await deleteChart(userId, id);
            case 'dashboard':
                return await deleteDashboard(userId, id);
            default:
                return NextResponse.json(enforceProvenance({ error: 'Invalid type' }, { path: 'visualizations', note: 'invalid_type' }), { status: 400 });
        }
    } catch (error) {
        console.error('Visualizations API error:', error);
        return NextResponse.json(enforceProvenance({ error: 'Internal server error' }, { path: 'visualizations', note: 'exception' }), { status: 500 });
    }
}, { path: 'visualizations' });

// Chart Management Functions
interface ChartMetadata { title: string; description?: string; tags: string[]; created: Date; updated: Date; version: string }
interface ChartSettings { shared: boolean; exportEnabled: boolean; refreshInterval: number }
// TODO:TRACKD-DEFER:typing refine config/data structures for charts (currently loose for backward compatibility)
interface ChartDoc { id: string; userId: string; config?: Record<string, unknown>; data?: unknown[]; metadata: ChartMetadata; settings: ChartSettings }
type ChartCreateInput = Partial<Omit<ChartDoc, 'id' | 'userId' | 'metadata' | 'settings'>> & {
    id?: string; title?: string; description?: string; tags?: string[]; shared?: boolean; exportEnabled?: boolean; refreshInterval?: number;
};
function isObj(v: unknown): v is Record<string, unknown> { return !!v && typeof v === 'object'; }
async function createChart(userId: string, chartData: unknown) {
    const cd: ChartCreateInput = isObj(chartData) ? chartData as ChartCreateInput : {};
    const chartDoc: ChartDoc = {
        id: cd.id || `chart_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        userId,
        config: cd.config,
        data: Array.isArray(cd.data) ? cd.data : [],
        metadata: {
            title: cd.title || 'Untitled Chart',
            description: cd.description,
            tags: Array.isArray(cd.tags) ? cd.tags : [],
            created: new Date(),
            updated: new Date(),
            version: '1.0'
        },
        settings: {
            shared: !!cd.shared,
            exportEnabled: cd.exportEnabled !== false,
            refreshInterval: typeof cd.refreshInterval === 'number' ? cd.refreshInterval : 60000
        }
    };

    await adminDb.collection('visualizations').doc(chartDoc.id).set(chartDoc);

    return NextResponse.json(enforceProvenance({ success: true, chartId: chartDoc.id, message: 'Chart created successfully' }, { path: 'visualizations', note: 'create_chart' }));
}

type ChartUpdateInput = Partial<ChartCreateInput & { metadata: Partial<ChartMetadata>; settings: Partial<ChartSettings> }> & { chartId?: string };
async function updateChart(userId: string, updateData: unknown) {
    const ud: ChartUpdateInput = isObj(updateData) ? updateData as ChartUpdateInput : {};
    const { chartId, ...updates } = ud;

    if (!chartId) {
        return NextResponse.json({ error: 'Chart ID required' }, { status: 400 });
    }

    const chartRef = adminDb.collection('visualizations').doc(chartId);
    const chartDoc = await chartRef.get();

    if (!chartDoc.exists) {
        return NextResponse.json({ error: 'Chart not found' }, { status: 404 });
    }

    const chartData = chartDoc.data()!;
    if (chartData.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updatedChart: ChartDoc = {
        ...(chartData as ChartDoc),
        ...(updates as Record<string, unknown>),
        metadata: {
            ...(chartData.metadata || { title: 'Untitled Chart', tags: [], created: new Date(), updated: new Date(), version: '1.0' }),
            ...(isObj((updates as { metadata?: unknown }).metadata) ? (updates as { metadata?: Record<string, unknown> }).metadata : {}),
            updated: new Date()
        },
        settings: {
            ...(chartData.settings || { shared: false, exportEnabled: true, refreshInterval: 60000 }),
            ...(isObj((updates as { settings?: unknown }).settings) ? (updates as { settings?: Record<string, unknown> }).settings : {}),
        }
    };

    // Firestore update expects plain object; ensure no prototype & allow partial merge
    await chartRef.update({ ...updatedChart } as Record<string, unknown>);

    return NextResponse.json(enforceProvenance({ success: true, message: 'Chart updated successfully' }, { path: 'visualizations', note: 'update_chart' }));
}

interface ChartExportInput { chartId?: string; format?: string; config?: unknown; artifact?: unknown }
async function exportChart(userId: string, exportData: unknown) {
    const ed: ChartExportInput = isObj(exportData) ? exportData as ChartExportInput : {};
    const { chartId, format, config, artifact } = ed;

    if (!chartId || !format) {
        return NextResponse.json({ error: 'Chart ID and format required' }, { status: 400 });
    }

    const chartRef = adminDb.collection('visualizations').doc(chartId);
    const chartDoc = await chartRef.get();

    if (!chartDoc.exists) {
        return NextResponse.json({ error: 'Chart not found' }, { status: 404 });
    }

    const chartData = chartDoc.data()!;
    if (chartData.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Narrow export shape (avoid passing raw DocumentData which may include non-serializables)
    const cConfig = isObj((chartData as { config?: unknown }).config) ? (chartData as { config?: Record<string, unknown> }).config : {};
    const cData = Array.isArray((chartData as { data?: unknown }).data) ? (chartData as { data?: unknown[] }).data : [];
    const cMetadata = isObj((chartData as { metadata?: unknown }).metadata) ? (chartData as { metadata?: Record<string, unknown> }).metadata : {};
    const cSettings = isObj((chartData as { settings?: unknown }).settings) ? (chartData as { settings?: Record<string, unknown> }).settings : {};
    const exportBase = { id: chartId, userId, config: cConfig, data: cData, metadata: cMetadata, settings: cSettings };
    const allowedFormats = new Set(['png', 'jpeg', 'json', 'csv', 'pdf', 'svg', 'excel']);
    const safeFormat = (typeof format === 'string' && allowedFormats.has(format)) ? format : 'json';
    // Map client format -> server export format
    const mapToServer = (f: string): ExportFormat => {
        switch (f) {
            case 'png': return 'png';
            case 'pdf': return 'pdf';
            case 'svg': return 'svg';
            case 'excel': return 'excel';
            case 'json': return 'json';
            // Unsupported server paths -> json fallback (captures csv/jpeg today)
            default: return 'json';
        }
    };
    const serverFormat: ExportFormat = mapToServer(safeFormat);
    const chartExportBase: ServerChartArtifactData = {
        id: exportBase.id,
        userId: exportBase.userId,
        config: isObj(exportBase.config) ? { type: (exportBase.config as { type?: unknown }).type as string | undefined } : undefined,
        data: Array.isArray(exportBase.data) ? exportBase.data : undefined,
        metadata: isObj(exportBase.metadata)
            ? Object.fromEntries(
                Object.entries(exportBase.metadata).filter(([_, v]) => ['string', 'number', 'boolean'].includes(typeof v))
            ) as Record<string, string | number | boolean | undefined>
            : undefined,
        svg: undefined,
        image: undefined,
        previewImage: undefined
    };
    const chartExportConfig = isObj(config) ? config as Partial<{ title?: string; width?: number; height?: number }> : undefined;
    // Validate artifact if present (data URL or base64)
    let exportUrl: string;
    if (typeof artifact === 'string' && artifact.length > 0) {
        const isDataUrl = /^data:[^;]+;base64,[a-z0-9+/=]+$/i.test(artifact);
        const isBase64 = /^[a-z0-9+/=]+$/i.test(artifact);
        if (!(isDataUrl || isBase64)) {
            return NextResponse.json({ error: 'Invalid artifact encoding' }, { status: 400 });
        }
        exportUrl = await persistExportArtifact({ userId, kind: 'chart', id: chartId, format: safeFormat, artifact, metadata: { chartType: chartExportBase.config?.type } });
    } else {
        exportUrl = await generateChartExport(chartExportBase, serverFormat, chartExportConfig);
    }

    // Track export in analytics
    await adminDb.collection('analytics').add({
        userId,
        action: 'chart_export',
        chartId,
        format,
        timestamp: new Date(),
        metadata: {
            chartType: chartData.config?.type,
            exportConfig: config
        }
    });

    return NextResponse.json(enforceProvenance({ success: true, exportUrl, message: 'Chart exported successfully' }, { path: 'visualizations', note: 'export_chart' }));
}

async function getCharts(userId: string) {
    const chartsSnapshot = await adminDb
        .collection('visualizations')
        .where('userId', '==', userId)
        .orderBy('metadata.updated', 'desc')
        .get();

    const charts = chartsSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) } as Record<string, unknown>));

    return NextResponse.json(enforceProvenance({ success: true, charts, count: charts.length }, { path: 'visualizations', note: 'charts' }));
}

async function getChart(userId: string, chartId: string) {
    const chartRef = adminDb.collection('visualizations').doc(chartId);
    const chartDoc = await chartRef.get();

    if (!chartDoc.exists) {
        return NextResponse.json({ error: 'Chart not found' }, { status: 404 });
    }

    const chartData = chartDoc.data()!;
    if (chartData.userId !== userId && !chartData.settings?.shared) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(enforceProvenance({ success: true, chart: { id: chartDoc.id, ...(chartData as Record<string, unknown>) } }, { path: 'visualizations', note: 'chart' }));
}

async function deleteChart(userId: string, chartId: string) {
    const chartRef = adminDb.collection('visualizations').doc(chartId);
    const chartDoc = await chartRef.get();

    if (!chartDoc.exists) {
        return NextResponse.json({ error: 'Chart not found' }, { status: 404 });
    }

    const chartData = chartDoc.data()!;
    if (chartData.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await chartRef.delete();

    return NextResponse.json(enforceProvenance({ success: true, message: 'Chart deleted successfully' }, { path: 'visualizations', note: 'delete_chart' }));
}

// Dashboard Management Functions
// TODO:TRACKD-DEFER:typing refine exportOptions shape
interface DashboardSettings { theme: string; refreshInterval: number; autoSave: boolean; shared: boolean; exportOptions: Record<string, unknown> }
interface DashboardMetadata { created: Date; updated: Date; version: string; tags: string[] }
// TODO:TRACKD-DEFER:typing specify widget discriminated union
interface DashboardDoc { id: string; userId: string; name: string; description?: string; widgets: unknown[]; settings: DashboardSettings; metadata: DashboardMetadata }
type DashboardCreateInput = Partial<Omit<DashboardDoc, 'id' | 'userId' | 'settings' | 'metadata'>> & { id?: string; theme?: string; refreshInterval?: number; autoSave?: boolean; shared?: boolean; exportOptions?: Record<string, unknown>; tags?: string[] };
async function createDashboard(userId: string, dashboardData: unknown) {
    const dd: DashboardCreateInput = isObj(dashboardData) ? dashboardData as DashboardCreateInput : {};
    const dashboardDoc: DashboardDoc = {
        id: dd.id || `dashboard_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        userId,
        name: dd.name || 'Untitled Dashboard',
        description: dd.description,
        widgets: Array.isArray(dd.widgets) ? dd.widgets : [],
        settings: {
            theme: dd.theme || 'light',
            refreshInterval: typeof dd.refreshInterval === 'number' ? dd.refreshInterval : 60000,
            autoSave: dd.autoSave !== false,
            shared: !!dd.shared,
            exportOptions: dd.exportOptions || {}
        },
        metadata: {
            created: new Date(),
            updated: new Date(),
            version: '1.0',
            tags: Array.isArray(dd.tags) ? dd.tags : []
        }
    };

    await adminDb.collection('dashboards').doc(dashboardDoc.id).set(dashboardDoc);

    return NextResponse.json(enforceProvenance({ success: true, dashboardId: dashboardDoc.id, message: 'Dashboard created successfully' }, { path: 'visualizations', note: 'create_dashboard' }));
}

type DashboardUpdateInput = Partial<DashboardCreateInput & { settings: Partial<DashboardSettings>; metadata: Partial<DashboardMetadata> }> & { dashboardId?: string };
async function updateDashboard(userId: string, updateData: unknown) {
    const ud: DashboardUpdateInput = isObj(updateData) ? updateData as DashboardUpdateInput : {};
    const { dashboardId, ...updates } = ud;

    if (!dashboardId) {
        return NextResponse.json({ error: 'Dashboard ID required' }, { status: 400 });
    }

    const dashboardRef = adminDb.collection('dashboards').doc(dashboardId);
    const dashboardDoc = await dashboardRef.get();

    if (!dashboardDoc.exists) {
        return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    const dashboardData = dashboardDoc.data()!;
    if (dashboardData.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updatedDashboard: DashboardDoc = {
        ...(dashboardData as DashboardDoc),
        ...(updates as Record<string, unknown>),
        metadata: {
            ...(dashboardData.metadata || { created: new Date(), updated: new Date(), version: '1.0', tags: [] }),
            ...(isObj((updates as { metadata?: unknown }).metadata) ? (updates as { metadata?: Record<string, unknown> }).metadata : {}),
            updated: new Date()
        },
        settings: {
            ...(dashboardData.settings || { theme: 'light', refreshInterval: 60000, autoSave: true, shared: false, exportOptions: {} }),
            ...(isObj((updates as { settings?: unknown }).settings) ? (updates as { settings?: Record<string, unknown> }).settings : {}),
        }
    };

    await dashboardRef.update({ ...updatedDashboard } as Record<string, unknown>);

    return NextResponse.json(enforceProvenance({ success: true, message: 'Dashboard updated successfully' }, { path: 'visualizations', note: 'update_dashboard' }));
}

interface DashboardExportInput { dashboardId?: string; format?: string; config?: unknown; artifact?: unknown }
async function exportDashboard(userId: string, exportData: unknown) {
    const ed: DashboardExportInput = isObj(exportData) ? exportData as DashboardExportInput : {};
    const { dashboardId, format, config, artifact } = ed;

    if (!dashboardId || !format) {
        return NextResponse.json({ error: 'Dashboard ID and format required' }, { status: 400 });
    }

    const dashboardRef = adminDb.collection('dashboards').doc(dashboardId);
    const dashboardDoc = await dashboardRef.get();

    if (!dashboardDoc.exists) {
        return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    const dashboardData = dashboardDoc.data()!;
    if (dashboardData.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const dWidgets = Array.isArray((dashboardData as { widgets?: unknown }).widgets) ? (dashboardData as { widgets?: unknown[] }).widgets : [];
    const dSettings = isObj((dashboardData as { settings?: unknown }).settings) ? (dashboardData as { settings?: Record<string, unknown> }).settings : {};
    const dMetadata = isObj((dashboardData as { metadata?: unknown }).metadata) ? (dashboardData as { metadata?: Record<string, unknown> }).metadata : {};
    const dName = typeof (dashboardData as { name?: unknown }).name === 'string' ? (dashboardData as { name?: string }).name : 'Dashboard';
    const dashboardExportBase = { id: dashboardId, userId, widgets: dWidgets, settings: dSettings, metadata: dMetadata, name: dName };
    const allowedDashFormats = new Set(['png', 'jpeg', 'json', 'csv', 'pdf', 'svg', 'excel']);
    const safeDashFormat = (typeof format === 'string' && allowedDashFormats.has(format)) ? format : 'json';
    const dashServerFormat = ((): ExportFormat => {
        switch (safeDashFormat) {
            case 'png': return 'png';
            case 'pdf': return 'pdf';
            case 'svg': return 'svg';
            case 'excel': return 'excel';
            case 'json': return 'json';
            default: return 'json';
        }
    })();
    const dashboardExportObj: ServerDashboardArtifactData = {
        id: dashboardExportBase.id,
        userId: dashboardExportBase.userId,
        widgets: Array.isArray(dashboardExportBase.widgets) ? dashboardExportBase.widgets.map(w => ({
            id: (w as { id?: unknown }).id ? String((w as { id?: unknown }).id) : 'w',
            type: (w as { type?: unknown }).type ? String((w as { type?: unknown }).type) : 'unknown'
        })) : []
    };
    function isDashExportFormat(v: string): v is ExportFormat {
        return ['pdf', 'excel', 'json', 'png', 'svg'].includes(v);
    }
    const dashFormat: ExportFormat = isDashExportFormat(dashServerFormat) ? dashServerFormat : 'json';
    const dashExportConfig = isObj(config) ? config as Partial<{ title?: string }> : undefined;
    let exportUrl: string;
    if (typeof artifact === 'string' && artifact.length > 0) {
        const isDataUrl = /^data:[^;]+;base64,[a-z0-9+/=]+$/i.test(artifact);
        const isBase64 = /^[a-z0-9+/=]+$/i.test(artifact);
        if (!(isDataUrl || isBase64)) {
            return NextResponse.json({ error: 'Invalid artifact encoding' }, { status: 400 });
        }
        exportUrl = await persistExportArtifact({ userId, kind: 'dashboard', id: dashboardId, format: safeDashFormat, artifact, metadata: { widgetCount: (dashboardExportObj.widgets?.length) || 0 } });
    } else {
        exportUrl = await generateDashboardExport(dashboardExportObj, dashFormat, dashExportConfig);
    }

    // Track export in analytics
    await adminDb.collection('analytics').add({
        userId,
        action: 'dashboard_export',
        dashboardId,
        format,
        timestamp: new Date(),
        metadata: {
            widgetCount: dashboardData.widgets?.length || 0,
            exportConfig: config
        }
    });

    return NextResponse.json(enforceProvenance({ success: true, exportUrl, message: 'Dashboard exported successfully' }, { path: 'visualizations', note: 'export_dashboard' }));
}

async function getDashboards(userId: string) {
    const dashboardsSnapshot = await adminDb
        .collection('dashboards')
        .where('userId', '==', userId)
        .orderBy('metadata.updated', 'desc')
        .get();

    const dashboards = dashboardsSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) } as Record<string, unknown>));

    return NextResponse.json(enforceProvenance({ success: true, dashboards, count: dashboards.length }, { path: 'visualizations', note: 'dashboards' }));
}

async function getDashboard(userId: string, dashboardId: string) {
    const dashboardRef = adminDb.collection('dashboards').doc(dashboardId);
    const dashboardDoc = await dashboardRef.get();

    if (!dashboardDoc.exists) {
        return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    const dashboardData = dashboardDoc.data()!;
    if (dashboardData.userId !== userId && !dashboardData.settings?.shared) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(enforceProvenance({ success: true, dashboard: { id: dashboardDoc.id, ...(dashboardData as Record<string, unknown>) } }, { path: 'visualizations', note: 'dashboard' }));
}

async function deleteDashboard(userId: string, dashboardId: string) {
    const dashboardRef = adminDb.collection('dashboards').doc(dashboardId);
    const dashboardDoc = await dashboardRef.get();

    if (!dashboardDoc.exists) {
        return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    const dashboardData = dashboardDoc.data()!;
    if (dashboardData.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await dashboardRef.delete();

    return NextResponse.json(enforceProvenance({ success: true, message: 'Dashboard deleted successfully' }, { path: 'visualizations', note: 'delete_dashboard' }));
}

// Helpers now sourced from '@/lib/visualizations/server-exports'
