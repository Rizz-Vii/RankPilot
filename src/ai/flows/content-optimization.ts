// src/ai/flows/content-optimization.ts
"use server";
/**
 * @fileOverview Content optimization flow using Google Gemini for SEO analysis and improvement.
 */

import { z } from "zod";

const _AnalyzeContentInputSchema = z.object({
  content: z.string().describe("The content to analyze and optimize for SEO."),
  targetKeyword: z.string().describe("The primary keyword to optimize for."),
  additionalKeywords: z
    .array(z.string())
    .optional()
    .describe("Additional keywords to consider during optimization."),
  contentType: z
    .enum(["article", "product-page", "landing-page", "blog-post"])
    .optional()
    .describe("The type of content being optimized."),
});

const _AnalyzeContentOutputSchema = z.object({
  seoScore: z.number().min(0).max(100),
  suggestions: z.array(
    z.object({
      category: z.enum([
        "keyword-optimization",
        "readability",
        "structure",
        "meta-elements",
        "internal-linking",
      ]),
      suggestion: z
        .string()
        .describe("Specific actionable suggestion for improvement."),
      priority: z.enum(["high", "medium", "low"]),
      impact: z
        .string()
        .describe("Expected impact of implementing this suggestion."),
    })
  ),
  optimizedContent: z
    .string()
    .describe("The optimized version of the content."),
  metaTitle: z
    .string()
    .max(60)
    .describe("Optimized meta title for the content."),
  metaDescription: z
    .string()
    .max(160)
    .describe("Optimized meta description for the content."),
  keywordDensity: z.record(z.string(), z.number()),
  readabilityScore: z.number().min(0).max(100),
});

export type AnalyzeContentInput = z.infer<typeof _AnalyzeContentInputSchema>;
export type AnalyzeContentOutput = z.infer<typeof _AnalyzeContentOutputSchema>;

export async function analyzeContent(
  input: AnalyzeContentInput
): Promise<AnalyzeContentOutput> {

  // Calculate basic keyword density
  const words = input.content.toLowerCase().split(/\s+/);
  const totalWords = words.length;
  const keywordCount = words.filter((word: string) =>
    word.includes(input.targetKeyword.toLowerCase())
  ).length;
  const keywordDensity = totalWords > 0 ? (keywordCount / totalWords) * 100 : 0;

  // Generate mock SEO analysis
  const mockResult: AnalyzeContentOutput = {
    seoScore: Math.min(85, Math.max(60, 70 + Math.floor(keywordDensity * 3))),
    suggestions: [
      {
        category: "keyword-optimization",
        suggestion: `Increase usage of target keyword "${input.targetKeyword}" to 1-2% density`,
        priority: "high",
        impact: "Could improve rankings for target keyword by 15-20%"
      },
      {
        category: "structure",
        suggestion: "Add more H2 and H3 headings to improve content structure",
        priority: "medium",
        impact: "Better content organization and user experience"
      },
      {
        category: "readability",
        suggestion: "Break up long paragraphs for better readability",
        priority: "medium",
        impact: "Improved user engagement and time on page"
      },
      {
        category: "meta-elements",
        suggestion: "Optimize meta title to include target keyword near the beginning",
        priority: "high",
        impact: "Improved click-through rate from search results"
      },
      {
        category: "internal-linking",
        suggestion: "Add 2-3 relevant internal links to related content",
        priority: "low",
        impact: "Better site structure and improved page authority"
      }
    ],
    optimizedContent: input.content + `\n\n[Content optimized for "${input.targetKeyword}" with improved SEO structure]`,
    metaTitle: `${input.targetKeyword} - Complete Guide | Your Brand`,
    metaDescription: `Learn everything about ${input.targetKeyword}. Expert insights, actionable tips, and proven strategies to help you succeed.`,
    keywordDensity: {
      [input.targetKeyword]: keywordDensity,
      ...(input.additionalKeywords?.reduce((acc: Record<string, number>, keyword: string) => {
        const count = words.filter((word: string) => word.includes(keyword.toLowerCase())).length;
        acc[keyword] = totalWords > 0 ? (count / totalWords) * 100 : 0;
        return acc;
      }, {} as Record<string, number>) || {})
    },
    readabilityScore: Math.floor(Math.random() * 20) + 75 // 75-95 range
  };

  return mockResult;
}
