/**
 * Zapier Workflow Automation API Route
 * Handles enterprise workflow creation, management, and execution
 */

import { zapierWorkflowBuilder } from "@/lib/automation/zapier-workflow-builder";
import { extractErrorMessage } from "@/lib/errors/extract-error-message";
import { adminAuth } from "@/lib/firebase-admin";
import { enforceProvenance, withProvenance } from "@/lib/middleware/provenance";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Firebase Admin is initialized centrally in '@/lib/firebase-admin'.

interface WorkflowRequestBody {
  action:
    | "create"
    | "execute"
    | "list"
    | "update"
    | "delete"
    | "templates"
    | "analytics";
  workflowId?: string;
  templateId?: string;
  name?: string;
  customizations?: Record<string, unknown>;
  status?: "active" | "paused" | "disabled";
}

export const POST = withProvenance(
  async function POST(request: NextRequest) {
    try {
      const authHeader = request.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json(
          enforceProvenance(
            {
              success: false,
              error: "Missing or invalid authorization header",
              provenance: "synthetic",
            },
            { path: "automation/zapier", note: "auth" }
          ),
          { status: 401 }
        );
      }

      const token = authHeader.split("Bearer ")[1];
      let decodedToken;
      try {
        decodedToken = await adminAuth.verifyIdToken(token);
      } catch (error) {
        console.error("[ZapierWorkflowAPI] Token verification error:", error);
        return NextResponse.json(
          enforceProvenance(
            {
              success: false,
              error: "Invalid authentication token",
              provenance: "synthetic",
            },
            { path: "automation/zapier", note: "auth" }
          ),
          { status: 401 }
        );
      }

      const userId = decodedToken.uid;
      const userTier = decodedToken.tier || "free";

      // Check tier access for Zapier automation
      if (!["agency", "enterprise", "admin"].includes(userTier)) {
        return NextResponse.json(
          enforceProvenance(
            {
              success: false,
              error: "Zapier automation requires Agency tier or higher",
              provenance: "synthetic",
            },
            { path: "automation/zapier", note: "tier" }
          ),
          { status: 403 }
        );
      }

      const body: WorkflowRequestBody = await request.json();

      switch (body.action) {
        case "create":
          if (!body.templateId) {
            return NextResponse.json(
              enforceProvenance(
                {
                  success: false,
                  error: "Template ID is required for workflow creation",
                  provenance: "synthetic",
                },
                { path: "automation/zapier", note: "validation" }
              ),
              { status: 400 }
            );
          }

          const workflow =
            await zapierWorkflowBuilder.createWorkflowFromTemplate(
              body.templateId,
              userId,
              userTier,
              body.customizations || {}
            );

          return NextResponse.json(
            enforceProvenance(
              {
                success: true,
                workflow: {
                  id: workflow.id,
                  name: workflow.name,
                  description: workflow.description,
                  status: workflow.status,
                  triggers: workflow.triggers.length,
                  actions: workflow.actions.length,
                  created: workflow.metadata.created,
                },
                provenance: "live",
              },
              { path: "automation/zapier", note: "create" }
            )
          );

        case "execute":
          if (!body.workflowId) {
            return NextResponse.json(
              enforceProvenance(
                {
                  success: false,
                  error: "Workflow ID is required for execution",
                  provenance: "synthetic",
                },
                { path: "automation/zapier", note: "validation" }
              ),
              { status: 400 }
            );
          }

          const result = await zapierWorkflowBuilder.executeWorkflow(
            body.workflowId
          );
          return NextResponse.json(
            enforceProvenance(
              { success: true, execution: result, provenance: "live" },
              { path: "automation/zapier", note: "execute" }
            )
          );

        case "list":
          const userWorkflows = zapierWorkflowBuilder.getUserWorkflows(userId);
          return NextResponse.json(
            enforceProvenance(
              {
                success: true,
                workflows: userWorkflows.map((w) => ({
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
                  updated: w.metadata.updated,
                })),
                provenance: "live",
              },
              { path: "automation/zapier", note: "list" }
            )
          );

        case "update":
          if (!body.workflowId || !body.status) {
            return NextResponse.json(
              enforceProvenance(
                {
                  success: false,
                  error: "Workflow ID and status are required for update",
                  provenance: "synthetic",
                },
                { path: "automation/zapier", note: "validation" }
              ),
              { status: 400 }
            );
          }

          const updated = zapierWorkflowBuilder.updateWorkflowStatus(
            body.workflowId,
            body.status
          );
          if (!updated) {
            return NextResponse.json(
              enforceProvenance(
                {
                  success: false,
                  error: "Workflow not found or update failed",
                  provenance: "synthetic",
                },
                { path: "automation/zapier", note: "not_found" }
              ),
              { status: 404 }
            );
          }

          return NextResponse.json(
            enforceProvenance(
              {
                success: true,
                message: `Workflow status updated to ${body.status}`,
                provenance: "live",
              },
              { path: "automation/zapier", note: "update" }
            )
          );

        case "delete":
          if (!body.workflowId) {
            return NextResponse.json(
              enforceProvenance(
                {
                  success: false,
                  error: "Workflow ID is required for deletion",
                  provenance: "synthetic",
                },
                { path: "automation/zapier", note: "validation" }
              ),
              { status: 400 }
            );
          }

          const deleted = zapierWorkflowBuilder.deleteWorkflow(
            body.workflowId,
            userId
          );
          if (!deleted) {
            return NextResponse.json(
              enforceProvenance(
                {
                  success: false,
                  error: "Workflow not found or deletion failed",
                  provenance: "synthetic",
                },
                { path: "automation/zapier", note: "not_found" }
              ),
              { status: 404 }
            );
          }

          return NextResponse.json(
            enforceProvenance(
              {
                success: true,
                message: "Workflow deleted successfully",
                provenance: "live",
              },
              { path: "automation/zapier", note: "delete" }
            )
          );

        case "templates":
          const templates = zapierWorkflowBuilder.getTemplates();
          return NextResponse.json(
            enforceProvenance(
              {
                success: true,
                templates: templates.map((t) => ({
                  id: t.id,
                  name: t.name,
                  category: t.category,
                  description: t.description,
                  requiredApps: t.requiredApps,
                  requiredTier: t.requiredTier,
                  setupInstructions: t.setupInstructions,
                })),
                provenance: "live",
              },
              { path: "automation/zapier", note: "templates" }
            )
          );

        case "analytics":
          if (!body.workflowId) {
            return NextResponse.json(
              enforceProvenance(
                {
                  success: false,
                  error: "Workflow ID is required for analytics",
                  provenance: "synthetic",
                },
                { path: "automation/zapier", note: "validation" }
              ),
              { status: 400 }
            );
          }

          const analytics = zapierWorkflowBuilder.getWorkflowAnalytics(
            body.workflowId
          );
          if (!analytics) {
            return NextResponse.json(
              enforceProvenance(
                {
                  success: false,
                  error: "Workflow not found",
                  provenance: "synthetic",
                },
                { path: "automation/zapier", note: "not_found" }
              ),
              { status: 404 }
            );
          }

          return NextResponse.json(
            enforceProvenance(
              { success: true, analytics, provenance: "live" },
              { path: "automation/zapier", note: "analytics" }
            )
          );

        default:
          return NextResponse.json(
            enforceProvenance(
              {
                success: false,
                error: "Invalid action specified",
                provenance: "synthetic",
              },
              { path: "automation/zapier", note: "invalid_action" }
            ),
            { status: 400 }
          );
      }
    } catch (error) {
      console.error("[ZapierWorkflowAPI] Error:", error);
      return NextResponse.json(
        enforceProvenance(
          {
            success: false,
            error: "Internal server error",
            details: extractErrorMessage(error),
            provenance: "synthetic",
          },
          { path: "automation/zapier", note: "exception" }
        ),
        { status: 500 }
      );
    }
  },
  { path: "automation/zapier" }
);

export const GET = withProvenance(
  async function GET(request: NextRequest) {
    try {
      const authHeader = request.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json(
          enforceProvenance(
            {
              success: false,
              error: "Missing or invalid authorization header",
              provenance: "synthetic",
            },
            { path: "automation/zapier", note: "auth" }
          ),
          { status: 401 }
        );
      }

      const token = authHeader.split("Bearer ")[1];
      let decodedToken;
      try {
        decodedToken = await adminAuth.verifyIdToken(token);
      } catch (error) {
        console.error("[ZapierWorkflowAPI] Token verification error:", error);
        return NextResponse.json(
          enforceProvenance(
            {
              success: false,
              error: "Invalid authentication token",
              provenance: "synthetic",
            },
            { path: "automation/zapier", note: "auth" }
          ),
          { status: 401 }
        );
      }

      const userId = decodedToken.uid;
      const userTier = decodedToken.tier || "free";

      // Check tier access for Zapier automation
      if (!["agency", "enterprise", "admin"].includes(userTier)) {
        return NextResponse.json(
          enforceProvenance(
            {
              success: false,
              error: "Zapier automation requires Agency tier or higher",
              provenance: "synthetic",
            },
            { path: "automation/zapier", note: "tier" }
          ),
          { status: 403 }
        );
      }

      // Get user workflows and templates
      const userWorkflows = zapierWorkflowBuilder.getUserWorkflows(userId);
      const templates = zapierWorkflowBuilder.getTemplates();

      return NextResponse.json(
        enforceProvenance(
          {
            success: true,
            data: {
              workflows: userWorkflows.map((w) => ({
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
                updated: w.metadata.updated,
              })),
              templates: templates.map((t) => ({
                id: t.id,
                name: t.name,
                category: t.category,
                description: t.description,
                requiredApps: t.requiredApps,
                requiredTier: t.requiredTier,
                setupInstructions: t.setupInstructions,
              })),
              tierLimits: {
                agency: { workflows: 10, executions: 200 },
                enterprise: { workflows: 50, executions: 1000 },
                admin: { workflows: "unlimited", executions: 5000 },
              },
            },
            provenance: "live",
          },
          { path: "automation/zapier", note: "overview" }
        )
      );
    } catch (error) {
      console.error("[ZapierWorkflowAPI] Error:", error);
      return NextResponse.json(
        enforceProvenance(
          {
            success: false,
            error: "Internal server error",
            details: extractErrorMessage(error),
            provenance: "synthetic",
          },
          { path: "automation/zapier", note: "exception" }
        ),
        { status: 500 }
      );
    }
  },
  { path: "automation/zapier" }
);
