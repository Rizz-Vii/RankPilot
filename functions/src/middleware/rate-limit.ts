import type { CallableRequest } from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { validateAuth } from "./validate-auth";

const db = getFirestore();

interface RateLimit {
  lastRequest: FirebaseFirestore.Timestamp;
  count: number;
}

export async function enforceRateLimit(
  request: CallableRequest,
  limitPerMinute: number = 60
): Promise<void> {
  const authedRequest = validateAuth(request);
  const userId = authedRequest.auth.uid;

  const rateLimitRef = db.collection("rateLimits").doc(userId);

  try {
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);
      const now = FirebaseFirestore.Timestamp.now();
      const oneMinuteAgo = FirebaseFirestore.Timestamp.fromMillis(
        now.toMillis() - 60000
      );

      if (!doc.exists) {
        transaction.set(rateLimitRef, {
          lastRequest: now,
          count: 1,
        });
        return;
      }

      const data = doc.data() as RateLimit;

      if (data.lastRequest.toMillis() < oneMinuteAgo.toMillis()) {
        // Reset counter if last request was more than a minute ago
        transaction.update(rateLimitRef, {
          lastRequest: now,
          count: 1,
        });
      } else if (data.count >= limitPerMinute) {
        throw new HttpsError(
          "resource-exhausted",
          `Rate limit exceeded. Maximum ${limitPerMinute} requests per minute.`
        );
      } else {
        // Increment counter
        transaction.update(rateLimitRef, {
          lastRequest: now,
          count: data.count + 1,
        });
      }
    });
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Error checking rate limit");
  }
}
