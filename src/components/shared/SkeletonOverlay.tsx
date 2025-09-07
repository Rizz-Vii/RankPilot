"use client";
import React from "react";

export interface SkeletonOverlayProps {
  active: boolean;
  label?: string;
}

export function SkeletonOverlay({
  active,
  label = "Processing",
}: SkeletonOverlayProps) {
  if (!active) return null;
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl bg-background/75 backdrop-blur-sm">
      <div className="animate-pulse w-10 h-10 rounded-full bg-primary/20 mb-3" />
      <p className="text-xs text-muted-foreground">{label}…</p>
    </div>
  );
}
