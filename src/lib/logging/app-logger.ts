/**
 * App Logger (Isomorphic) - LOG-01 Phase 1
 * Provides a unified structured logging surface for both server and client runtime.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";
export interface LogContext extends Record<string, unknown> {}
export interface LogEnvelope {
  timestamp: string;
  level: LogLevel;
  message: string;
  traceId?: string;
  spanId?: string;
  component?: string;
  context?: LogContext;
  elapsedMs?: number;
  audit?: boolean;
  degraded?: boolean;
}
const isServer = typeof window === "undefined";
function genId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
export interface LoggerOptions {
  component?: string;
  traceId?: string;
  startTime?: number;
}
class AppLoggerImpl {
  private component?: string;
  private traceId?: string;
  private startTime: number;
  constructor(opts: LoggerOptions = {}) {
    this.component = opts.component;
    this.traceId = opts.traceId;
    this.startTime =
      opts.startTime ??
      (typeof performance !== "undefined" ? performance.now() : Date.now());
  }
  child(ctx: Partial<LoggerOptions>) {
    return new AppLoggerImpl({
      component: ctx.component || this.component,
      traceId: ctx.traceId || this.traceId,
      startTime: this.startTime,
    });
  }
  withTrace(component?: string) {
    return this.child({ component, traceId: genId("trace") });
  }
  private emit(
    level: LogLevel,
    message: string,
    context?: LogContext & { __audit?: boolean; __degraded?: boolean }
  ) {
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const { __audit, __degraded, ...rest } = context || {};
    const env: LogEnvelope = {
      timestamp: new Date().toISOString(),
      level,
      message,
      traceId: this.traceId,
      component: this.component,
      elapsedMs: Math.round(now - this.startTime),
      audit: __audit || undefined,
      degraded: __degraded || undefined,
      ...(context
        ? { context: Object.keys(rest).length ? rest : undefined }
        : {}),
    };
    const line = JSON.stringify(env);

    const consoleAny = console as unknown as Record<
      string,
      (...args: unknown[]) => void
    >;
    (consoleAny[level === "debug" ? "debug" : level] || consoleAny.log)(line);
  }
  debug(m: string, c?: LogContext) {
    this.emit("debug", m, c);
  }
  info(m: string, c?: LogContext) {
    this.emit("info", m, c);
  }
  warn(m: string, c?: LogContext) {
    this.emit("warn", m, c);
  }
  error(m: string, c?: LogContext) {
    this.emit("error", m, c);
  }
  /** Audit log (immutability / compliance events). Writes at info level with audit flag. */
  audit(m: string, c?: LogContext) {
    this.emit("info", m, { ...(c || {}), __audit: true });
  }
  /** Degraded mode notice (feature fallback, partial failure). Warn level with degraded flag for observability. */
  degraded(m: string, c?: LogContext) {
    this.emit("warn", m, { ...(c || {}), __degraded: true });
  }
}
export const appLogger = new AppLoggerImpl({
  component: isServer ? "server" : "client",
});
export function getLogger(component: string) {
  return appLogger.child({ component });
}
export type AppLogger = AppLoggerImpl;
