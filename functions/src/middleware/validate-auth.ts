import { CallableRequest } from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import { DecodedIdToken } from "firebase-admin/auth";

export interface AuthenticatedRequest extends CallableRequest {
  auth: {
    uid: string;
    token: DecodedIdToken & {
      role?: string;
    };
  };
}

export function validateAuth(_request: CallableRequest): AuthenticatedRequest {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  return request as AuthenticatedRequest;
}

export function validateAdmin(_request: CallableRequest): AuthenticatedRequest {
  const authedRequest = validateAuth(_request);

  if (authedRequest.auth.token.role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "This function requires admin privileges."
    );
  }

  return authedRequest;
}
