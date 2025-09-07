"use client";
import React from "react";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { Phase5IntegrationHub } from "@/components/integration/Phase5IntegrationHub";

export default function IntegrationHubPage() {
  return (
    <FeatureGate
      feature="integration_hub"
      requiredTier="enterprise"
      showUpgrade
    >
      <Phase5IntegrationHub />
    </FeatureGate>
  );
}
