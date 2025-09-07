"use client";
import React from "react";
import {
  FeatureGate as BaseFeatureGate,
  withFeatureGate,
  useFeatureAccess,
} from "./ui/feature-gate";

// Shim to maintain legacy prop compatibility (requiredTier is optional and ignored here,
// since BaseFeatureGate uses central FEATURE_ACCESS for gating)
type LegacyProps = React.ComponentProps<typeof BaseFeatureGate> & {
  requiredTier?: string;
};

export default function FeatureGate(props: LegacyProps) {
  const { requiredTier: _ignored, ...rest } = props;
  return <BaseFeatureGate {...rest} />;
}

export { BaseFeatureGate as FeatureGate, withFeatureGate, useFeatureAccess };
