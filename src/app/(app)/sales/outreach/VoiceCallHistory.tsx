"use client";
import { db } from "@/lib/firebase";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

type VoiceCallDoc = {
  callSid?: string | null;
  to?: string;
  from?: string | null;
  status?: string;
  direction?: string;
  createdAt?: unknown;
  plannedAt?: unknown;
  recordingUrl?: string | null;
  config?: {
    interactive?: boolean;
    voice?: string;
    language?: string;
    rate?: number;
    script?: string | null;
  };
  gather?: { digits?: string; speechResult?: string } | null;
};

function toDate(v: unknown): Date | null {
  try {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v === "string") {
      const d = new Date(v);
      return Number.isFinite(d.getTime()) ? d : null;
    }
    if (
      typeof v === "object" &&
      v &&
      "toDate" in (v as Record<string, unknown>)
    ) {
      const fn = (v as { toDate?: () => unknown }).toDate;
      if (typeof fn === "function") {
        const d = fn();
        if (d instanceof Date) return d as Date;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function VoiceCallHistory() {
  const [items, setItems] = useState<Array<{ id: string } & VoiceCallDoc>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "voice_calls"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as VoiceCallDoc),
        }));
        setItems(rows);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const rows = useMemo(
    () =>
      items.map((x) => {
        const created = toDate(x.createdAt);
        const planned = toDate(x.plannedAt);
        const gather = x.gather || undefined;
        const gatherText = gather?.digits
          ? `DTMF: ${gather.digits}`
          : gather?.speechResult
            ? `Speech: ${gather.speechResult}`
            : "—";
        return {
          id: x.id,
          at: created || planned,
          to: x.to || "—",
          from: x.from || "—",
          status: x.status || "—",
          direction: x.direction || "—",
          interactive: x?.config?.interactive ? "yes" : "no",
          gather: gatherText,
          recordingUrl:
            x?.recordingUrl ||
            (x as unknown as { recordingUrl?: string })?.recordingUrl ||
            undefined,
          callSid: x.callSid || undefined,
        };
      }),
    [items]
  );

  return (
    <section className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Call History</h2>
        {loading && (
          <span className="text-xs text-muted-foreground">Loading…</span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-2 pr-3">When</th>
              <th className="py-2 pr-3">To</th>
              <th className="py-2 pr-3">From</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Dir</th>
              <th className="py-2 pr-3">Interactive</th>
              <th className="py-2 pr-3">Response</th>
              <th className="py-2 pr-3">Recording</th>
              <th className="py-2">SID</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-2 pr-3 whitespace-nowrap">
                  {r.at ? (
                    <time dateTime={r.at.toISOString()}>
                      {r.at.toLocaleString()}
                    </time>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2 pr-3 font-mono text-xs">{r.to}</td>
                <td className="py-2 pr-3 font-mono text-xs">{r.from}</td>
                <td className="py-2 pr-3">{r.status}</td>
                <td className="py-2 pr-3">{r.direction}</td>
                <td className="py-2 pr-3">{r.interactive}</td>
                <td
                  className="py-2 pr-3 max-w-[22rem] truncate"
                  title={r.gather}
                >
                  {r.gather}
                </td>
                <td className="py-2 pr-3">
                  {r.recordingUrl ? (
                    <a
                      href={r.recordingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      open
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td
                  className="py-2 font-mono text-[10px] max-w-[12rem] truncate"
                  title={r.callSid}
                >
                  {r.callSid || "—"}
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr>
                <td
                  className="py-6 text-center text-muted-foreground"
                  colSpan={9}
                >
                  No recent calls.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
