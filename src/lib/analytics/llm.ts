import { features } from "@/lib/flags";
import { getLogger } from "@/lib/logging/app-logger";

const logger = getLogger("analytics.llm");

export type LlmProvider = "openai" | "gemini" | "fallback" | "unknown";

export function recordLlmUsage(
  provider: LlmProvider,
  ok: boolean,
  latencyMs: number
): void {
  if (!features.llmVisibility) return;
  const bucket =
    latencyMs < 200
      ? "<200"
      : latencyMs < 500
        ? "200-499"
        : latencyMs < 1000
          ? "500-999"
          : ">=1000";
  // Console-only in dev; noop in prod unless env flag is set (this module uses the same flag)
  logger.info("llm.usage", { provider, ok, bucket });
}
