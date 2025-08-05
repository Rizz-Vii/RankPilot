"use server";
/**
 * @fileOverview Link analysis flow that simulates finding backlinks for a target URL.
 * Build-safe implementation with mock data generation.
 */

import { z } from "zod";

// --- Zod Schemas and Types ---

const _LinkAnalysisInputSchema = z.object({
  url: z.string().url().describe("The URL to analyze for backlinks."),
});

const BacklinkSchema = z.object({
  referringDomain: z
    .string()
    .describe("The domain of the page containing the backlink."),
  backlinkUrl: z
    .string()
    .describe("The full URL of the page containing the backlink."),
  anchorText: z.string().describe("The anchor text of the backlink."),
  domainAuthority: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "A simulated Domain Authority score (0-100) for the referring domain."
    ),
});

const _LinkAnalysisOutputSchema = z.object({
  backlinks: z
    .array(BacklinkSchema)
    .describe("An array of discovered backlinks."),
  summary: z
    .object({
      totalBacklinks: z
        .number()
        .describe("The total number of backlinks found."),
      referringDomains: z
        .number()
        .describe("The number of unique referring domains."),
    })
    .describe("A summary of the backlink profile."),
});

export type LinkAnalysisInput = z.infer<typeof _LinkAnalysisInputSchema>;
export type LinkAnalysisOutput = z.infer<typeof _LinkAnalysisOutputSchema>;

// Mock implementation for build compatibility
export async function analyzeLinks(
  input: LinkAnalysisInput
): Promise<LinkAnalysisOutput> {
  try {
    // Generate mock backlinks based on the input URL
    const domain = new URL(input.url).hostname;
    const isHighAuthority = domain.includes('github') || domain.includes('google') || domain.includes('microsoft');

    const mockBacklinks = [
      {
        referringDomain: "techcrunch.com",
        backlinkUrl: "https://techcrunch.com/article-about-" + domain.replace('.', '-'),
        anchorText: "innovative platform",
        domainAuthority: 92
      },
      {
        referringDomain: "stackoverflow.com",
        backlinkUrl: "https://stackoverflow.com/questions/discussion-" + Date.now(),
        anchorText: domain,
        domainAuthority: 88
      },
      {
        referringDomain: "dev.to",
        backlinkUrl: "https://dev.to/user/post-about-tools",
        anchorText: "helpful tool",
        domainAuthority: 65
      },
      {
        referringDomain: "reddit.com",
        backlinkUrl: "https://reddit.com/r/programming/comments/discussion",
        anchorText: "check this out",
        domainAuthority: 91
      },
      {
        referringDomain: "medium.com",
        backlinkUrl: "https://medium.com/@author/article-title",
        anchorText: "programming assistant",
        domainAuthority: 78
      }
    ];

    // Add more backlinks if it's a high authority domain
    if (isHighAuthority) {
      mockBacklinks.push(
        {
          referringDomain: "hacker-news.ycombinator.com",
          backlinkUrl: "https://news.ycombinator.com/item?id=12345",
          anchorText: input.url,
          domainAuthority: 85
        },
        {
          referringDomain: "producthunt.com",
          backlinkUrl: "https://producthunt.com/posts/" + domain.split('.')[0],
          anchorText: "Product Hunt",
          domainAuthority: 82
        }
      );
    }

    const uniqueDomains = new Set(mockBacklinks.map(link => link.referringDomain));

    return {
      backlinks: mockBacklinks,
      summary: {
        totalBacklinks: mockBacklinks.length,
        referringDomains: uniqueDomains.size
      }
    };

  } catch (error) {
    console.error('Error in link analysis:', error);

    // Return minimal mock data on error
    return {
      backlinks: [
        {
          referringDomain: "example.com",
          backlinkUrl: "https://example.com/referencing-page",
          anchorText: "website link",
          domainAuthority: 45
        }
      ],
      summary: {
        totalBacklinks: 1,
        referringDomains: 1
      }
    };
  }
}
