"use client";
import React from "react";
import { useMarketingContext } from "./marketing-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}
export function ChannelBreakdownModal({ open, onOpenChange }: Props) {
  const { data } = useMarketingContext();
  const rows = data?.channelPerformance || [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Channel Breakdown</DialogTitle>
        </DialogHeader>
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr className="text-left">
              <th className="py-1 pr-2 font-medium">Channel</th>
              <th className="py-1 pr-2 font-medium">Impr</th>
              <th className="py-1 pr-2 font-medium">Leads</th>
              <th className="py-1 pr-2 font-medium">ROI%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.channel}
                className="border-b border-border/40 last:border-none"
              >
                <td className="py-1 pr-2">{r.channel}</td>
                <td className="py-1 pr-2 tabular-nums">
                  {r.impressions.toLocaleString()}
                </td>
                <td className="py-1 pr-2 tabular-nums">
                  {r.leads.toLocaleString()}
                </td>
                <td className="py-1 pr-2 tabular-nums">{r.roi.toFixed(1)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td
                  colSpan={4}
                  className="py-4 text-center text-muted-foreground"
                >
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </DialogContent>
    </Dialog>
  );
}
