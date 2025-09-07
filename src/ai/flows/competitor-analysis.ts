// src/ai/flows/competitor-analysis.ts
"use server";
/**
 * @fileOverview Competitor analysis flow that compares keyword rankings and identifies content gaps.
 *
 * - analyzeCompetitors - A function that handles the competitor analysis process.
 * - CompetitorAnalysisInput - The input type for the analyzeCompetitors function.
 * - CompetitorAnalysisOutput - The return type for the analyzeCompetitors function.
 */

import { z } from "zod";
import { ai } from "../genkit";
const geminiApiKey: string | undefined = process.env.GEMINI_API_KEY;
const googleApiKey: string | undefined = process.env.GOOGLE_API_KEY;

const CompetitorAnalysisInputSchema = z.object({
  yourUrl: z.string().url().describe("The URL of your website."),
  competitorUrls: z
    .array(z.string().url())
    .describe("An array of your competitors' URLs."),
  keywords: z.array(z.string()).describe("An array of keywords to compare."),
});
export type CompetitorAnalysisInput = z.infer<
  typeof CompetitorAnalysisInputSchema
>;

const RankInfoSchema = z.object({
  rank: z
    .union([z.number(), z.string()])
    .describe(
      "The simulated search engine rank (as a number), or 'N/A' (as a string) if not in the top 100."
    ),
  reason: z
    .string()
    .optional()
    .describe(
      "A brief explanation for the rank, especially if 'N/A' (e.g., 'Domain is a search engine', 'Lacks content on this topic')."
    ),
});

const RankingDataItemSchema = z
  .object({
    keyword: z.string(),
    yourRank: RankInfoSchema.optional(),
  })
  .catchall(RankInfoSchema.optional());

const CompetitorAnalysisOutputSchema = z.object({
  rankings: z
    .array(RankingDataItemSchema)
    .describe(
      "An array of keyword ranking data for your site and competitors."
    ),
  contentGaps: z
    .array(z.string())
    .describe(
      "An array of keywords or topics that competitors rank for but you do not."
    ),
});
export type CompetitorAnalysisOutput = z.infer<
  typeof CompetitorAnalysisOutputSchema
>;

export const analyzeCompetitors = async (
  input: CompetitorAnalysisInput
): Promise<CompetitorAnalysisOutput> => {
  return _competitorAnalysisFlow(input);
};

const analysisPrompt = ai.definePrompt({
  name: "competitorAnalysisPrompt",
  input: { schema: CompetitorAnalysisInputSchema },
  output: { schema: CompetitorAnalysisOutputSchema },
  prompt: `You are a world-class SEO strategist with deep expertise in competitive analysis and content strategy. Your primary goal is to provide actionable intelligence by analyzing search engine ranking positions and identifying strategic content gaps.
Use the following API keys for enhanced analysis:
  - GEMINI_API_KEY: ${geminiApiKey}
  - GOOGLE_API_KEY: ${googleApiKey}
**Analysis Context:**

*   **My Website URL:** {{{yourUrl}}}
*   **Competitor URLs:**
    {{#each competitorUrls}}
    - {{{this}}}
    {{/each}}
*   **Keywords for Analysis:**
    {{#each keywords}}
    - {{{this}}}
    {{/each}}

**Instructions:**

1.  **Simulate Keyword Rankings:**
    *   For each provided keyword, perform a realistic, simulated analysis of where each URL would rank in the top 100 search results.
    *   Your simulation should consider typical factors like domain authority, content relevance, and on-page optimization.
    *   The ranking information for each URL must be an object with two properties: \`rank\` and \`reason\`.
    *   \`rank\`: This should be the simulated numerical rank. If a URL is unlikely to rank in the top 100, set this to the string "N/A".
    *   \`reason\`: Provide a concise explanation for the rank. If the rank is "N/A", **you must explain why**. For example: "URL is a generic search engine, not a content site", "Page lacks specific content about this keyword", or "Low domain authority for a competitive term". This reason is crucial.
    *   The ranking object for "My Website" should be assigned to the \`yourRank\` property.
    *   For each competitor, create a property in the ranking object where the key is the **full competitor URL** and the value is its corresponding ranking object.

2.  **Identify Content Gaps:**
    *   Based on the ranking analysis, identify keywords or topic clusters where competitors have a strong presence (e.g., ranking in the top 20) but my website ranks poorly (e.g., rank > 50 or "N/A").
    *   These gaps represent significant opportunities for content creation.
    *   List these content gap opportunities as an array of descriptive strings. For example, instead of just "AI tools", suggest "blog post comparing AI SEO tools" or "landing page for AI-powered content generation".

3.  **Strictly Adhere to Output Format:**
    *   Your entire output MUST be a single, valid JSON object that conforms to the provided output schema.
    *   Ensure all property keys and string values are correctly quoted.
    *   The competitor ranks must use the full URL as the key.
    *   The 'rankings' array must contain exactly one entry for each keyword listed in the "Keywords for Analysis" section above. Do not create multiple entries for the same keyword.
  `,
});

const _competitorAnalysisFlow = ai.defineFlow(
  {
    name: "competitorAnalysisFlow",
    inputSchema: CompetitorAnalysisInputSchema,
    outputSchema: CompetitorAnalysisOutputSchema,
  },
  async (input) => {
    // In a real-world scenario, you would first scrape the SERPs for each keyword
    // to get actual ranking data. Then, you might pass that data to the AI for
    // gap analysis. For this prototype, we will rely on the AI to simulate the data.
    const { output } = await analysisPrompt(input);
    return output!;
  }
);

export const competitorAnalysisFlow = _competitorAnalysisFlow;
