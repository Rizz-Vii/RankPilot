"use client";
/** Dev-only Agents feature flag toggle floating control. */
import { useEffect, useState } from "react";

const LS_KEY = "dev_agents_enabled_v1";

function getInitial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (raw === "true") return true;
  } catch {
    // ignore
  }
  return false;
}

export const AgentsToggle = (): JSX.Element | null => {
  const [enabled, setEnabled] = useState<boolean>(getInitial);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(LS_KEY, String(enabled));
    } catch {
      // ignore
    }

    const updateRemote = async () => {
      try {
        const method = enabled ? "POST" : "DELETE";
        await fetch("/api/agents/enable", { method });
      } catch {
        // swallow
      }
    };
    void updateRemote();

    const win = window as unknown as Record<string, unknown>;
    if (enabled) {
      win.RANKPILOT_AGENTS_ENABLED = true;
    } else {
      win.RANKPILOT_AGENTS_ENABLED = undefined;
    }
  }, [enabled, mounted]);

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <button
        type="button"
        onClick={() => setEnabled((e) => !e)}
        aria-pressed={enabled}
        className={`px-3 py-2 rounded-md text-xs font-medium border shadow-sm backdrop-blur-sm transition-colors ${enabled ? "bg-primary text-primary-foreground border-primary" : "bg-background/90 text-foreground border-border hover:bg-muted/70"}`}
        title="Toggle experimental Agents feature"
      >
        Agents: {enabled ? "ON" : "OFF"}
      </button>
    </div>
  );
};
