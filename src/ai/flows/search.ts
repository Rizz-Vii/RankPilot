"use server";
/**
 * @fileOverview AI-powered search for application features.
 *
 * - searchFeatures - Finds relevant app features based on a user query.
 * - SearchInput - The input type for the searchFeatures function.
 * - SearchOutput - The return type for the searchFeatures function.
 */

import { ai } from "@/ai/genkit";
import { z } from "zod";
const geminiApiKey = process.env.GEMINI_API_KEY;
const googleApiKey = process.env.GOOGLE_API_KEY;

const SearchInputSchema = z.object({
  query: z.string().describe("The user's search query."),
});
export type SearchInput = z.infer<typeof SearchInputSchema>;

const SearchResultItemSchema = z.object({
  title: z.string().describe("The title of the feature or page."),
  href: z.string().describe("The relative URL path to the feature."),
  description: z
    .string()
    .describe("A brief description of what the feature does."),
});

const SearchOutputSchema = z.object({
  results: z
    .array(SearchResultItemSchema)
    .describe("An array of relevant features."),
});
export type SearchOutput = z.infer<typeof SearchOutputSchema>;

export async function searchFeatures(
  input: SearchInput
): Promise<SearchOutput> {
  return searchFeaturesFlow(input);
}

const searchPrompt = ai.definePrompt({
  name: "searchFeaturesPrompt",
  input: { schema: SearchInputSchema },
  output: { schema: SearchOutputSchema },
  prompt: `You are a search engine for the RankPilot application. Based on the user's query, find the most relevant features.
Use the following API keys for enhanced analysis:
  - GEMINI_API_KEY: ${geminiApiKey}
  - GOOGLE_API_KEY: ${googleApiKey}
**Available Features:**
- **Dashboard**: href="/dashboard", description="Overview of key SEO metrics and activity."
- **Insights**: href="/insights", description="AI-generated actionable recommendations."
- **Content Brief**: href="/content-brief", description="Generates detailed SEO content outlines."
- **Keyword Tool**: href="/keyword-tool", description="Suggests keywords based on a topic."
- **Content Analyzer**: href="/content-analyzer", description="Analyzes content for readability, keywords, and semantic relevance."
- **Competitors**: href="/competitors", description="Compares keyword rankings against competitors."
- **SERP View**: href="/serp-view", description="Visualizes search engine results pages."
- **SEO Audit**: href="/seo-audit", description="Performs a technical SEO audit of a URL."
- **Link View**: href="/link-view", description="Analyzes backlinks for a target URL."
- **Admin**: href="/adminonly", description="Administrative area for user management."
- **Profile**: href="/profile", description="Manage your user profile and settings."

**User Query:** {{{query}}}

Return a JSON array of the most relevant features based on the query. If the query is empty or irrelevant, return an empty array.
`,
});

const searchFeaturesFlow = ai.defineFlow(
  {
    name: "searchFeaturesFlow",
    inputSchema: SearchInputSchema,
    outputSchema: SearchOutputSchema,
  },
  async (input) => {
    const { output } = await searchPrompt(input);
    if (!output) {
      throw new Error('Search generation failed - no output received');
    }
    return output;
  }
);
