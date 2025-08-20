/**
 * Custom Dashboard Builder API Route
 * Handles enterprise dashboard creation, management, and sharing
 */

import { customDashboardBuilder } from '@/lib/dashboard/custom-dashboard-builder';
import { extractErrorMessage } from '@/lib/errors/extract-error-message';
import { enforceProvenance, withProvenance } from '@/lib/middleware/provenance';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'rankpilot-h3jpc';

    try {
        initializeApp({
            projectId,
            // For production, you'd use service account credentials
            // credential: cert({...})
        });
    } catch (error) {
        console.error('[DashboardAPI] Firebase Admin initialization error:', error);
    }
}

import { sanitizeWidgetCreate, sanitizeWidgetMutation, type WidgetCreateInput, type WidgetMutation } from '@/types/dashboard-widget-mutation';

type WidgetPosition = { x: number; y: number; width: number; height: number; };
interface WidgetUpdateInput extends WidgetMutation { widgetId: string; }

interface DashboardRequestBody {
    action: 'create' | 'update' | 'delete' | 'export' | 'share' | 'duplicate';
    dashboardId?: string;
    name?: string;
    templateId?: string;
    widgetConfig?: WidgetCreateInput;
    position?: WidgetPosition;
    updates?: WidgetUpdateInput;
    exportFormat?: 'pdf' | 'excel' | 'json';
    exportOptions?: { includeData?: boolean; dateRange?: { start: string; end: string }; branding?: Record<string, unknown> };
    collaborators?: Array<{ userId: string; role: 'viewer' | 'editor'; }>;
    isPublic?: boolean;
}

export const POST = withProvenance(async function POST(request: NextRequest) {
    try {
        const body = await request.json() as DashboardRequestBody;
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(enforceProvenance({ error: 'Unauthorized - Missing token' }, { path: 'dashboard/custom', note: 'auth' }), { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        let user: DecodedIdToken | undefined;
        try {
            user = await getAuth().verifyIdToken(token);
        } catch (error) {
            console.error('[DashboardAPI] Token verification failed:', error);
            return NextResponse.json(enforceProvenance({ error: 'Unauthorized - Invalid token' }, { path: 'dashboard/custom', note: 'auth' }), { status: 401 });
        }
        const userTier = user!.customClaims?.subscriptionTier || 'free';
        if (!['agency', 'enterprise', 'admin'].includes(userTier)) {
            return NextResponse.json(enforceProvenance({ error: 'Upgrade required - Custom dashboards available for Agency tier and above' }, { path: 'dashboard/custom', note: 'tier' }), { status: 403 });
        }
        switch (body.action) {
            case 'create':
                if (!body.name) {
                    return NextResponse.json(enforceProvenance({ error: 'Dashboard name is required' }, { path: 'dashboard/custom', note: 'validation' }), { status: 400 });
                }
                const newDashboard = await customDashboardBuilder.createDashboard(body.name, user.uid, userTier, body.templateId);
                return NextResponse.json(enforceProvenance({ success: true, dashboard: newDashboard, message: 'Dashboard created successfully' }, { path: 'dashboard/custom', note: 'create' }));
            case 'update':
                if (!body.dashboardId) {
                    return NextResponse.json(enforceProvenance({ error: 'Dashboard ID is required' }, { path: 'dashboard/custom', note: 'validation' }), { status: 400 });
                }
                if (body.widgetConfig && body.position) {
                    // Avoid explicit `any` by asserting the sanitized result as WidgetCreateInput
                    const sanitized = sanitizeWidgetCreate(body.widgetConfig) as WidgetCreateInput;
                    const widget = await customDashboardBuilder.addWidget(body.dashboardId, sanitized, body.position);
                    return NextResponse.json(enforceProvenance({ success: true, widget, message: 'Widget added successfully' }, { path: 'dashboard/custom', note: 'add_widget' }));
                } else if (body.updates?.widgetId) {
                    const { widgetId, ...rest } = body.updates;
                    // Avoid explicit `any` by asserting the sanitized result as WidgetMutation
                    const sanitized = sanitizeWidgetMutation(rest) as WidgetMutation;
                    const result = await customDashboardBuilder.updateWidget(body.dashboardId, widgetId, sanitized);
                    return NextResponse.json(enforceProvenance({ success: true, widget: result, message: 'Widget updated successfully' }, { path: 'dashboard/custom', note: 'update_widget' }));
                }
                return NextResponse.json(enforceProvenance({ error: 'Invalid update request' }, { path: 'dashboard/custom', note: 'invalid_update' }), { status: 400 });
            case 'delete':
                if (!body.dashboardId) {
                    return NextResponse.json(enforceProvenance({ error: 'Dashboard ID is required' }, { path: 'dashboard/custom', note: 'validation' }), { status: 400 });
                }
                if (body.updates?.widgetId) {
                    const removed = await customDashboardBuilder.removeWidget(body.dashboardId, body.updates.widgetId);
                    return NextResponse.json(enforceProvenance({ success: removed, message: removed ? 'Widget removed successfully' : 'Widget not found' }, { path: 'dashboard/custom', note: 'remove_widget' }));
                }
                return NextResponse.json(enforceProvenance({ error: 'Widget ID is required for deletion' }, { path: 'dashboard/custom', note: 'widget_id_required' }), { status: 400 });
            case 'export':
                if (!body.dashboardId || !body.exportFormat) {
                    return NextResponse.json(enforceProvenance({ error: 'Dashboard ID and export format are required' }, { path: 'dashboard/custom', note: 'validation' }), { status: 400 });
                }
                const exportResult = await customDashboardBuilder.exportDashboard(body.dashboardId, body.exportFormat, body.exportOptions);
                return NextResponse.json(enforceProvenance({ success: exportResult.success, downloadUrl: exportResult.downloadUrl, error: exportResult.error, message: exportResult.success ? 'Export completed successfully' : 'Export failed' }, { path: 'dashboard/custom', note: 'export' }));
            case 'share':
                if (!body.dashboardId || !body.collaborators) {
                    return NextResponse.json(enforceProvenance({ error: 'Dashboard ID and collaborators are required' }, { path: 'dashboard/custom', note: 'validation' }), { status: 400 });
                }
                const shareResult = await customDashboardBuilder.shareDashboard(body.dashboardId, body.collaborators, body.isPublic || false);
                return NextResponse.json(enforceProvenance({ success: true, shareId: shareResult.shareId, shareUrl: shareResult.shareUrl, message: 'Dashboard shared successfully' }, { path: 'dashboard/custom', note: 'share' }));
            case 'duplicate':
                if (!body.dashboardId || !body.name) {
                    return NextResponse.json(enforceProvenance({ error: 'Dashboard ID and new name are required' }, { path: 'dashboard/custom', note: 'validation' }), { status: 400 });
                }
                const duplicatedDashboard = await customDashboardBuilder.duplicateDashboard(body.dashboardId, body.name, user.uid);
                return NextResponse.json(enforceProvenance({ success: true, dashboard: duplicatedDashboard, message: 'Dashboard duplicated successfully' }, { path: 'dashboard/custom', note: 'duplicate' }));
            default:
                return NextResponse.json(enforceProvenance({ error: 'Invalid action' }, { path: 'dashboard/custom', note: 'invalid_action' }), { status: 400 });
        }
    } catch (error) {
        console.error('[DashboardAPI] Error:', error);
        return NextResponse.json(
            enforceProvenance({ error: 'Internal server error', details: extractErrorMessage(error) }, { path: 'dashboard/custom', note: 'exception' }),
            { status: 500 }
        );
    }
}, { path: 'dashboard/custom' });

export const GET = withProvenance(async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const action = url.searchParams.get('action');
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(enforceProvenance({ error: 'Unauthorized - Missing token' }, { path: 'dashboard/custom', note: 'auth' }), { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        let user: DecodedIdToken | undefined;
        try {
            user = await getAuth().verifyIdToken(token);
        } catch (error) {
            console.error('[DashboardAPI] Token verification failed:', error);
            return NextResponse.json(enforceProvenance({ error: 'Unauthorized - Invalid token' }, { path: 'dashboard/custom', note: 'auth' }), { status: 401 });
        }
        const userTier = user!.customClaims?.subscriptionTier || 'free';
        switch (action) {
            case 'templates':
                const templates = customDashboardBuilder.getTemplates(userTier);
                return NextResponse.json(enforceProvenance({ success: true, templates, userTier }, { path: 'dashboard/custom', note: 'templates' }));
            case 'dashboards':
                const dashboards = customDashboardBuilder.getUserDashboards(user.uid);
                return NextResponse.json(enforceProvenance({ success: true, dashboards, count: dashboards.length }, { path: 'dashboard/custom', note: 'dashboards' }));
            case 'widget-data':
                const dashboardId = url.searchParams.get('dashboardId');
                const widgetId = url.searchParams.get('widgetId');
                if (!dashboardId || !widgetId) {
                    return NextResponse.json(enforceProvenance({ error: 'Dashboard ID and Widget ID are required' }, { path: 'dashboard/custom', note: 'validation' }), { status: 400 });
                }
                const userDashboards = customDashboardBuilder.getUserDashboards(user.uid);
                const dashboard = userDashboards.find(d => d.id === dashboardId);
                if (!dashboard) {
                    return NextResponse.json(enforceProvenance({ error: 'Dashboard not found' }, { path: 'dashboard/custom', note: 'not_found' }), { status: 404 });
                }
                const widget = dashboard.widgets.find(w => w.id === widgetId);
                if (!widget) {
                    return NextResponse.json(enforceProvenance({ error: 'Widget not found' }, { path: 'dashboard/custom', note: 'not_found' }), { status: 404 });
                }
                const widgetData = await customDashboardBuilder.getWidgetData(widgetId, widget);
                return NextResponse.json(enforceProvenance({ success: true, data: widgetData }, { path: 'dashboard/custom', note: 'widget_data' }));
            default:
                return NextResponse.json(enforceProvenance({ error: 'Invalid action' }, { path: 'dashboard/custom', note: 'invalid_action' }), { status: 400 });
        }
    } catch (error) {
        console.error('[DashboardAPI] GET Error:', error);
        return NextResponse.json(
            enforceProvenance({ error: 'Internal server error', details: extractErrorMessage(error) }, { path: 'dashboard/custom', note: 'exception' }),
            { status: 500 }
        );
    }
}, { path: 'dashboard/custom' });
