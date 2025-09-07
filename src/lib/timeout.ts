/**
 * Enhanced timeout utility for AI flows with performance monitoring
 */

export class TimeoutError extends Error {
  public readonly elapsedTime: number;
  public readonly timeoutMs: number;

  constructor(message: string, elapsedTime: number, timeoutMs: number) {
    super(message);
    this.name = "TimeoutError";
    this.elapsedTime = elapsedTime;
    this.timeoutMs = timeoutMs;
  }
}

export interface TimeoutOptions {
  timeoutMs: number;
  timeoutMessage?: string;
  onProgress?: (elapsedTime: number, remainingTime: number) => void;
  progressInterval?: number;
  retryCount?: number;
  retryDelay?: number;
}

export interface TimeoutResult<T> {
  result: T;
  elapsedTime: number;
  retryAttempts: number;
}

// Unified overload: if second arg is number returns Promise<T>, if object returns Promise<TimeoutResult<T>>
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage?: string
): Promise<T>;
export function withTimeout<T>(
  promise: Promise<T>,
  options: TimeoutOptions
): Promise<TimeoutResult<T>>;
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMsOrOptions: number | TimeoutOptions,
  timeoutMessage?: string
): Promise<T | TimeoutResult<T>> {
  const options: TimeoutOptions =
    typeof timeoutMsOrOptions === "number"
      ? { timeoutMs: timeoutMsOrOptions, timeoutMessage }
      : timeoutMsOrOptions;

  const {
    timeoutMs,
    timeoutMessage: message,
    onProgress,
    progressInterval = 1000,
    retryCount = 0,
    retryDelay = 1000,
  } = options;

  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout;
    let progressId: NodeJS.Timeout;
    let attempts = 0;

    const attemptOperation = async (): Promise<void> => {
      attempts++;
      const attemptStartTime = Date.now();

      // Set up timeout
      timeoutId = setTimeout(() => {
        if (progressId) clearInterval(progressId);
        const elapsedTime = Date.now() - startTime;
        reject(
          new TimeoutError(
            message ||
              `Operation timed out after ${timeoutMs}ms (attempt ${attempts}/${retryCount + 1})`,
            elapsedTime,
            timeoutMs
          )
        );
      }, timeoutMs);

      // Set up progress reporting
      if (onProgress) {
        progressId = setInterval(() => {
          const elapsedTime = Date.now() - attemptStartTime;
          const remainingTime = Math.max(0, timeoutMs - elapsedTime);
          onProgress(elapsedTime, remainingTime);
        }, progressInterval);
      }

      try {
        const result = await promise;
        const elapsedTime = Date.now() - startTime;

        // Clear timers
        clearTimeout(timeoutId);
        if (progressId) clearInterval(progressId);

        // Return result with metadata if using enhanced options
        if (typeof timeoutMsOrOptions === "object") {
          resolve({
            result,
            elapsedTime,
            retryAttempts: attempts - 1,
          } as TimeoutResult<T>);
        } else {
          resolve(result as T);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        if (progressId) clearInterval(progressId);

        // Retry logic
        if (
          attempts <= retryCount &&
          error instanceof Error &&
          !error.message.includes("timeout")
        ) {
          console.warn(
            `Attempt ${attempts} failed, retrying in ${retryDelay}ms...`,
            error.message
          );
          setTimeout(() => {
            void attemptOperation();
          }, retryDelay);
          return;
        }

        reject(error);
      }
    };

    void attemptOperation();
  });
}

// Enhanced timeout for AI operations with adaptive timeouts
export interface AITimeoutOptions {
  baseTimeoutMs?: number;
  maxTimeoutMs?: number;
  adaptiveTimeout?: boolean;
  operationType?: "simple" | "complex" | "llm-generation" | "data-processing";
  expectedTokens?: number;
  onSlowResponse?: (elapsedTime: number) => void;
}

export function withAITimeout<T>(
  promise: Promise<T>,
  options: AITimeoutOptions = {}
): Promise<TimeoutResult<T>> {
  const {
    baseTimeoutMs = 30000,
    maxTimeoutMs = 120000,
    adaptiveTimeout = true,
    operationType = "simple",
    expectedTokens = 0,
    onSlowResponse,
  } = options;

  // Calculate adaptive timeout based on operation type
  let timeoutMs = baseTimeoutMs;

  if (adaptiveTimeout) {
    switch (operationType) {
      case "simple":
        timeoutMs = Math.min(baseTimeoutMs, maxTimeoutMs);
        break;
      case "complex":
        timeoutMs = Math.min(baseTimeoutMs * 2, maxTimeoutMs);
        break;
      case "llm-generation":
        // Estimate based on tokens (rough: 100 tokens per second)
        const estimatedTime = expectedTokens
          ? (expectedTokens / 100) * 1000
          : baseTimeoutMs;
        timeoutMs = Math.min(
          Math.max(estimatedTime * 1.5, baseTimeoutMs),
          maxTimeoutMs
        );
        break;
      case "data-processing":
        timeoutMs = Math.min(baseTimeoutMs * 3, maxTimeoutMs);
        break;
    }
  }

  const slowResponseThreshold = timeoutMs * 0.5;
  let slowResponseTriggered = false;

  return withTimeout(promise, {
    timeoutMs,
    timeoutMessage: `AI operation (${operationType}) timed out after ${timeoutMs}ms`,
    onProgress: (elapsedTime) => {
      if (
        !slowResponseTriggered &&
        elapsedTime > slowResponseThreshold &&
        onSlowResponse
      ) {
        slowResponseTriggered = true;
        onSlowResponse(elapsedTime);
      }
    },
    progressInterval: 500,
    retryCount: operationType === "simple" ? 1 : 0,
    retryDelay: 2000,
  });
}
