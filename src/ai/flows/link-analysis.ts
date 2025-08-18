"use server";
/**
 * @fileOverview Link analysis flow that simulates finding backlinks for a target URL.
 * This version uses the standard Genkit defineFlow/definePrompt pattern with a
 * resilient fallback to OpenAI.
 */

import { ai } from "@/ai/genkit";
import { z } from "zod";
import OpenAI from "openai";
import { zodToJsonSchema } from "zod-to-json-schema";

// --- Zod Schemas and Types ---

const LinkAnalysisInputSchema = z.object({
  url: z.string().url().describe("The URL to analyze for backlinks."),
});

const BacklinkSchema = z.object({
  referringDomain: z
    .string()
    .describe("The domain of the page containing the backlink."),
  backlinkUrl: z
    .string()
    .describe("The full URL of the page containing the backlink."),
  anchorText: z.string().describe("The anchor text of the backlink."),
  domainAuthority: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "A simulated Domain Authority score (0-100) for the referring domain."
    ),
});

const LinkAnalysisOutputSchema = z.object({
  backlinks: z
    .array(BacklinkSchema)
    .describe("An array of discovered backlinks."),
  summary: z
    .object({
      totalBacklinks: z
        .number()
        .describe("The total number of backlinks found."),
      referringDomains: z
        .number()
        .describe("The number of unique referring domains."),
    })
    .describe("A summary of the backlink profile."),
});

export type LinkAnalysisInput = z.infer<typeof LinkAnalysisInputSchema>;
export type LinkAnalysisOutput = z.infer<typeof LinkAnalysisOutputSchema>;

// --- Main Exported Function (Client-facing) ---

export async function analyzeLinks(
  input: LinkAnalysisInput
): Promise<LinkAnalysisOutput> {
  // This function now correctly calls the Genkit flow.
  return _linkAnalysisFlow(input);
}

// --- Genkit Prompt Definition ---

const analysisSystemPrompt = `
You are a world-class SEO Analyst and Data Simulation Engine. Your mission is to perform a deep, analytical backlink profile simulation for a given URL. You must think step-by-step to generate a realistic and diverse dataset that reflects a genuine backlink profile.

**Persona:** Act as an expert SEO with 15 years of experience using tools like Ahrefs and Majestic.

**Core Task:** Generate a comprehensive and plausible backlink profile. The profile must be diverse in terms of link type, authority, and anchor text.

**Step-by-Step Thinking Process:**

1.  **Analyze the Target URL (Conceptually):** First, infer the likely industry and topic of the target URL. This will inform the types of referring domains you generate. For example, a tech product URL should have links from tech blogs, review sites, and forums.

2.  **Simulate Backlink Diversity:** A real backlink profile is not uniform. You must generate a list of 10 to 20 backlinks that includes a mix of the following types:
    *   **High-Authority Contextual Links:** (2-3 links) From reputable news sites or top-tier industry blogs (e.g., a guest post). These should have high Domain Authority (70-95).
    *   **Medium-Authority Links:** (5-10 links) From standard blogs, niche forums, or business directories. These should have medium Domain Authority (30-69).
    *   **Low-Authority Links:** (3-7 links) From smaller blogs, forum comments, or general web directories. These should have low Domain Authority (10-29).

3.  **Simulate Anchor Text Diversity:** A natural anchor text profile is critical. Distribute your anchor texts as follows:
    *   **Branded:** The company or brand name (e.g., "GitHub Copilot").
    *   **Naked URL:** The URL itself (e.g., "https://copilot.github.com").
    *   **Keyword-Related:** Keywords relevant to the target page's topic (e.g., "AI programming assistant").
    *   **Generic:** Non-descriptive text (e.g., "click here," "read more," "this website").

4.  **Construct the Final JSON Output:** After simulating the data, assemble it into a single JSON object. The summary values (\`totalBacklinks\`, \`referringDomains\`) must be calculated accurately from the backlinks array you created.

**CRITICAL OUTPUT REQUIREMENTS:**

*   Your entire response MUST be a single, valid JSON object.
*   The JSON object must strictly adhere to the provided output schema.
`;

const linkAnalysisPrompt = ai.definePrompt({
  name: "linkAnalysisPrompt",
  input: { schema: LinkAnalysisInputSchema },
  output: { schema: LinkAnalysisOutputSchema },
  prompt: `${analysisSystemPrompt}\n\n**URL to Analyze:** {{{url}}}`,
});

// --- Genkit Flow Definition with Fallback Logic ---

const _linkAnalysisFlow = ai.defineFlow(
  {
    name: "linkAnalysisFlow",
    inputSchema: LinkAnalysisInputSchema,
    outputSchema: LinkAnalysisOutputSchema,
  },
  async (input) => {
    try {
      // --- Attempt 1: Primary Provider (Google via Genkit) ---
      console.log("Attempting analysis with primary provider (Google)...");
      const { output } = await linkAnalysisPrompt(input);
      if (!output) {
        throw new Error("Primary AI provider returned no output.");
      }
      return output;
    } catch (error: unknown) {
      const err = error as { message?: string; cause?: unknown };
      console.warn("Primary provider (Google) failed:", err.message);
      // Check if it's a service availability error
      const cause = err.cause as { status?: number } | undefined;
      if (
        (cause && cause.status === 503) ||
        (err.message && err.message.includes("overloaded"))
      ) {
        // --- Attempt 2: Fallback Provider (OpenAI) ---
        try {
          // Initialize the OpenAI client for fallback use
          const openaiKey = process.env.OPENAI_API_KEY;
          console.log("openai_API_KEY:", openaiKey);
          const openai = new OpenAI({ apiKey: openaiKey });
          console.log("Falling back to secondary provider (OpenAI)...");
          const openAISystemPrompt = `${analysisSystemPrompt}\n\nCRITICAL: Your entire response MUST be a single, valid JSON object that strictly adheres to the following JSON Schema: ${JSON.stringify(
            zodToJsonSchema(LinkAnalysisOutputSchema)
          )}`;

          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: "system", content: openAISystemPrompt },
              { role: "user", content: `Analyze the URL: ${input.url}` },
            ],
            response_format: { type: "json_object" },
          });

          const text = response.choices[0].message.content;
          if (!text) throw new Error("OpenAI returned no content.");

          const jsonOutput = JSON.parse(text);
          return LinkAnalysisOutputSchema.parse(jsonOutput);
        } catch (fallbackError: unknown) {
          const fe = fallbackError as { message?: string };
          console.error(
            "Secondary provider (OpenAI) also failed:",
            fe.message || fallbackError
          );
          throw new Error("Both primary and fallback AI services failed.");
        }
      }
      // Re-throw other types of errors from the primary provider
      throw error;
    }
  }
);

// Provide a named export aligned with call-sites when needed
export const linkAnalysisFlow = _linkAnalysisFlow;
