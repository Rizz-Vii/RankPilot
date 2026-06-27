/**
 * T28: Event mirroring scaffold — publishes canonical events to Pub/Sub.
 * Controlled by EVENT_MIRROR_ENABLED env var ("1" = enabled, anything else = disabled).
 */

interface MirrorEventArgs {
  snapshot: { id: string; data: () => Record<string, unknown> };
  context: { params: { orgId: string; eventId: string } };
}

/**
 * Pub/Sub publish implementation — overridable for testing.
 * Set to a custom function before calling mirrorEvent in tests.
 */
export let _pubsubPublishImpl:
  | ((topic: string, payload: unknown) => Promise<void>)
  | null = null;

async function defaultPublish(topic: string, payload: unknown): Promise<void> {
  try {
    // Dynamic import to avoid hard dep at module load (optional peer dependency)
    const { PubSub } = await import("@google-cloud/pubsub");
    const client = new PubSub();
    const data = Buffer.from(JSON.stringify(payload));
    await client.topic(topic).publishMessage({ data });
  } catch (e) {
    // Log only — mirroring is best-effort and must not break the trigger
    console.warn("[event-mirror] publish failed:", (e as Error).message);
  }
}

export async function mirrorEvent(args: MirrorEventArgs): Promise<void> {
  if (process.env.EVENT_MIRROR_ENABLED !== "1") return;

  const { snapshot, context } = args;
  const data = snapshot.data();
  const eventId = snapshot.id ?? context.params.eventId;
  const orgId = (data?.orgId as string) ?? context.params.orgId;
  const type = data?.type as string | undefined;
  const ts =
    data?.ts instanceof Date
      ? data.ts
      : ((data?.ts as any)?.toDate?.() ?? new Date());

  const payload = {
    eventId,
    type: type ?? "unknown",
    orgId,
    createdAt: ts.toISOString(),
  };

  const publish = _pubsubPublishImpl ?? defaultPublish;
  await publish("events-raw", payload);
}
