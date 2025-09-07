import { withAdmin } from "@/lib/middleware/with-admin";
import { ingestSiteContentForOrg } from "@/lib/site-ingestion/crawler-ingest";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withAdmin(
  async (req: NextRequest, admin) => {
    try {
      const parsed = (await req.json().catch(() => ({}))) as {
        baseUrl?: string;
        maxPages?: number;
      };
      const baseUrl = parsed.baseUrl;
      const maxPages = parsed.maxPages as number | undefined;
      if (!baseUrl) {
        return NextResponse.json(
          { error: "baseUrl required" },
          { status: 400 }
        );
      }
      const result = await ingestSiteContentForOrg(admin.uid, {
        baseUrl,
        maxPages,
      });
      return NextResponse.json({ success: true, ...result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: message || "Ingestion failed" },
        { status: 500 }
      );
    }
  },
  { path: "admin/site/ingest" }
);
