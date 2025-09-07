"use client";
import React from "react";
import { useSalesContext } from "./sales-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Props {
  stage: string | null;
  onOpenChange: (open: boolean) => void;
}
export function StageDrilldownModal({ stage, onOpenChange }: Props) {
  const { deals } = useSalesContext();
  const open = !!stage;
  const list = (deals || []).filter((d) => d.stage === stage);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Stage Detail: {stage}</DialogTitle>
          <DialogDescription>
            {list.length} deal(s) currently in this stage.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[420px] pr-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b">
                <th className="py-1 text-left">Deal</th>
                <th className="py-1 text-right">Amount</th>
                <th className="py-1 text-center">Prob%</th>
                <th className="py-1 text-center">Cycle (d)</th>
                <th className="py-1 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((d, i) => (
                <tr
                  key={i}
                  className={cn(
                    "border-b last:border-none",
                    i % 2 && "bg-muted/30"
                  )}
                >
                  <td className="py-1 pr-2 font-medium truncate max-w-[180px]">
                    Deal {i + 1}
                  </td>
                  <td className="py-1 text-right tabular-nums">
                    {(d.amount || 0).toLocaleString()}
                  </td>
                  <td className="py-1 text-center">
                    {Math.round((d.probability || 0) * 100)}
                  </td>
                  <td className="py-1 text-center">{d.cycleDays ?? "-"}</td>
                  <td className="py-1 text-center">{d.status || "Open"}</td>
                </tr>
              ))}
              {!list.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-4 text-center text-xs text-muted-foreground"
                  >
                    No deals in this stage.
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
