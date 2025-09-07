"use client";
import React from "react";
import { useMarketingContext } from "./marketing-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}
export function CampaignDetailModal({ open, onOpenChange }: Props) {
  const { data } = useMarketingContext();
  const rows = data?.campaigns || [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Campaign Details ({rows.length})</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[420px]">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="text-left">
                <th className="py-1 pr-2 font-medium">Name</th>
                <th className="py-1 pr-2 font-medium">Channel</th>
                <th className="py-1 pr-2 font-medium">Impr</th>
                <th className="py-1 pr-2 font-medium">CTR%</th>
                <th className="py-1 pr-2 font-medium">Leads</th>
                <th className="py-1 pr-2 font-medium">ROI%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const ctr = r.impressions
                  ? ((r.clicks || 0) / r.impressions) * 100
                  : 0;
                const roi = r.spend
                  ? (((r.revenue || 0) - (r.spend || 0)) / (r.spend || 0)) * 100
                  : 0;
                return (
                  <tr
                    key={r.id}
                    className="border-b border-border/40 last:border-none"
                  >
                    <td className="py-1 pr-2">{r.name || r.id}</td>
                    <td className="py-1 pr-2">{r.channel || "—"}</td>
                    <td className="py-1 pr-2 tabular-nums">
                      {(r.impressions || 0).toLocaleString()}
                    </td>
                    <td className="py-1 pr-2 tabular-nums">{ctr.toFixed(2)}</td>
                    <td className="py-1 pr-2 tabular-nums">
                      {(r.leads || 0).toLocaleString()}
                    </td>
                    <td className="py-1 pr-2 tabular-nums">{roi.toFixed(1)}</td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-4 text-center text-muted-foreground"
                  >
                    No campaigns
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
