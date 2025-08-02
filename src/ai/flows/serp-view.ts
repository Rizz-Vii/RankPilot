"use server";
/**
 * @fileOverview SERP analysis flow that simulates search engine results for a given keyword.
 *
 * - getSerpData - A function that handles the SERP analysis process.
 * - SerpViewInput - The input type for the getSerpData function.
 * - SerpViewOutput - The return type for the getSerpData function.
 */

import { ai } from "@/ai/genkit";
import { z } from "zod";
const geminiApiKey = process.env.GEMINI_API_KEY;
const googleApiKey = process.env.GOOGLE_API_KEY;
const SerpViewInputSchema = z.object({
  keyword: z.string().describe("The keyword to search for."),
});
export type SerpViewInput = z.infer<typeof SerpViewInputSchema>;

const OrganicResultSchema = z.object({
  position: z.number().describe("The ranking position."),
  title: z.string().describe("The title of the search result."),
  url: z.string().describe("The URL of the search result."),
  snippet: z.string().describe("A short descriptive snippet from the page."),
});

const PeopleAlsoAskSchema = z.object({
  question: z.string().describe("A question that people also ask."),
  answer: z.string().describe("A concise answer to the question."),
});

const SerpFeaturesSchema = z.object({
  hasFeaturedSnippet: z
    .boolean()
    .describe("Whether the SERP contains a featured snippet at the top."),
  hasImagePack: z
    .boolean()
    .describe("Whether the SERP contains a pack of image results."),
  hasVideoCarousel: z
    .boolean()
    .describe("Whether the SERP contains a carousel of video results."),
  topStories: z
    .boolean()
    .describe("Whether the SERP contains a 'Top Stories' news section."),
});

const SerpViewOutputSchema = z.object({
  organicResults: z
    .array(OrganicResultSchema)
    .describe("The top 10 organic search results."),
  peopleAlsoAsk: z
    .array(PeopleAlsoAskSchema)
    .describe(
      "A list of related questions people also ask, including answers."
    ),
  serpFeatures: SerpFeaturesSchema.describe(
    "An analysis of common SERP features present for this keyword."
  ),
});
export type SerpViewOutput = z.infer<typeof SerpViewOutputSchema>;

export async function getSerpData(
  input: SerpViewInput
): Promise<SerpViewOutput> {
  return serpViewFlow(input);
}

const serpPrompt = ai.definePrompt({
  name: "serpViewPrompt",
  input: { schema: SerpViewInputSchema },
  output: { schema: SerpViewOutputSchema },
  prompt: `You are a search engine simulator. Your task is to generate a realistic Search Engine Results Page (SERP) for the given keyword.
Use the following API keys for enhanced analysis:
  - GEMINI_API_KEY: ${geminiApiKey}
  - GOOGLE_API_KEY: ${googleApiKey}
**Keyword:** {{{keyword}}}

**Instructions:**
1.  **Generate Organic Results:** Create a list of exactly 10 organic search results. Each result must include a realistic position, title, URL, and a descriptive snippet. The URLs should be varied and look like real websites (e.g., blog posts, documentation, news articles, commercial sites), not just placeholders like 'example.com'.
2.  **Generate "People Also Ask":** Create a list of 4 relevant questions that users might also ask related to the keyword. For each question, provide a concise, helpful answer.
3.  **Analyze SERP Features:** Based on the results you are generating, determine which common SERP features are present. For example, if your top result is a direct answer, set `hasFeaturedSnippet` to true. If you include image or video results, set the corresponding flags.
4.  **Realism:** The titles, URLs, and snippets should be plausible and highly relevant to the keyword.
5.  **Strictly Adhere to Output Format:** Your entire output MUST be a single, valid JSON object that conforms to the provided output schema.
`,
});

const serpViewFlow = ai.defineFlow(
  {
    name: "serpViewFlow",
    inputSchema: SerpViewInputSchema,
    outputSchema: SerpViewOutputSchema,
  },
  async (input) => {
    const { output } = await serpPrompt(input);
    if (!output) {
      throw new Error("AI did not return valid SERP data.");
    }
    return output;
  }
);
