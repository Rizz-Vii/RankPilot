"use server";
/**
 * @fileOverview SERP analysis flow that simulates search engine results for a given keyword.
 * Build-safe implementation with mock SERP data generation.
 */

import { z } from "zod";

const _SerpViewInputSchema = z.object({
  keyword: z.string().describe("The keyword to search for."),
});
export type SerpViewInput = z.infer<typeof _SerpViewInputSchema>;

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

const _SerpViewOutputSchema = z.object({
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
export type SerpViewOutput = z.infer<typeof _SerpViewOutputSchema>;

export async function getSerpData(
  input: SerpViewInput
): Promise<SerpViewOutput> {
  const { keyword } = input;

  // Generate mock organic results
  const organicResults = Array.from({ length: 10 }, (_, index) => ({
    position: index + 1,
    title: `${keyword} - Best ${generateVariation(keyword, index)} Guide`,
    url: `https://${generateDomain(index)}.com/${keyword.toLowerCase().replace(/\s+/g, '-')}-guide`,
    snippet: `Learn everything about ${keyword} with our comprehensive guide. ${generateSnippet(keyword, index)}`
  }));

  // Generate mock "People Also Ask" questions
  const peopleAlsoAsk = [
    {
      question: `What is ${keyword}?`,
      answer: `${keyword} is a concept/tool/service that helps users achieve their goals through various methods and techniques.`
    },
    {
      question: `How does ${keyword} work?`,
      answer: `${keyword} works by implementing specific algorithms and processes to deliver results efficiently.`
    },
    {
      question: `Is ${keyword} free?`,
      answer: `${keyword} availability depends on the specific service or tool you're using. Many offer free tiers or trials.`
    },
    {
      question: `What are the benefits of ${keyword}?`,
      answer: `The main benefits include improved efficiency, better results, and cost-effective solutions for your needs.`
    }
  ];

  // Determine SERP features based on keyword characteristics
  const serpFeatures = {
    hasFeaturedSnippet: keyword.toLowerCase().includes('what') || keyword.toLowerCase().includes('how'),
    hasImagePack: keyword.toLowerCase().includes('design') || keyword.toLowerCase().includes('photo'),
    hasVideoCarousel: keyword.toLowerCase().includes('tutorial') || keyword.toLowerCase().includes('how to'),
    topStories: keyword.toLowerCase().includes('news') || keyword.toLowerCase().includes('latest')
  };

  return {
    organicResults,
    peopleAlsoAsk,
    serpFeatures
  };
}

// Helper functions for generating realistic mock data
function generateVariation(keyword: string, index: number): string {
  const variations = [
    'Complete', 'Ultimate', 'Professional', 'Advanced', 'Beginner\'s',
    'Expert', 'Comprehensive', 'Quick', 'Detailed', 'Essential'
  ];
  return variations[index % variations.length];
}

function generateDomain(index: number): string {
  const domains = [
    'expertguide', 'tutorials-hub', 'learnmore', 'guide-central', 'howto-wiki',
    'knowledge-base', 'tutorial-corner', 'learn-today', 'guide-master', 'info-hub'
  ];
  return domains[index % domains.length];
}

function generateSnippet(keyword: string, index: number): string {
  const snippets = [
    'Step-by-step instructions included.',
    'Updated for 2025 with latest best practices.',
    'Includes practical examples and case studies.',
    'Written by industry experts.',
    'Beginner-friendly with advanced tips.',
    'Covers all essential topics thoroughly.',
    'Includes video tutorials and resources.',
    'Real-world applications and use cases.',
    'Frequently updated with new information.',
    'Community-driven content and reviews.'
  ];
  return snippets[index % snippets.length];
}
