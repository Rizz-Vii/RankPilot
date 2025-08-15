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
        const body = await request.json();
        const { action, data } = body;
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
async function createChart(userId: string, chartData: any) {
    const chartDoc = {
        id: chartData.id || `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        config: chartData.config,
        data: chartData.data || [],
        metadata: {
            title: chartData.title || 'Untitled Chart',
            description: chartData.description,
            tags: chartData.tags || [],
            created: new Date(),
            updated: new Date(),
            version: '1.0'
        },
        settings: {
            shared: chartData.shared || false,
            exportEnabled: chartData.exportEnabled !== false,
            refreshInterval: chartData.refreshInterval || 60000
        }
    };

    await adminDb.collection('visualizations').doc(chartDoc.id).set(chartDoc);

    return NextResponse.json(enforceProvenance({ success: true, chartId: chartDoc.id, message: 'Chart created successfully' }, { path: 'visualizations', note: 'create_chart' }));
}

async function updateChart(userId: string, updateData: any) {
    const { chartId, ...updates } = updateData;

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

    const updatedChart = {
        ...chartData,
        ...updates,
        metadata: {
            ...chartData.metadata,
            ...updates.metadata,
            updated: new Date()
        }
    };

    await chartRef.update(updatedChart);

    return NextResponse.json(enforceProvenance({ success: true, message: 'Chart updated successfully' }, { path: 'visualizations', note: 'update_chart' }));
}

async function exportChart(userId: string, exportData: any) {
    const { chartId, format, config, artifact } = exportData;

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

    const exportUrl = artifact
        ? await persistExportArtifact({ userId, kind: 'chart', id: chartId, format, artifact, metadata: { chartType: chartData.config?.type } })
        : await generateChartExport(chartData, format, config);

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

    const charts = chartsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

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

    return NextResponse.json(enforceProvenance({ success: true, chart: { id: chartDoc.id, ...chartData } }, { path: 'visualizations', note: 'chart' }));
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
async function createDashboard(userId: string, dashboardData: any) {
    const dashboardDoc = {
        id: dashboardData.id || `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        name: dashboardData.name || 'Untitled Dashboard',
        description: dashboardData.description,
        widgets: dashboardData.widgets || [],
        settings: {
            theme: dashboardData.theme || 'light',
            refreshInterval: dashboardData.refreshInterval || 60000,
            autoSave: dashboardData.autoSave !== false,
            shared: dashboardData.shared || false,
            exportOptions: dashboardData.exportOptions || {}
        },
        metadata: {
            created: new Date(),
            updated: new Date(),
            version: '1.0',
            tags: dashboardData.tags || []
        }
    };

    await adminDb.collection('dashboards').doc(dashboardDoc.id).set(dashboardDoc);

    return NextResponse.json(enforceProvenance({ success: true, dashboardId: dashboardDoc.id, message: 'Dashboard created successfully' }, { path: 'visualizations', note: 'create_dashboard' }));
}

async function updateDashboard(userId: string, updateData: any) {
    const { dashboardId, ...updates } = updateData;

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

    const updatedDashboard = {
        ...dashboardData,
        ...updates,
        metadata: {
            ...dashboardData.metadata,
            ...updates.metadata,
            updated: new Date()
        }
    };

    await dashboardRef.update(updatedDashboard);

    return NextResponse.json(enforceProvenance({ success: true, message: 'Dashboard updated successfully' }, { path: 'visualizations', note: 'update_dashboard' }));
}

async function exportDashboard(userId: string, exportData: any) {
    const { dashboardId, format, config, artifact } = exportData;

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

    const exportUrl = artifact
        ? await persistExportArtifact({ userId, kind: 'dashboard', id: dashboardId, format, artifact, metadata: { widgetCount: dashboardData.widgets?.length || 0 } })
        : await generateDashboardExport(dashboardData, format, config);

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

    const dashboards = dashboardsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

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

    return NextResponse.json(enforceProvenance({ success: true, dashboard: { id: dashboardDoc.id, ...dashboardData } }, { path: 'visualizations', note: 'dashboard' }));
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
