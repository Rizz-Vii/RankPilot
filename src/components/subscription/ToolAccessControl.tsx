/**
 * React components for tool access control
 */

import React from "react";
import type { JSX } from "react";
import { useToolAccess } from "@/lib/tool-access";

interface ToolAccessWrapperProps {
  toolId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ToolAccessWrapper({
  toolId,
  children,
  fallback,
}: ToolAccessWrapperProps): JSX.Element {
  const { canAccessTool, getRestrictedMessage } = useToolAccess();

  if (canAccessTool(toolId)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
      <div className="text-gray-500 mb-2">🔒 Tool Restricted</div>
      <p className="text-sm text-gray-600">{getRestrictedMessage(toolId)}</p>
    </div>
  );
}

interface ToolCategoryViewProps {
  showRestricted?: boolean;
}

export function ToolCategoryView({
  showRestricted = true,
}: ToolCategoryViewProps) {
  const { getToolsByCategory } = useToolAccess();
  const categories = getToolsByCategory();

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <div key={category.id} className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {category.name}
          </h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {category.tools.map((tool) => (
              <div
                key={tool.id}
                className={`p-3 border rounded-lg ${
                  tool.available
                    ? "border-green-200 bg-green-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{tool.name}</span>
                  <span
                    className={`text-sm px-2 py-1 rounded ${
                      tool.available
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {tool.available ? "Available" : "Restricted"}
                  </span>
                </div>
                {!tool.available &&
                  showRestricted &&
                  tool.restrictedMessage && (
                    <p className="text-sm text-gray-600 mt-2">
                      {tool.restrictedMessage}
                    </p>
                  )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
