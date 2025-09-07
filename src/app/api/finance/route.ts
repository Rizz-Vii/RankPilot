import { getFinanceMetrics } from "@/lib/finance/metrics";

// Lightweight auth enforcement: when live metrics are requested/enabled, require a Bearer token in production.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const modeEnv = (process.env.FINANCE_METRICS_MODE || "mock").toLowerCase();
  const financeMockParam = url.searchParams.get("financeMock");
  const isLiveRequested = financeMockParam === "0" || modeEnv === "live";

  if (isLiveRequested) {
    const authHeader =
      req.headers.get("authorization") || req.headers.get("Authorization");
    const isProd = process.env.NODE_ENV === "production";
    const hasTestBypass = url.searchParams.get("testUser") && !isProd;
    if (!authHeader && !hasTestBypass) {
      return new Response(JSON.stringify({ error: "auth_required" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "x-finance-diagnostics": "auth=missing",
        },
      });
    }
  }

  const { data, headers } = await getFinanceMetrics(req);
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}
