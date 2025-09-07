import { adminDb } from "@/lib/firebase-admin";
import { openAIEmbeddingOrNull } from "@/lib/ai/aiClient";

/**
 * Generates and stores an embedding for a chat message (question focus) if enabled via env.
 */
export async function maybeEmbedMessage(params: {
  uid: string;
  sessionId: string;
  messageDocId: string;
  question: string;
}) {
  if (process.env.RANKPILOT_ENABLE_EMBEDDINGS !== "1") return;
  const apiKey = process.env.OPENAI_API_KEY; // gating only
  if (!apiKey) return;
  const text = (params.question || "").trim();
  if (!text) return;
  try {
    const vector = await openAIEmbeddingOrNull(text);
    if (!Array.isArray(vector)) return;
    await adminDb
      .collection("chatLogs")
      .doc(params.uid)
      .collection("sessions")
      .doc(params.sessionId)
      .collection("messages")
      .doc(params.messageDocId)
      .set(
        { embedding: { model: "text-embedding-3-small", question: vector } },
        { merge: true }
      );
  } catch {
    // swallow errors
  }
}
