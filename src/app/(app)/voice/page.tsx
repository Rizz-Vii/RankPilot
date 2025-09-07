"use client";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { useState } from "react";

export default function VoiceAgentPage() {
  const [phone, setPhone] = useState("");
  const [pitch, setPitch] = useState(
    "Quick intro: we'd love to show you RankPilot. Are you free next week?"
  );
  const [start, setStart] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    // datetime-local expects 'YYYY-MM-DDTHH:mm'
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [serviceId, setServiceId] = useState("voice-demo");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    apptId?: string;
    error?: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/voice/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          pitch,
          schedule: new Date(start).toISOString(),
          serviceId,
        }),
      });
      const body = await res.json();
      setResult(body);
    } catch (err) {
      setResult({ ok: false, error: String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <FeatureGate feature="voice_agent" requiredTier="agency" showUpgrade>
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">
          Voice Agent (Outbound Demo)
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Enter a phone number and a brief pitch. This simulates an outbound
          call and books an appointment.
        </p>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-4 bg-white/5 p-4 rounded-md border border-white/10"
        >
          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-1">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              className="w-full px-3 py-2 rounded-md bg-white/10 border border-white/10 focus:outline-none"
              placeholder="+1 555 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="pitch" className="block text-sm font-medium mb-1">
              Pitch
            </label>
            <textarea
              id="pitch"
              className="w-full px-3 py-2 rounded-md bg-white/10 border border-white/10 focus:outline-none"
              rows={4}
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start" className="block text-sm font-medium mb-1">
                Appointment Start
              </label>
              <input
                id="start"
                type="datetime-local"
                className="w-full px-3 py-2 rounded-md bg-white/10 border border-white/10 focus:outline-none"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </div>
            <div>
              <label
                htmlFor="serviceId"
                className="block text-sm font-medium mb-1"
              >
                Service ID
              </label>
              <input
                id="serviceId"
                type="text"
                className="w-full px-3 py-2 rounded-md bg-white/10 border border-white/10 focus:outline-none"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-md bg-primary text-white disabled:opacity-50"
          >
            {loading ? "Calling…" : "Call & Book"}
          </button>
        </form>

        {result && (
          <div className="mt-4 p-3 rounded-md border border-white/10">
            {result.ok ? (
              <div className="text-green-500 text-sm">
                Success. Appointment ID:{" "}
                <span className="font-mono">{result.apptId}</span>
              </div>
            ) : (
              <div className="text-red-500 text-sm">
                Failed: {result.error || "unknown_error"}
              </div>
            )}
          </div>
        )}
      </div>
    </FeatureGate>
  );
}
