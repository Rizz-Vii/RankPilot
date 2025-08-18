import OpenAI from "openai";
import { gemini15Flash } from "@genkit-ai/googleai"; // Import the model reference
import { ai } from "./genkit";
import { z, ZodType } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
// Initialize the OpenAI client for fallback
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generates a JSON object from an AI model using a specified prompt.
 * Tries the primary provider (Google Gemini via Genkit) first. If it fails with a
 * service availability error, it automatically falls back to the secondary
 * provider (OpenAI).
 *
 * @param {string} systemPrompt - The system-level instructions for the AI.
 * @param {string} userPrompt - The user's specific request.
 * @param {ZodType} outputSchema - The Zod schema that defines the desired output structure.
 * @returns {Promise<unknown>} A promise that resolves to the parsed JSON output.
 */
export async function generateJson(
  systemPrompt: string,
  userPrompt: string,
  outputSchema: ZodType
): Promise<unknown> {
  // --- Attempt 1: Primary Provider (Google Gemini via Genkit) ---
  try {
    // Using the configured `ai` instance with a schema directly returns the parsed object.
    const result = await ai.generate({
      model: gemini15Flash,
      prompt: `${systemPrompt}\n\n${userPrompt}`,
      output: {
        schema: outputSchema,
      },
      config: {
        temperature: 0.1,
      },
    });

    // CORRECTED: The 'result' is the final, parsed output object. No .output() method is needed.
    return result;
  } catch (error: unknown) {
    const err = error as { message?: string; cause?: unknown };
    console.warn("Primary AI provider (Google) failed. Reason:", err.message);
    // If it's a service error, try the fallback. Otherwise, fail fast.
    const cause = err.cause as { status?: number } | undefined;
    if (
      (cause && cause.status === 503) ||
      (err.message && err.message.includes("overloaded"))
    ) {
      console.log("Falling back to secondary provider (OpenAI)...");
    } else {
      // Re-throw other errors
      throw new Error(`Primary AI provider failed: ${err.message || 'unknown error'}`);
    }
  }
  // --- Attempt 2: Fallback Provider (OpenAI) ---
  try {
    // For the fallback, we manually provide the JSON schema in the prompt
    const openAISystemPrompt = `${systemPrompt}\n\nCRITICAL: Your entire response MUST be a single, valid JSON object that strictly adheres to the following JSON Schema: ${JSON.stringify(
      zodToJsonSchema(outputSchema)
    )}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: openAISystemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const text = response.choices[0].message.content;
    if (!text) throw new Error("OpenAI returned no content.");

    const jsonOutput = JSON.parse(text);
    // Validate the output from the fallback provider against the schema
    return outputSchema.parse(jsonOutput);
  } catch (fallbackError: unknown) {
    const ferr = fallbackError as { message?: string };
    console.error(
      "Fallback AI provider (OpenAI) also failed:",
      ferr.message
    );
    throw new Error(
      "All available AI providers failed. Please try again later."
    );
  }
}
