// Unified middleware entrypoint
// Wrap the implementation from src/middleware.ts so Next.js build reliably detects middleware.
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { config as cfg, middleware as impl } from "./src/middleware";

const useMinimal = process.env.MINIMAL_MIDDLEWARE === '1';

export function middleware(request: NextRequest) {
    if (useMinimal) return NextResponse.next();
    return impl(request);
}

export const config = useMinimal ? { matcher: "/:path*" } : cfg;
