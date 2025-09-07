import { searchFeatures } from "@/ai/flows/search";
import { enforceProvenance } from "@/lib/middleware/provenance";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchOutput = {
  results: Array<{ title: string; href: string; description: string }>;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const query = typeof body?.query === "string" ? body.query : "";
    if (!query || query.trim().length < 3) {
      return NextResponse.json(
        enforceProvenance({ results: [] } as SearchOutput, {
          path: "search/features",
          note: "empty-or-short",
        })
      );
    }
    const out = await searchFeatures({ query });
    return NextResponse.json(
      enforceProvenance(out as unknown as SearchOutput, {
        path: "search/features",
      })
    );
  } catch (e) {
    const message =
      e &&
      typeof e === "object" &&
      "message" in e &&
      typeof (e as { message?: unknown }).message === "string"
        ? (e as { message: string }).message
        : "internal error";
    return NextResponse.json(
      enforceProvenance(
        { error: "internal", message } as unknown as SearchOutput,
        { path: "search/features", note: "error" }
      ),
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || "";
  if (!query || query.trim().length < 3) {
    return NextResponse.json(
      enforceProvenance({ results: [] } as SearchOutput, {
        path: "search/features",
        note: "empty-or-short",
      })
    );
  }
  try {
    const out = await searchFeatures({ query });
    return NextResponse.json(
      enforceProvenance(out as unknown as SearchOutput, {
        path: "search/features",
      })
    );
  } catch (e) {
    const message =
      e &&
      typeof e === "object" &&
      "message" in e &&
      typeof (e as { message?: unknown }).message === "string"
        ? (e as { message: string }).message
        : "internal error";
    return NextResponse.json(
      enforceProvenance(
        { error: "internal", message } as unknown as SearchOutput,
        { path: "search/features", note: "error" }
      ),
      { status: 500 }
    );
  }
}
