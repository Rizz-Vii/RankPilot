"use server";
/**
 * @fileOverview AI-powered content brief generation.
 *
 * - generateContentBrief - Creates a detailed SEO content brief for a given keyword.
 * - ContentBriefInput - The input type for the generateContentBrief function.
 * - ContentBriefOutput - The return type for the generateContentBrief function.
 */

import { ai } from "@/ai/genkit";
import { z } from "zod";

const geminiApiKey = process.env.GEMINI_API_KEY;
const googleApiKey = process.env.GOOGLE_API_KEY;

const ContentBriefInputSchema = z.object({
  keyword: z
    .string()
    .describe("The primary target keyword for the content brief."),
});
export type ContentBriefInput = z.infer<typeof ContentBriefInputSchema>;

const ContentBriefOutputSchema = z.object({
  title: z
    .string()
    .describe("A compelling, SEO-optimized title for the article."),
  primaryKeyword: z
    .string()
    .describe("The primary keyword the brief is targeting."),
  searchIntent: z
    .string()
    .describe(
      'The user\'s likely intent (e.g., "Informational", "Commercial", "Transactional").'
    ),
  seoScore: z
    .number()
    .min(0)
    .max(100)
    .describe("A simulated SEO potential score from 0 to 100."),
  llmGeneratedOutline: z
    .array(z.string())
    .describe(
      "An ordered list of suggested headings to structure the content."
    ),
  recommendedMeta: z.object({
    title: z.string().describe("The suggested meta title."),
    description: z
      .string()
      .describe(
        "A concise and engaging meta description (155-160 characters)."
      ),
  }),
  competitorInsights: z
    .array(z.string())
    .describe("A list of insights about competitors for this keyword."),
  briefSummary: z
    .string()
    .describe("A summary of the brief and the main strategy to follow."),
});
export type ContentBriefOutput = z.infer<typeof ContentBriefOutputSchema>;

export async function generateContentBrief(
  input: ContentBriefInput
): Promise<ContentBriefOutput> {
  return contentBriefFlow(input);
}

const briefPrompt = ai.definePrompt({
  name: "contentBriefPrompt",
  input: { schema: ContentBriefInputSchema },
  output: { schema: ContentBriefOutputSchema },
  prompt: `You are an expert Content Strategist and SEO specialist. Your task is to generate a comprehensive content brief for a given target keyword. The brief should provide a clear roadmap for a writer to create a high-quality, SEO-optimized piece of content that can rank well on search engines.
Use the following API keys for enhanced analysis:
  - GEMINI_API_KEY: ${geminiApiKey}
  - GOOGLE_API_KEY: ${googleApiKey}
**Target Keyword:** {{{keyword}}}

**Instructions:**
Based on the target keyword, generate the following components for the content brief:

1.  **title:** The main headline for the article. Make it compelling and include the keyword.
2.  **primaryKeyword:** The main keyword to target. This should be the same as the input keyword.
3.  **searchIntent:** Classify the search intent. Is it "Informational", "Commercial", "Transactional", or "Navigational"?
4.  **seoScore:** Provide a simulated SEO potential score as a number between 0 and 100. This score should reflect how likely content based on this brief is to succeed, considering competition and opportunity.
5.  **llmGeneratedOutline:** Create a logical content structure with an array of H2 and H3 headings.
6.  **recommendedMeta:**
    *   **title:** An SEO-optimized meta title (50-60 characters).
    *   **description:** An engaging meta description (155-160 characters).
7.  **competitorInsights:** Provide 2-3 bullet points about what top-ranking competitors are doing for this keyword.
8.  **briefSummary:** A final summary of the core strategy for the writer.

Your entire output MUST be a single, valid JSON object that conforms to the provided output schema.
`,
});

const contentBriefFlow = ai.defineFlow(
  {
    name: "contentBriefFlow",
    inputSchema: ContentBriefInputSchema,
    outputSchema: ContentBriefOutputSchema,
  },
  async (input) => {
    const { output } = await briefPrompt(input);
    if (!output) {
      throw new Error('Content brief generation failed - no output received');
    }
    return output;
  }
);
