"use server";
/**
 * @fileOverview AI-powered SEO insights generation based on user activity.
 *
 * - generateInsights - Analyzes user activity to provide actionable SEO recommendations.
 * - GenerateInsightsInput - The input type for the generateInsights function.
 * - GenerateInsightsOutput - The return type for the generateInsights function.
 */

import { ai } from "@/ai/genkit";
import { z } from "zod";
const geminiApiKey = process.env.GEMINI_API_KEY;
const googleApiKey = process.env.GOOGLE_API_KEY;

// Mask sensitive keys if accidentally logged (avoid leaking full values in build output)
if (process.env.NODE_ENV !== 'production') {
  console.log("GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);
  console.log("GOOGLE_API_KEY present:", !!googleApiKey);
}

const ActivitySchema = z.object({
  type: z.string(),
  tool: z.string(),
  details: z.any().optional(),
  resultsSummary: z.string().optional(),
});

const GenerateInsightsInputSchema = z.object({
  activities: z
    .array(ActivitySchema)
    .describe("A list of recent user activities."),
});
export type GenerateInsightsInput = z.infer<typeof GenerateInsightsInputSchema>;

const InsightSchema = z.object({
  id: z
    .string()
    .describe(
      "A unique identifier for the insight (e.g., 'title-tag-optimization')."
    ),
  title: z.string().describe("A concise, actionable title for the insight."),
  description: z
    .string()
    .describe("A brief explanation of the issue or opportunity."),
  category: z
    .enum(["Technical SEO", "Content", "Link Building", "Keywords"])
    .describe("The SEO category of the insight."),
  priority: z
    .enum(["High", "Medium", "Low"])
    .describe("The priority level for addressing the insight."),
  estimatedImpact: z
    .enum(["High", "Medium", "Low"])
    .describe("The estimated SEO impact of addressing the insight."),
  actionLink: z
    .string()
    .optional()
    .describe(
      "A suggested internal link to a relevant tool (e.g., '/seo-audit')."
    ),
  actionText: z
    .string()
    .optional()
    .describe("The text for the action link button (e.g., 'View Audit')."),
});

const GenerateInsightsOutputSchema = z.object({
  insights: z
    .array(InsightSchema)
    .describe("An array of generated SEO insights."),
});
export type GenerateInsightsOutput = z.infer<
  typeof GenerateInsightsOutputSchema
>;

export async function generateInsights(
  input: GenerateInsightsInput
): Promise<GenerateInsightsOutput> {
  return generateInsightsFlow(input);
}

const insightsPrompt = ai.definePrompt({
  name: "generateInsightsPrompt",
  input: { schema: GenerateInsightsInputSchema },
  output: { schema: GenerateInsightsOutputSchema },
  prompt: `You are an expert SEO consultant reviewing a user's recent activity on an SEO platform. Your task is to analyze their actions and provide 3-5 highly relevant, actionable insights.
Use the following API keys for enhanced analysis:
  - GEMINI_API_KEY: ${geminiApiKey}
  - GOOGLE_API_KEY: ${googleApiKey}
**User's Recent Activities:**
{{#each activities}}
- **Tool:** {{{tool}}}
  - **Action:** {{{type}}}
  - **Details:** {{json details}}
  - **Summary:** {{{resultsSummary}}}
{{/each}}

**Instructions:**
1.  Analyze the provided activities to identify patterns, recurring issues, or opportunities. For example, if they repeatedly audit the same site with poor scores, that's a key insight. If they research keywords but never generate content briefs, suggest that as a next step.
2.  Generate a list of 3 to 5 unique, actionable insights based on this analysis.
3.  For each insight, provide a clear title, description, category, priority, and estimated impact.
4.  If applicable, suggest a relevant tool within the platform they can use to address the insight by providing an \`actionLink\` and \`actionText\`.
5.  Prioritize insights that seem most urgent or impactful based on the data. For example, a failed SEO audit is more critical than a single keyword search.
6.  If there is no activity, return an empty array of insights.

Your entire output MUST be a single, valid JSON object that conforms to the provided output schema. Do not add any extra commentary.
`,
});

const generateInsightsFlow = ai.defineFlow(
  {
    name: "generateInsightsFlow",
    inputSchema: GenerateInsightsInputSchema,
    outputSchema: GenerateInsightsOutputSchema,
  },
  async (input) => {
    const { output } = await insightsPrompt(input);
    return output!;
  }
);
