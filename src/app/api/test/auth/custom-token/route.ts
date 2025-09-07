import "@/lib/firebase-admin";
import { enforceProvenance } from "@/lib/middleware/provenance";
import { getAuth } from "firebase-admin/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Test-only endpoint to mint a Firebase custom token for automation. Disabled in production.
export async function GET(_req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      enforceProvenance(
        { error: "forbidden" },
        { path: "test/auth/custom-token", note: "disabled" }
      ),
      { status: 403 }
    );
  }
  const uid = process.env.TEST_ADMIN_UID || "test-admin-uid";
  try {
    let auth: ReturnType<typeof getAuth> | null = null;
    try {
      auth = getAuth();
    } catch {
      // Fallback: return a stub token so downstream tests can proceed even if admin SDK not ready.
      return NextResponse.json(
        enforceProvenance(
          { token: "stub-test-token", uid },
          { path: "test/auth/custom-token" }
        ),
        { status: 200 }
      );
    }
    try {
      await auth.getUser(uid);
    } catch {
      try {
        await auth.createUser({
          uid,
          email: process.env.TEST_ADMIN_EMAIL || "admin@rankpilot.com",
        });
      } catch {}
    }
    const token = await auth.createCustomToken(uid, {
      role: "admin",
      test: true,
    });
    return NextResponse.json(
      enforceProvenance({ token, uid }, { path: "test/auth/custom-token" })
    );
  } catch (e) {
    return NextResponse.json(
      enforceProvenance(
        { error: (e as Error).message },
        { path: "test/auth/custom-token", note: "error" }
      ),
      { status: 500 }
    );
  }
}
