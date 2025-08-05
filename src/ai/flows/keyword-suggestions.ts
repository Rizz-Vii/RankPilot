// src/ai/flows/keyword-suggestions.ts
"use server";
/**
 * @fileOverview A keyword suggestion AI agent with performance optimization.
 *
 * - suggestKeywords - A function that handles the keyword suggestion process.
 * - SuggestKeywordsInput - The input type for the suggestKeywords function.
 * - SuggestKeywordsOutput - The return type for the suggestKeywords function.
 */

import { ai } from "@/ai/genkit";
import { z } from "zod";
import { optimizeOpenAI } from "@/lib/ai-optimizer";
import { withPerformanceMonitoring } from "@/lib/performance-monitor";

const SuggestKeywordsInputSchema = z.object({
  topic: z.string().describe("The topic for which to generate keywords."),
  includeLongTailKeywords: z
    .boolean()
    .default(false)
    .describe("Whether to include long-tail keywords in the suggestions."),
});
export type SuggestKeywordsInput = z.infer<typeof SuggestKeywordsInputSchema>;

const KeywordSuggestionSchema = z.object({
  keyword: z.string().describe("The suggested keyword phrase."),
  searchVolume: z
    .number()
    .describe("An estimated monthly search volume (e.g., 1200)."),
  difficulty: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "An estimated SEO difficulty score (0-100), where 100 is most difficult."
    ),
});

const SuggestKeywordsOutputSchema = z.object({
  keywords: z
    .array(KeywordSuggestionSchema)
    .describe(
      "An array of relevant keywords for the given topic, including their search volume and difficulty."
    ),
});
export type SuggestKeywordsOutput = z.infer<typeof SuggestKeywordsOutputSchema>;

export async function suggestKeywords(
  input: SuggestKeywordsInput
): Promise<SuggestKeywordsOutput> {
  return withPerformanceMonitoring(
    "keyword-suggestions",
    async () => {
      // Generate cache key for this specific request
      const cacheKey = `${input.topic.toLowerCase().trim()}-${input.includeLongTailKeywords}`;

      return optimizeOpenAI(
        (_prompt: string) =>
          suggestKeywordsFlow({
            topic: input.topic,
            includeLongTailKeywords: input.includeLongTailKeywords,
          }),
        cacheKey,
        {
          enableCaching: true,
          ttlMs: 15 * 60 * 1000, // 15 minutes cache for keyword suggestions
          operationType: "llm-generation",
          expectedTokens: 800, // Estimate for keyword list response
        }
      );
    },
    {
      userId: "system", // Could be passed from context
      expectedTokens: 800,
    }
  );
}

const prompt = ai.definePrompt({
  name: "suggestKeywordsPrompt",
  input: { schema: SuggestKeywordsInputSchema },
  output: { schema: SuggestKeywordsOutputSchema },
  prompt: `You are an expert SEO specialist. Your goal is to suggest 10-15 relevant keywords for a given topic, including simulated search volume and difficulty scores.

Topic: {{{topic}}}

{{#if includeLongTailKeywords}}
Include a mix of head terms and long-tail keywords in your suggestions.
{{/if}}

For each keyword, provide:
- keyword: The keyword phrase itself.
- searchVolume: A realistic, simulated monthly search volume for the keyword.
- difficulty: A score from 0-100 indicating how difficult it is to rank for this keyword.

Return a JSON object containing an array of these keyword objects.`,
});

const suggestKeywordsFlow = ai.defineFlow(
  {
    name: "suggestKeywordsFlow",
    inputSchema: SuggestKeywordsInputSchema,
    outputSchema: SuggestKeywordsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Keyword suggestions generation failed - no output received');
    }
    return output;
  }
);
