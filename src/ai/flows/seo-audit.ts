"use server";
/**
 * @fileOverview SEO Audit flow that analyzes a URL for technical and content SEO factors.
 *
 * - auditUrl - A function that handles the SEO audit process.
 * - AuditUrlInput - The input type for the auditUrl function.
 * - AuditUrlOutput - The return type for the auditUrl function.
 */

import { ai } from "@/ai/genkit";
import { z } from "zod";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const geminiApiKey = process.env.GEMINI_API_KEY;
const googleApiKey = process.env.GOOGLE_API_KEY;

// Define the input schema for the SEO audit flow
const AuditUrlInputSchema = z.object({
  url: z.string().describe("The URL to audit."),
});
export type AuditUrlInput = z.infer<typeof AuditUrlInputSchema>;

// Define the output schema for the SEO audit flow
const AuditUrlOutputSchema = z.object({
  overallScore: z
    .number()
    .describe("The overall SEO score for the URL (0-100)."),
  items: z
    .array(
      z.object({
        id: z.string().describe("A unique identifier for the audit item."),
        name: z
          .string()
          .describe(
            'The name of the audit item (e.g., "Title Tags", "Mobile-Friendliness").'
          ),
        score: z
          .number()
          .describe("The score for this specific audit item (0-100)."),
        details: z
          .string()
          .describe("Detailed findings or suggestions for this item."),
        status: z
          .enum(["good", "warning", "error"])
          .describe("The status of the audit item."),
      })
    )
    .describe("A list of detailed audit items."),
  summary: z
    .string()
    .describe("A brief overall summary of the audit findings."),
});
export type AuditUrlOutput = z.infer<typeof AuditUrlOutputSchema>;

// Define the prompt to the AI model
const auditUrlPrompt = ai.definePrompt({
  name: "seoAuditPrompt",
  input: {
    schema: AuditUrlInputSchema.extend({ content: z.string().optional() }),
  },
  output: { schema: AuditUrlOutputSchema },
  prompt: `You are a world-class SEO expert, providing a detailed technical and content audit for a given URL. Your analysis must be thorough, actionable, and formatted as a JSON object adhering to the provided schema.
Use the following API keys for enhanced analysis:
  - GEMINI_API_KEY: ${geminiApiKey}
  - GOOGLE_API_KEY: ${googleApiKey}
  **Analysis Instructions:**

  For the given URL and its content, perform the following checks. For each check, provide a score (0-100), a status ('good', 'warning', 'error'), and a 'details' string with clear, actionable advice.

  1.  **Title Tag (`title-tags`)**:
      *   **Score:** Based on length (ideal: 50-60 chars), keyword presence, and uniqueness.
      *   **Details:** Comment on length, if the primary keyword is present, and if it's compelling. Suggest a better title if needed.
  2.  **Meta Description (`meta-descriptions`)**:
      *   **Score:** Based on length (ideal: 120-158 chars), clarity, and inclusion of a call-to-action.
      *   **Details:** Note the length and provide specific suggestions for improvement.
  3.  **H1 Tag (`h1-tags`)**:
      *   **Score:** Based on presence (exactly one H1 tag) and relevance to the title and content.
      *   **Details:** State if one and only one H1 is present. Comment on its relevance.
  4.  **Content Readability (`content-readability`)**:
      *   **Score:** Assess the complexity of the text (e.g., Flesch-Kincaid score). Aim for a score that matches the target audience (e.g., grade 8-10 for general public).
      *   **Details:** Provide a brief assessment of readability and suggest simplifying complex sentences or jargon.
  5.  **Image Alt Text (`image-alts`)**:
      *   **Score:** Based on the percentage of images with non-empty alt text.
      *   **Details:** Note the number of images found and how many are missing alt text. For example: "Found 10 images, 3 are missing alt text."
  6.  **Site Speed (Simulated) (`site-speed`)**:
      *   **Score:** Based on content structure (e.g., number of images, scripts). A high number of render-blocking resources should lower the score.
      *   **Details:** Provide a qualitative assessment (e.g., "Appears fast," "May be slow due to numerous large images"). Suggest general performance improvements like image compression.
  7.  **Mobile-Friendliness (Simulated) (`mobile-friendliness`)**:
      *   **Score:** Assess based on the presence of a viewport meta tag and the absence of deprecated HTML tags like `<font>`.
      *   **Details:** Confirm if a viewport tag is present. Mention any structural elements that could negatively impact mobile usability.

  **Overall Score and Summary:**
  *   Calculate an `overallScore` by averaging the individual item scores.
  *   Write a concise `summary` of the most critical findings.

  **URL to audit:** {{{url}}}
  {{#if content}}
  **Page content:**
  <PAGE_CONTENT>
  {{{content}}}
  </PAGE_CONTENT>
  {{else}}
  **Page content:**
  <PAGE_CONTENT>
  Content not available. Please perform the audit based on the URL and general SEO best practices. For content-specific checks like H1 and Readability, state that the content could not be retrieved.
  </PAGE_CONTENT>
  {{/if}}

  **Your JSON Output:**
  `,
  config: {
    temperature: 0.2,
  },
});

// Define the Genkit flow
const auditUrlFlow = ai.defineFlow(
  {
    name: "seoAuditFlow",
    inputSchema: AuditUrlInputSchema,
    outputSchema: AuditUrlOutputSchema,
  },
  async (input: AuditUrlInput): Promise<AuditUrlOutput> => {
    const { url } = input;
    let pageContent: string | undefined;

    try {
      console.log(`Attempting to fetch content for: ${url}`);
      const _response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
        // @ts-ignore: node-fetch v2 does not support timeout, v3+ does
        timeout: 15000,
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const html = await response.text();
      const $ = cheerio.load(html);
      pageContent = $("body").text();

      if (pageContent) {
        console.log(`Successfully fetched ${pageContent.length} characters.`);
        // Truncate content to avoid overwhelming the model and hitting token limits.
        if (pageContent.length > 100000) {
          console.log(
            "Content is very long, truncating to 100,000 characters."
          );
          pageContent = pageContent.substring(0, 100000);
        }
      } else {
        console.log("No content fetched.");
      }
    } catch (e) {
      console.error(`Could not fetch content for ${url}:`, e);
      pageContent = undefined;
    }

    const promptInput = {
      url,
      content: pageContent,
    };

    const { output } = await auditUrlPrompt(promptInput);

    if (!output) {
      throw new Error("AI did not return a valid audit result.");
    }
    return output;
  }
);

export async function auditUrl(input: AuditUrlInput): Promise<AuditUrlOutput> {
  return auditUrlFlow(input);
}
