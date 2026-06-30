/**
 * POST /api/marketing/generate — REAL AI marketing generation (gemini-2.5-flash), Bearer-authed.
 * Replaces the deterministic pseudo-AI templates in marketing-automation.ts. Tasks:
 *   content   → a complete, publish-ready asset (blog/social/etc.)
 *   optimize  → rewrite copy for a channel to maximize engagement
 *   tone      → rewrite in a target tone
 *   variants  → N distinct variants (returns items[])
 *   subjects  → high-open-rate email subject lines (returns items[])
 */
import { ai } from "@/ai/genkit";
import { adminAuth } from "@/lib/firebase-admin";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    task?: string;
    type?: string;
    topic?: string;
    channel?: string;
    original?: string;
    base?: string;
    content?: string;
    tone?: string;
    count?: number;
  };

  let prompt = "";
  let listTask = false;
  switch (body.task) {
    case "content":
      prompt = `Write a complete, publish-ready ${body.type || "blog post"} about "${body.topic}". Be specific and genuinely valuable, with clear structure (use headings/lists where helpful) and a strong opening. Return ONLY the content — no preamble or meta commentary.`;
      break;
    case "optimize":
      prompt = `Rewrite this copy for ${body.channel || "social media"} to maximize engagement — a strong hook, clarity, and a clear call to action, in the platform's native voice. Return ONLY the rewritten copy:\n\n${body.original || ""}`;
      break;
    case "tone":
      prompt = `Rewrite the following in a ${body.tone || "professional"} tone, preserving meaning. Return ONLY the rewritten text:\n\n${body.content || ""}`;
      break;
    case "variants":
      listTask = true;
      prompt = `Generate ${body.count || 3} distinct, high-quality variants of this copy (different angles/hooks, same intent). Return ONLY a JSON array of strings:\n\n${body.base || ""}`;
      break;
    case "subjects":
      listTask = true;
      prompt = `Generate 5 high-open-rate email subject lines for a campaign about "${body.base}". Vary the angle (curiosity, benefit, urgency, personal). Return ONLY a JSON array of strings.`;
      break;
    default:
      return NextResponse.json({ error: "unknown_task" }, { status: 400 });
  }

  let text = "";
  try {
    const gen = await ai.generate(prompt);
    text =
      typeof gen === "string" ? gen : (gen as { text?: string })?.text || "";
  } catch {
    return NextResponse.json({ error: "generation_failed" }, { status: 502 });
  }
  if (!text) {
    return NextResponse.json({ error: "empty_generation" }, { status: 502 });
  }

  if (listTask) {
    let items: string[] = [];
    try {
      const f = text.replace(/```json|```/gi, "").trim();
      const s = f.indexOf("[");
      const e = f.lastIndexOf("]");
      items = JSON.parse(s >= 0 && e > s ? f.slice(s, e + 1) : f);
    } catch {
      items = text
        .split("\n")
        .map((l) => l.replace(/^[\d.\-*\s"]+/, "").replace(/"$/, "").trim())
        .filter(Boolean);
    }
    return NextResponse.json({
      items: items
        .filter((x): x is string => typeof x === "string")
        .slice(0, 8),
      provenance: "live",
    });
  }

  return NextResponse.json({ text: text.trim(), provenance: "live" });
}
