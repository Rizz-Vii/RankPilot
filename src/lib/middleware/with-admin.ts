import {
  requireAdminFromHeaders,
  type AdminCheckResult,
} from "@/lib/auth/requireAdmin";
import { enforceProvenance } from "@/lib/middleware/provenance";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export type WithAdminHandler = (
  req: NextRequest,
  admin: AdminCheckResult
) => Promise<Response> | Response;

export function withAdmin(
  handler: WithAdminHandler,
  options?: {
    path?: string;
    unauthorizedMessage?: string;
    forbiddenMessage?: string;
    extraHeaders?: HeadersInit | ((req: NextRequest) => HeadersInit);
  }
) {
  const path = options?.path ?? "admin";
  const unauthorizedMessage = options?.unauthorizedMessage ?? "unauthorized";
  const forbiddenMessage = options?.forbiddenMessage ?? "forbidden";

  return async function wrapped(req: NextRequest): Promise<Response> {
    try {
      const admin = await requireAdminFromHeaders(req.headers);
      return await handler(req, admin);
    } catch (e: unknown) {
      const status =
        e && typeof e === "object" && "status" in (e as Record<string, unknown>)
          ? Number((e as { status?: number }).status)
          : 401;
      const payload = enforceProvenance(
        { error: status === 403 ? forbiddenMessage : unauthorizedMessage },
        { path }
      );
      const hdrs =
        typeof options?.extraHeaders === "function"
          ? options.extraHeaders(req)
          : (options?.extraHeaders ?? {});
      return NextResponse.json(payload, { status, headers: hdrs });
    }
  };
}
