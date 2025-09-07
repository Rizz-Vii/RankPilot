import type { UnknownObject } from "@/types/shared";

export interface BrainPlan {
  steps: UnknownObject[];
}
export interface ToolInvocation {
  name: string;
  input: UnknownObject;
}
export interface ValidationResult {
  ok: boolean;
  issues?: string[];
}

// Simple in-memory registry and plan cache for the brain orchestrator
const toolRegistry = new Map<
  string,
  (input: UnknownObject) => Promise<UnknownObject> | UnknownObject
>();
const planCache: Record<string, BrainPlan> = Object.create(null) as Record<
  string,
  BrainPlan
>;

export let currentPlan: BrainPlan | null = null;

/**
 * Register a tool handler by name.
 * Subsequent invokeTool calls with this name will dispatch to the handler.
 */
export function registerTool(
  name: string,
  handler: (input: UnknownObject) => Promise<UnknownObject> | UnknownObject
): void {
  if (!name || typeof name !== "string")
    throw new Error("Tool name must be a non-empty string");
  if (typeof handler !== "function")
    throw new Error("Tool handler must be a function");
  toolRegistry.set(name, handler);
}

/**
 * Invoke a registered tool by name with the provided input.
 * Ensures the output is a plain serializable object.
 */
export async function invokeTool(t: ToolInvocation): Promise<UnknownObject> {
  const handler = toolRegistry.get(t.name);
  if (!handler) throw new Error(`Tool not registered: ${t.name}`);

  const result = await Promise.resolve(
    handler(t.input ?? ({} as UnknownObject))
  );

  // Validate and normalize the result to an object
  const validation = validate(result as UnknownObject);
  if (!validation.ok) {
    // Attach minimal diagnostic info but avoid throwing away the result entirely
    return {
      error: "validation_failed",
      issues: validation.issues,
      raw: safeSerializable(result),
    } as UnknownObject;
  }
  return result as UnknownObject;
}

/**
 * Validate that the result is safe to serialize and not a function/primitive-only payload.
 */
export function validate(result: UnknownObject): ValidationResult {
  const issues: string[] = [];

  // Must be a non-null object and not an array
  const isObject =
    typeof result === "object" && result !== null && !Array.isArray(result);
  if (!isObject)
    return { ok: false, issues: ["Result must be a non-null object"] };

  // Attempt JSON serialization to detect circular/unserializable values
  try {
    void JSON.stringify(result, replacerLimited);
  } catch {
    issues.push("Result is not JSON-serializable");
  }

  return {
    ok: issues.length === 0,
    issues: issues.length ? issues : undefined,
  };
}

/**
 * Serialize a plan to a plain object suitable for persistence or transport.
 */
export function serializePlan(p: BrainPlan): UnknownObject {
  return {
    steps: Array.isArray(p.steps) ? p.steps.map(safeSerializable) : [],
  } as UnknownObject;
}

/**
 * Cache and retrieve plans (optional helpers used by orchestrator UIs)
 */
export function cachePlan(key: string, plan: BrainPlan): void {
  planCache[key] = plan;
}
export function getCachedPlan(key: string): BrainPlan | undefined {
  return planCache[key];
}

// Helpers
function replacerLimited(_k: string, val: unknown) {
  if (typeof val === "function") return undefined;
  if (typeof val === "bigint") return val.toString();
  if (val instanceof Map) return Object.fromEntries(val.entries());
  if (val instanceof Set) return Array.from(val.values());
  return val as unknown;
}

function safeSerializable<T>(value: T): UnknownObject | T {
  if (typeof value !== "object" || value === null) return value;
  try {
    JSON.stringify(value, replacerLimited);
    return value as unknown as UnknownObject;
  } catch {
    // Best-effort shallow clone with JSON-safe values only
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      try {
        JSON.stringify(v, replacerLimited);
        out[k] = v;
      } catch {
        out[k] = String(v);
      }
    }
    return out as UnknownObject;
  }
}

// TODO: refine UnknownObject for tool registry & plan serialization
