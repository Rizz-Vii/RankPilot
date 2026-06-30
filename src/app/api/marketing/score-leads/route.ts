/**
 * POST /api/marketing/score-leads — REAL AI lead qualification (gemini-2.5-flash), Bearer-authed.
 * Replaces the random rand(15,98) scoring. Returns per-lead {score 0-100, tier, reasoning}.
 *
 * provenance:"estimated" — this is the model's JUDGMENT from the available signal (company name +
 * optional business context), NOT a measured conversion probability. When the user connects a CRM
 * (via the unified-integration layer) richer lead data flows in and the estimate gets sharper.
 */
import { ai } from "@/ai/genkit";
import { adminAuth } from "@/lib/firebase-admin";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LeadIn {
  id: string;
  name: string;
}

export async function POST(req: NextRequest) {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    await adminAuth.verifyIdToken(authHeader.replace(/^Bearer\s+/i, ""));
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    leads?: LeadIn[];
    businessContext?: string;
  };
  const leads = (body.leads || [])
    .filter((l) => l && l.id && typeof l.name === "string")
    .slice(0, 50);
  if (!leads.length) {
    return NextResponse.json({ scored: [], provenance: "estimated" });
  }

  const ctx = body.businessContext?.trim();
  const prompt = `You are a B2B lead-qualification analyst.${ctx ? ` You are qualifying leads for this business: "${ctx}".` : ""}
For each lead below, score its fit from 0-100 (higher = stronger fit / more likely to convert)${ctx ? ", judging how well it matches that business" : ", inferring likely industry, size, and fit from the company name"}. Assign a tier — "hot" (75-100), "warm" (45-74), "cold" (0-44) — and a one-sentence reasoning grounded ONLY in the available signal. Be honest and conservative when the signal is thin (a bare name carries little information).
Return ONLY a JSON array, one object per lead, reusing the same ids:
[{"id":"<id>","score":<0-100>,"tier":"hot|warm|cold","reasoning":"<one sentence>"}]

Leads:
${leads.map((l) => `- id=${l.id} name=${JSON.stringify(l.name)}`).join("\n")}`;

  let text = "";
  try {
    const gen = await ai.generate(prompt);
    text =
      typeof gen === "string" ? gen : (gen as { text?: string })?.text || "";
  } catch {
    return NextResponse.json({ error: "scoring_failed" }, { status: 502 });
  }
  if (!text) {
    return NextResponse.json({ error: "empty_scoring" }, { status: 502 });
  }

  let parsed: Array<{
    id?: string;
    score?: number;
    tier?: string;
    reasoning?: string;
  }> = [];
  try {
    const f = text.replace(/```json|```/gi, "").trim();
    const s = f.indexOf("[");
    const e = f.lastIndexOf("]");
    parsed = JSON.parse(s >= 0 && e > s ? f.slice(s, e + 1) : f);
  } catch {
    return NextResponse.json({ error: "parse_failed" }, { status: 502 });
  }

  const validIds = new Set(leads.map((l) => l.id));
  const scored = parsed
    .filter((p) => p && typeof p.id === "string" && validIds.has(p.id))
    .map((p) => {
      const score = Math.max(0, Math.min(100, Math.round(Number(p.score) || 0)));
      const tier =
        p.tier === "hot" || p.tier === "warm" || p.tier === "cold"
          ? p.tier
          : score >= 75
            ? "hot"
            : score >= 45
              ? "warm"
              : "cold";
      return {
        id: p.id as string,
        score,
        tier,
        reasoning: String(p.reasoning || "").slice(0, 240),
      };
    });

  return NextResponse.json({ scored, provenance: "estimated" });
}
