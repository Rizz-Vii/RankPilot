import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ErrorReporting } from "@google-cloud/error-reporting";

// Initialize error reporting
const errors = new ErrorReporting({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  reportMode: process.env.NODE_ENV === "production" ? "always" : "production",
});

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function handleError(error: unknown, _req: NextRequest): NextResponse {
  // Log the error
  if (error instanceof Error) {
    const errorContext = {
      url: req.url,
      method: req.method,
      userId: req.headers.get("x-user-id"),
    };
    errors.report(error);
    console.error("API Error:", { error, context: errorContext });
  }

  // Format the error response
  if (error instanceof AppError) {
    const _response: ErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    };
    return NextResponse.json(_response, { status: error.statusCode });
  }

  // Handle unexpected errors
  console.error("Unexpected error:", error);
  return NextResponse.json(
    {
      error: {
        code: "internal_error",
        message: "An unexpected error occurred",
      },
    },
    { status: 500 }
  );
}

// Example usage in API route:
// export async function POST(_req: NextRequest) {
//   try {
//     // Your API logic here
//   } catch (error) {
//     return handleError(error, _req);
//   }
// }
