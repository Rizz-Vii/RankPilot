import CustomerChatBot from "@/components/chat/CustomerChatBot";
import type { AuthContextType } from "@/context/AuthContext";
import { AuthContext } from "@/context/AuthContext";
import { strict as assert } from "assert";
import { createRoot } from "react-dom/client";

interface FetchInitLike {
  method?: string;
  body?: unknown;
}
function mockFetchEmpty(counter: { calls: number }) {
  // @ts-ignore
  global.fetch = async (url: string, init?: FetchInitLike) => {
    counter.calls++;
    const method = (init && init.method) || "GET";
    if (typeof url === "string" && url.startsWith("/api/chat/customer")) {
      // Streaming path – return minimal SSE stream
      if (url.includes("/stream") && method === "POST") {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            // emit a couple of tokens then final
            controller.enqueue(
              encoder.encode(
                "data: " + JSON.stringify({ token: "Hello " }) + "\n\n"
              )
            );
            controller.enqueue(
              encoder.encode(
                "data: " +
                  JSON.stringify({
                    token:
                      'world! <rp_meta>{"actions":["Analyze CWV","Find keywords"]}</rp_meta>',
                  }) +
                  "\n\n"
              )
            );
            controller.enqueue(
              encoder.encode(
                "data: " +
                  JSON.stringify({
                    final: true,
                    sessionId: "s1",
                    tokensUsed: 2,
                  }) +
                  "\n\n"
              )
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });
        return new Response(stream as unknown as BodyInit, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        });
      }
      if (method === "POST") {
        // Return a minimal ChatResponse to exercise Enter submission
        const body = JSON.stringify({
          response:
            'Hello from mock <rp_meta>{"actions":["Analyze CWV","Find keywords"]}</rp_meta>',
          sessionId: "s1",
          timestamp: new Date().toISOString(),
          tokensUsed: 1,
          context: { type: "mock", dataUsed: [] },
        });
        return new Response(body, {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      // GET history
      return new Response(
        JSON.stringify({ messages: [], sessionId: "s1", hasMore: false }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    return new Response("{}", { status: 404 });
  };
}

describe("CustomerChatBot suggestions + Enter", () => {
  it("renders deterministic suggestions and clicking populates input", async () => {
    const counter = { calls: 0 };
    mockFetchEmpty(counter);
    // Ensure the chat starts open to simplify DOM queries
    try {
      localStorage.setItem("rp_chat_isOpen", "1");
      localStorage.setItem("rp_chat_isMin", "0");
    } catch {}
    const authValue: AuthContextType = {
      user: {
        uid: "u1",
        getIdToken: async () => "t",
      } as unknown as AuthContextType["user"],
      loading: false,
      role: "user",
      profile: { subscriptionTier: "starter" },
      activities: [],
    };

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(
      <AuthContext.Provider value={authValue}>
        <CustomerChatBot
          initialSuggestions={["Analyze CWV", "Find keywords"]}
        />
      </AuthContext.Provider>
    );

    // Suggestions should appear from initialSuggestions deterministically
    const suggestionBtn = (await waitFor(
      () =>
        container.querySelector('button[aria-label="Suggestion: Analyze CWV"]'),
      1000
    )) as HTMLButtonElement;
    suggestionBtn.click();
    await delay(0);
    const inputAfter = container.querySelector(
      'input[placeholder="Ask about your SEO performance..."]'
    ) as HTMLInputElement;
    assert.equal(inputAfter.value, "Analyze CWV");
  });

  it("submits on Enter key", async () => {
    const counter = { calls: 0 };
    mockFetchEmpty(counter);
    try {
      localStorage.setItem("rp_chat_isOpen", "1");
      localStorage.setItem("rp_chat_isMin", "0");
    } catch {}
    const authValue: AuthContextType = {
      user: {
        uid: "u2",
        getIdToken: async () => "t",
      } as unknown as AuthContextType["user"],
      loading: false,
      role: "user",
      profile: { subscriptionTier: "starter" },
      activities: [],
    };
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(
      <AuthContext.Provider value={authValue}>
        <CustomerChatBot />
      </AuthContext.Provider>
    );
    const input = (await waitFor(() =>
      container.querySelector(
        'input[placeholder="Ask about your SEO performance..."]'
      )
    )) as HTMLInputElement;
    input.value = "Hello via Enter";
    input.dispatchEvent(
      new (window as unknown as { Event: typeof Event }).Event("input", {
        bubbles: true,
      })
    );
    input.dispatchEvent(
      new (
        window as unknown as { KeyboardEvent: typeof KeyboardEvent }
      ).KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await delay(0);
    assert.ok(counter.calls > 0, "fetch called on Enter submit");
  });
});

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
async function waitFor<T>(
  fn: () => T | null,
  timeout = 1000,
  interval = 25
): Promise<T> {
  const start = Date.now();
  while (true) {
    const v = fn();
    if (v) return v;
    if (Date.now() - start > timeout) throw new Error("waitFor timeout");
    await delay(interval);
  }
}
