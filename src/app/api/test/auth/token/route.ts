import { enforceProvenance, withProvenance } from "@/lib/middleware/provenance";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// Non-production only endpoint to fetch current session user basic info (ID token not always accessible server-side)
export const GET = withProvenance(
  async function GET(): Promise<NextResponse> {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "disabled" }, { status: 404 });
    }

    try {
      const session = await getServerSession().catch(() => null);
      if (!session?.user) {
        const noSessionBody = enforceProvenance(
          { error: "not_authenticated" },
          { path: "test/auth/token", note: "no_session" }
        );
        return NextResponse.json(noSessionBody, { status: 401 });
      }

      const sessionUser = (session as unknown as { user?: unknown }).user;
      const okBody = enforceProvenance(
        { user: sessionUser },
        { path: "test/auth/token", note: "ok" }
      );
      return NextResponse.json(okBody);
    } catch (e: unknown) {
      const errMsg =
        e && typeof e === "object" && "message" in e
          ? (e as { message?: unknown }).message
          : undefined;
      const errBody = enforceProvenance(
        {
          error: "internal_error",
          message: typeof errMsg === "string" ? errMsg : undefined,
        },
        { path: "test/auth/token", note: "exception" }
      );
      return NextResponse.json(errBody, { status: 500 });
    }
  },
  { path: "test/auth/token" }
);
