import { adminAuth, adminDb } from "@/lib/firebase-admin";

export type AdminCheckResult = {
  uid: string;
  email?: string;
  isAdmin: boolean;
};

/**
 * Verifies a Bearer Firebase ID token and checks for admin privileges.
 * Admin if: custom claim admin === true OR users/{uid}.role === 'admin'.
 * Throws 401/403-compatible errors to be used in API handlers.
 */
export async function requireAdminFromHeaders(
  headers: Headers
): Promise<AdminCheckResult> {
  const authHeader =
    headers.get("authorization") || headers.get("Authorization");
  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
    const err = new Error("auth_required");
    // @ts-expect-error attach status
    err.status = 401;
    throw err;
  }
  const idToken = authHeader.replace(/^Bearer\s+/i, "");
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = (decoded as { email?: string }).email;
    const claimAdmin = Boolean(
      (decoded as Record<string, unknown>)["admin"] === true
    );
    if (claimAdmin) return { uid, email, isAdmin: true };

    // Fallback to users collection role flag
    const snap = await adminDb.collection("users").doc(uid).get();
    const role = (snap.data() as { role?: string } | undefined)?.role;
    if (role === "admin") return { uid, email, isAdmin: true };

    const err = new Error("forbidden");
    // @ts-expect-error attach status
    err.status = 403;
    throw err;
  } catch (e: unknown) {
    if (
      e &&
      typeof e === "object" &&
      "status" in (e as Record<string, unknown>)
    ) {
      // Preserve pre-tagged status errors
      throw e as unknown as Error;
    }
    const err = new Error("unauthorized");
    // @ts-expect-error attach status
    err.status = 401;
    throw err;
  }
}
