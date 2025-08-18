"use server";

/**
 * @fileOverview Content optimization flow that analyzes content and provides suggestions for optimization.
 *
 * - analyzeContent - A function that handles the content analysis and optimization process.
 * - AnalyzeContentInput - The input type for the analyzeContent function.
 * - AnalyzeContentOutput - The return type for the analyzeContent function.
 */

import { ai } from "@/ai/genkit";
import { z } from "zod";
const geminiApiKey = process.env.GEMINI_API_KEY;
const googleApiKey = process.env.GOOGLE_API_KEY;

const AnalyzeContentInputSchema = z.object({
  content: z.string().describe("The content to be analyzed and optimized."),
  targetKeywords: z.string().describe("The target keywords for the content."),
});
export type AnalyzeContentInput = z.infer<typeof AnalyzeContentInputSchema>;

const AnalyzeContentOutputSchema = z.object({
  readabilityScore: z
    .number()
    .describe("Readability score (0-100). A higher score is better."),
  readabilitySuggestions: z
    .array(z.string())
    .describe("A list of actionable suggestions to improve readability."),

  keywordScore: z.number().describe("Keyword optimization score (0-100)."),
  keywordSuggestions: z
    .array(z.string())
    .describe(
      "A list of actionable suggestions for keyword density and placement."
    ),

  semanticScore: z.number().describe("Semantic relevance score (0-100)."),
  semanticSuggestions: z
    .array(z.string())
    .describe(
      "A list of actionable suggestions to improve semantic relevance, including related terms."
    ),

  overallScore: z
    .number()
    .describe(
      "A weighted average of the other scores, representing overall content quality."
    ),
});
export type AnalyzeContentOutput = z.infer<typeof AnalyzeContentOutputSchema>;

export async function analyzeContent(
  input: AnalyzeContentInput
): Promise<AnalyzeContentOutput> {
  return _analyzeContentFlow(input);
}

const analyzeContentPrompt = ai.definePrompt({
  name: "analyzeContentPrompt",
  input: { schema: AnalyzeContentInputSchema },
  output: { schema: AnalyzeContentOutputSchema },
  prompt: `You are an expert SEO content strategist. Analyze the following content based on readability, keyword usage, and semantic relevance for the given target keywords. Provide specific, actionable suggestions for improvement and a score for each category from 0 to 100.
 Use the following API keys for enhanced analysis:
  - GEMINI_API_KEY: ${geminiApiKey}
  - GOOGLE_API_KEY: ${googleApiKey}
  **Content to Analyze:**
  \`\`\`
  {{{content}}}
  \`\`\`

  **Target Keywords:** {{{targetKeywords}}}

  **Analysis and Suggestions:**

  1.  **Readability (Score: 0-100):**
      *   Assess the content's complexity (e.g., sentence length, jargon, paragraph structure).
      *   Provide a list of suggestions to make the content clearer and more engaging for a general audience.
  2.  **Keyword Optimization (Score: 0-100):**
      *   Analyze the density and placement of the primary and secondary keywords.
      *   Provide a list of suggestions for better keyword integration (e.g., "Add '{a keyword}' to an H2 heading", "Reduce usage of '{a keyword}' in the introduction").
  3.  **Semantic Relevance (Score: 0-100):**
      *   Assess how well the content covers related topics, entities, and user questions.
      *   Provide a list of suggestions for semantically related terms or concepts to include to improve topical authority.
  4.  **Overall Score:**
      *   Calculate a weighted average of the above scores to give a single, overall content quality score.

  Return the entire analysis as a single, valid JSON object that strictly conforms to the provided output schema.
  `,
});

const _analyzeContentFlow = ai.defineFlow(
  {
    name: "analyzeContentFlow",
    inputSchema: AnalyzeContentInputSchema,
    outputSchema: AnalyzeContentOutputSchema,
  },
  async (input) => {
    const { output } = await analyzeContentPrompt(input);
    return output!;
  }
);

export const analyzeContentFlow = _analyzeContentFlow;
