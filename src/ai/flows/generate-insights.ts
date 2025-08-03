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

console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY);
console.log("GOOGLE_API_KEY:", googleApiKey);

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
  const { activities } = input;

  // If no activities, return empty insights
  if (!activities || activities.length === 0) {
    return { insights: [] };
  }

  // Analyze activities to generate insights
  const insights = generateInsightsFromActivities(activities);

  return { insights };
}

function generateInsightsFromActivities(activities: any[]): Array<{
  id: string;
  title: string;
  description: string;
  category: 'Technical SEO' | 'Content' | 'Link Building' | 'Keywords';
  priority: 'High' | 'Medium' | 'Low';
  estimatedImpact: 'High' | 'Medium' | 'Low';
  actionLink?: string;
  actionText?: string;
}> {
  const insights = [];

  // Analyze tool usage patterns
  const toolCounts = activities.reduce((acc, activity) => {
    acc[activity.tool] = (acc[activity.tool] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostUsedTool = Object.keys(toolCounts).reduce((a, b) =>
    toolCounts[a] > toolCounts[b] ? a : b
  );

  // Generate insights based on activity patterns
  if (toolCounts['seo-audit'] > 2) {
    insights.push({
      id: 'multiple-seo-audits',
      title: 'Multiple SEO Audits Detected',
      description: `You've run ${toolCounts['seo-audit']} SEO audits recently. Consider implementing the recommendations from your latest audit to improve your site's performance.`,
      category: 'Technical SEO' as const,
      priority: 'High' as const,
      estimatedImpact: 'High' as const,
      actionLink: '/audit',
      actionText: 'View Latest Audit'
    });
  }

  if (toolCounts['keyword-research'] && !toolCounts['content-brief']) {
    insights.push({
      id: 'keyword-to-content',
      title: 'Turn Keyword Research into Content',
      description: 'You\'ve been researching keywords but haven\'t created content briefs yet. Transform your research into actionable content plans.',
      category: 'Content' as const,
      priority: 'Medium' as const,
      estimatedImpact: 'High' as const,
      actionLink: '/content-brief',
      actionText: 'Create Content Brief'
    });
  }

  if (activities.some(a => a.resultsSummary?.includes('error') || a.resultsSummary?.includes('failed'))) {
    insights.push({
      id: 'technical-issues',
      title: 'Technical Issues Need Attention',
      description: 'Some of your recent activities encountered errors. Review and resolve these technical issues to improve your SEO workflow.',
      category: 'Technical SEO' as const,
      priority: 'High' as const,
      estimatedImpact: 'Medium' as const
    });
  }

  // Default insights if patterns don't match
  if (insights.length === 0) {
    insights.push({
      id: 'great-activity',
      title: 'Great SEO Activity!',
      description: `You've been actively using ${mostUsedTool} and other SEO tools. Keep up the momentum and consider expanding to other optimization areas.`,
      category: 'Keywords' as const,
      priority: 'Low' as const,
      estimatedImpact: 'Medium' as const
    });
  }

  // Limit to 5 insights
  return insights.slice(0, 5);
}
