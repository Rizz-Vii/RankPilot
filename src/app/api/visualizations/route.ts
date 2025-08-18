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
import { generateChartExport, generateDashboardExport, persistExportArtifact, persistBufferToStorage } from '@/lib/visualizations/server-exports';
import { NextRequest, NextResponse } from 'next/server';

export const POST = withProvenance(async function POST(request: Request) {
    const nreq = request as NextRequest;
    try {
        // Verify authentication
        const authHeader = nreq.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(enforceProvenance({ error: 'Unauthorized' }, { path: 'visualizations', note: 'auth' }), { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (error) {
            console.warn('[Visualizations API] Firebase admin initialization error:', error);
            return NextResponse.json(enforceProvenance({ error: 'Authentication service unavailable', mock: true, data: [] }, { path: 'visualizations', note: 'auth' }), { status: 503 });
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
        const body = await nreq.json().catch(() => ({}));
        const action: string | undefined = (body && typeof body === 'object') ? (body as any).action : undefined;
        const data = (body && typeof body === 'object') ? (body as any).data : undefined;
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

export const GET = withProvenance(async function GET(request: Request) {
    const nreq = request as NextRequest;
    try {
        // Verify authentication
        const authHeader = nreq.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(enforceProvenance({ error: 'Unauthorized' }, { path: 'visualizations', note: 'auth' }), { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;
        const url = new URL(nreq.url);
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

export const DELETE = withProvenance(async function DELETE(request: Request) {
    const nreq = request as NextRequest;
    try {
        // Verify authentication
        const authHeader = nreq.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(enforceProvenance({ error: 'Unauthorized' }, { path: 'visualizations', note: 'auth' }), { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;
        const url = new URL(nreq.url);
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
interface ChartDoc { id: string; userId: string; config?: Record<string, any>; data?: any[]; metadata: ChartMetadata; settings: ChartSettings }
type ChartCreateInput = Partial<Omit<ChartDoc, 'id' | 'userId' | 'metadata' | 'settings'>> & {
    id?: string; title?: string; description?: string; tags?: string[]; shared?: boolean; exportEnabled?: boolean; refreshInterval?: number;
};
function isObj(v: unknown): v is Record<string, any> { return !!v && typeof v === 'object'; }
async function createChart(userId: string, chartData: unknown) {
    const cd: ChartCreateInput = isObj(chartData) ? chartData as ChartCreateInput : {};
    const chartDoc: ChartDoc = {
        id: cd.id || `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
        ...(updates as any),
        metadata: {
            ...(chartData.metadata || { title: 'Untitled Chart', tags: [], created: new Date(), updated: new Date(), version: '1.0' }),
            ...(updates as any)?.metadata,
            updated: new Date()
        },
        settings: {
            ...(chartData.settings || { shared: false, exportEnabled: true, refreshInterval: 60000 }),
            ...(updates as any)?.settings,
        }
    };

    // Firestore update expects plain object; ensure no prototype & allow partial merge
    await chartRef.update({ ...updatedChart } as Record<string, any>);

    return NextResponse.json(enforceProvenance({ success: true, message: 'Chart updated successfully' }, { path: 'visualizations', note: 'update_chart' }));
}

interface ChartExportInput { chartId?: string; format?: string; config?: any; artifact?: any }
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
    const exportBase = {
        id: chartId,
        userId,
        config: (chartData as any).config || {},
        data: Array.isArray((chartData as any).data) ? (chartData as any).data : [],
        metadata: (chartData as any).metadata || {},
        settings: (chartData as any).settings || {}
    };
    const allowedFormats = new Set(['png', 'jpeg', 'json', 'csv', 'pdf']);
    const safeFormat = (format && allowedFormats.has(format)) ? format : 'json';
    const exportUrl = artifact
        ? await persistExportArtifact({ userId, kind: 'chart', id: chartId, format: safeFormat as any, artifact, metadata: { chartType: (chartData as any).config?.type } })
        : await generateChartExport(exportBase as any, safeFormat as any, config);

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
interface DashboardSettings { theme: string; refreshInterval: number; autoSave: boolean; shared: boolean; exportOptions: Record<string, any> }
interface DashboardMetadata { created: Date; updated: Date; version: string; tags: string[] }
interface DashboardDoc { id: string; userId: string; name: string; description?: string; widgets: any[]; settings: DashboardSettings; metadata: DashboardMetadata }
type DashboardCreateInput = Partial<Omit<DashboardDoc, 'id' | 'userId' | 'settings' | 'metadata'>> & { id?: string; theme?: string; refreshInterval?: number; autoSave?: boolean; shared?: boolean; exportOptions?: Record<string, any>; tags?: string[] };
async function createDashboard(userId: string, dashboardData: unknown) {
    const dd: DashboardCreateInput = isObj(dashboardData) ? dashboardData as DashboardCreateInput : {};
    const dashboardDoc: DashboardDoc = {
        id: dd.id || `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
        ...(updates as any),
        metadata: {
            ...(dashboardData.metadata || { created: new Date(), updated: new Date(), version: '1.0', tags: [] }),
            ...(updates as any)?.metadata,
            updated: new Date()
        },
        settings: {
            ...(dashboardData.settings || { theme: 'light', refreshInterval: 60000, autoSave: true, shared: false, exportOptions: {} }),
            ...(updates as any)?.settings,
        }
    };

    await dashboardRef.update({ ...updatedDashboard } as Record<string, any>);

    return NextResponse.json(enforceProvenance({ success: true, message: 'Dashboard updated successfully' }, { path: 'visualizations', note: 'update_dashboard' }));
}

interface DashboardExportInput { dashboardId?: string; format?: string; config?: any; artifact?: any }
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

    const dashboardExportBase = {
        id: dashboardId,
        userId,
        widgets: Array.isArray((dashboardData as any).widgets) ? (dashboardData as any).widgets : [],
        settings: (dashboardData as any).settings || {},
        metadata: (dashboardData as any).metadata || {},
        name: (dashboardData as any).name || 'Dashboard'
    };
    const allowedDashFormats = new Set(['png', 'jpeg', 'json', 'csv', 'pdf']);
    const safeDashFormat = (format && allowedDashFormats.has(format)) ? format : 'json';
    const exportUrl = artifact
        ? await persistExportArtifact({ userId, kind: 'dashboard', id: dashboardId, format: safeDashFormat as any, artifact, metadata: { widgetCount: ((dashboardData as any).widgets?.length) || 0 } })
        : await generateDashboardExport(dashboardExportBase as any, safeDashFormat as any, config);

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
