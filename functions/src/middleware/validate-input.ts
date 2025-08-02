import { z } from "zod";
import { HttpsError } from "firebase-functions/v2/https";

export function validateInput<T>(schema: z.Schema<T>, _data: unknown): T {
  try {
    return schema.parse(_data);
  } catch (_error) {
    if (error instanceof z.ZodError) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid input data",
        error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        }))
      );
    }
    throw new HttpsError("internal", "Error validating input");
  }
}

// Common schemas
export const urlSchema = z
  .string()
  .url()
  .transform((url) => {
    try {
      const parsed = new URL(url);
      return parsed.toString();
    } catch {
      throw new Error("Invalid URL");
    }
  });

export const emailSchema = z
  .string()
  .email()
  .transform((email) => email.toLowerCase().trim());

export const userIdSchema = z.string().min(1);

export const timestampSchema = z.object({
  seconds: z.number(),
  nanoseconds: z.number(),
});

// Example usage:
// const auditSchema = z.object({
//   url: urlSchema,
//   depth: z.number().int().min(1).max(5).optional().default(1),
//   userId: userIdSchema,
//   timestamp: timestampSchema,
// });
