/**
 * Zapier Workflow Automation API Route
 * Handles enterprise workflow creation, management, and execution
 */

import { zapierWorkflowBuilder } from '@/lib/automation/zapier-workflow-builder';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'rankpilot-h3jpc';

    try {
        initializeApp({
            projectId,
        });
    } catch (_error) {
        console.error('[ZapierWorkflowAPI] Firebase Admin initialization _error:', _error);
    }
}

interface WorkflowRequestBody {
    action: 'create' | 'execute' | 'list' | 'update' | 'delete' | 'templates' | 'analytics';
    workflowId?: string;
    templateId?: string;
    name?: string;
    customizations?: Record<string, any>;
    status?: 'active' | 'paused' | 'disabled';
}

export async function POST(_request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { _error: 'Missing or invalid authorization header' },
                { status: 401 }
            );
        }

        const token = authHeader.split('Bearer ')[1];
        const auth = getAuth();

        let decodedToken;
        try {
            decodedToken = await auth.verifyIdToken(token);
        } catch (_error) {
            console.error('[ZapierWorkflowAPI] Token verification _error:', _error);
            return NextResponse.json(
                { _error: 'Invalid authentication token' },
                { status: 401 }
            );
        }

        const userId = decodedToken.uid;
        const userTier = decodedToken.tier || 'free';

        // Check tier access for Zapier automation
        if (!['agency', 'enterprise', 'admin'].includes(userTier)) {
            return NextResponse.json(
                { _error: 'Zapier automation requires Agency tier or higher' },
                { status: 403 }
            );
        }

        const body: WorkflowRequestBody = await request.json();

        switch (body.action) {
            case 'create':
                if (!body.templateId) {
                    return NextResponse.json(
                        { _error: 'Template ID is required for workflow creation' },
                        { status: 400 }
                    );
                }

                const workflow = await zapierWorkflowBuilder.createWorkflowFromTemplate(
                    body.templateId,
                    userId,
                    userTier,
                    body.customizations || {}
                );

                return NextResponse.json({
                    success: true,
                    workflow: {
                        id: workflow.id,
                        name: workflow.name,
                        description: workflow.description,
                        status: workflow.status,
                        triggers: workflow.triggers.length,
                        actions: workflow.actions.length,
                        created: workflow.metadata.created
                    }
                });

            case 'execute':
                if (!body.workflowId) {
                    return NextResponse.json(
                        { _error: 'Workflow ID is required for execution' },
                        { status: 400 }
                    );
                }

                const _result = await zapierWorkflowBuilder.executeWorkflow(body.workflowId);
                return NextResponse.json({
                    success: true,
                    execution: result
                });

            case 'list':
                const userWorkflows = zapierWorkflowBuilder.getUserWorkflows(userId);
                return NextResponse.json({
                    success: true,
                    workflows: userWorkflows.map(w => ({
                        id: w.id,
                        name: w.name,
                        description: w.description,
                        status: w.status,
                        triggers: w.triggers.length,
                        actions: w.actions.length,
                        runCount: w.metadata.runCount,
                        successRate: w.metadata.successRate,
                        lastRun: w.lastRun,
                        created: w.metadata.created,
                        updated: w.metadata.updated
                    }))
                });

            case 'update':
                if (!body.workflowId || !body.status) {
                    return NextResponse.json(
                        { _error: 'Workflow ID and status are required for update' },
                        { status: 400 }
                    );
                }

                const updated = zapierWorkflowBuilder.updateWorkflowStatus(body.workflowId, body.status);
                if (!updated) {
                    return NextResponse.json(
                        { _error: 'Workflow not found or update failed' },
                        { status: 404 }
                    );
                }

                return NextResponse.json({
                    success: true,
                    message: `Workflow status updated to ${body.status}`
                });

            case 'delete':
                if (!body.workflowId) {
                    return NextResponse.json(
                        { _error: 'Workflow ID is required for deletion' },
                        { status: 400 }
                    );
                }

                const deleted = zapierWorkflowBuilder.deleteWorkflow(body.workflowId, userId);
                if (!deleted) {
                    return NextResponse.json(
                        { _error: 'Workflow not found or deletion failed' },
                        { status: 404 }
                    );
                }

                return NextResponse.json({
                    success: true,
                    message: 'Workflow deleted successfully'
                });

            case 'templates':
                const templates = zapierWorkflowBuilder.getTemplates();
                return NextResponse.json({
                    success: true,
                    templates: templates.map(t => ({
                        id: t.id,
                        name: t.name,
                        category: t.category,
                        description: t.description,
                        requiredApps: t.requiredApps,
                        requiredTier: t.requiredTier,
                        setupInstructions: t.setupInstructions
                    }))
                });

            case 'analytics':
                if (!body.workflowId) {
                    return NextResponse.json(
                        { _error: 'Workflow ID is required for analytics' },
                        { status: 400 }
                    );
                }

                const analytics = zapierWorkflowBuilder.getWorkflowAnalytics(body.workflowId);
                if (!analytics) {
                    return NextResponse.json(
                        { _error: 'Workflow not found' },
                        { status: 404 }
                    );
                }

                return NextResponse.json({
                    success: true,
                    analytics
                });

            default:
                return NextResponse.json(
                    { _error: 'Invalid action specified' },
                    { status: 400 }
                );
        }

    } catch (_error) {
        console.error('[ZapierWorkflowAPI] Error:', _error);
        return NextResponse.json(
            {
                _error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function GET(_request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { _error: 'Missing or invalid authorization header' },
                { status: 401 }
            );
        }

        const token = authHeader.split('Bearer ')[1];
        const auth = getAuth();

        let decodedToken;
        try {
            decodedToken = await auth.verifyIdToken(token);
        } catch (_error) {
            console.error('[ZapierWorkflowAPI] Token verification _error:', _error);
            return NextResponse.json(
                { _error: 'Invalid authentication token' },
                { status: 401 }
            );
        }

        const userId = decodedToken.uid;
        const userTier = decodedToken.tier || 'free';

        // Check tier access for Zapier automation
        if (!['agency', 'enterprise', 'admin'].includes(userTier)) {
            return NextResponse.json(
                { _error: 'Zapier automation requires Agency tier or higher' },
                { status: 403 }
            );
        }

        // Get user workflows and templates
        const userWorkflows = zapierWorkflowBuilder.getUserWorkflows(userId);
        const templates = zapierWorkflowBuilder.getTemplates();

        return NextResponse.json({
            success: true,
            _data: {
                workflows: userWorkflows.map(w => ({
                    id: w.id,
                    name: w.name,
                    description: w.description,
                    status: w.status,
                    triggers: w.triggers.length,
                    actions: w.actions.length,
                    runCount: w.metadata.runCount,
                    successRate: w.metadata.successRate,
                    lastRun: w.lastRun,
                    created: w.metadata.created,
                    updated: w.metadata.updated
                })),
                templates: templates.map(t => ({
                    id: t.id,
                    name: t.name,
                    category: t.category,
                    description: t.description,
                    requiredApps: t.requiredApps,
                    requiredTier: t.requiredTier,
                    setupInstructions: t.setupInstructions
                })),
                tierLimits: {
                    agency: { workflows: 10, executions: 200 },
                    enterprise: { workflows: 50, executions: 1000 },
                    admin: { workflows: 'unlimited', executions: 5000 }
                }
            }
        });

    } catch (_error) {
        console.error('[ZapierWorkflowAPI] Error:', _error);
        return NextResponse.json(
            {
                _error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
