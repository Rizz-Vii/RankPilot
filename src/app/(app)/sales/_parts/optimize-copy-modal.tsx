"use client";
// Sales Outreach — real AI copy optimizer. Rewrites outreach with a stronger hook + CTA for the
// chosen channel via /api/marketing/generate (task "optimize", gemini-2.5-flash). Replaces the dead
// "Optimize Copy" buttons that were no-ops.
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import React, { useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CHANNELS = ["email", "linkedin", "cold call opener", "sms"] as const;

export function OptimizeCopyModal({ open, onOpenChange }: Props): JSX.Element {
  const { user } = useAuth();
  const { toast } = useToast();
  const [original, setOriginal] = useState<string>("");
  const [channel, setChannel] = useState<string>("email");
  const [result, setResult] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  async function optimize(): Promise<void> {
    if (!original.trim()) {
      toast({ title: "Paste some copy to optimize first", variant: "destructive" });
      return;
    }
    setBusy(true);
    setResult("");
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/marketing/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ task: "optimize", original, channel }),
      });
      if (!res.ok) {
        throw new Error(
          res.status === 401
            ? "Please sign in again."
            : "Optimization failed — try again."
        );
      }
      const j = (await res.json()) as { text?: string };
      if (!j.text) throw new Error("No result returned.");
      setResult(j.text);
    } catch (e: unknown) {
      toast({
        title: "Optimize failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Optimize Outreach Copy</DialogTitle>
          <DialogDescription>
            Rewrite your outreach with a stronger hook and a clear CTA — real AI,
            tuned for the channel.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Channel:</span>
            <select
              className="h-8 border rounded px-2 bg-background"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <Textarea
            placeholder="Paste your outreach message…"
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
            rows={5}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={optimize} disabled={busy}>
              {busy ? "Optimizing…" : "Optimize"}
            </Button>
          </div>
          {result && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Optimized</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(result);
                    toast({ title: "Copied to clipboard" });
                  }}
                >
                  Copy
                </Button>
              </div>
              <Textarea
                value={result}
                readOnly
                rows={6}
                className="bg-background/50"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
