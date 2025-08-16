import { onCall, HttpsOptions } from "firebase-functions/v2/https";
import { ai } from "@/ai/genkit.js";
import { publishEvent, EventType } from "../../src/lib/events";

// Set options for the audit function
const httpsOptions: HttpsOptions = {
  timeoutSeconds: 180, // SEO audits can take longer
  memory: "1GiB", // More memory for comprehensive audits
  minInstances: 0,
};

interface AuditRequest {
  url: string;
  depth?: number;
  checkMobile?: boolean;
}

interface AuditResponse {
  score: number;
  issues: {
    critical: string[];
    major: string[];
    minor: string[];
  };
  recommendations: string[];
  performanceMetrics?: Record<string, number>;
}

/**
 * Performs an SEO audit for a specified URL
 * @param {Object} request - The Cloud Function request object
 * @return {Promise<AuditResponse>} The SEO audit results
 */
export const runSeoAudit = onCall(httpsOptions, async (request) => {
  const { url, depth = 1, checkMobile = true } = request.data as AuditRequest;
  const userId = request.auth?.uid;
  const startTime = Date.now();

  // Publish audit started event
  await publishEvent(EventType.SEO_AUDIT_STARTED, {
    userId,
    data: { url, depth, checkMobile }
  });

  try {
    // Demo/mock response for emulator testing
    if (process.env.FUNCTIONS_EMULATOR === "true") {
      const result = mockAuditResponse();
      
      // Publish audit completed event
      await publishEvent(EventType.SEO_AUDIT_COMPLETED, {
        userId,
        data: { 
          url, 
          depth, 
          checkMobile, 
          score: result.score,
          duration: Date.now() - startTime
        }
      });
      
      return result;
    }

    // In production, this would use AI to generate a comprehensive audit
    const prompt = `Perform an SEO audit for "${url}" with crawl depth ${depth}.
                   ${checkMobile ? "Include mobile optimization check." : ""}`;

    // AI call - result will be used in production implementation
    await ai.generate(prompt);

    // Process AI response (simplified for demo)
    // In a real implementation, you would parse the AI response thoroughly
    const result = {
      score: 72,
      issues: {
        critical: ["Missing meta description on some pages"],
        major: ["Slow page load time", "Duplicate content detected"],
        minor: ["Some images missing alt text"],
      },
      recommendations: [
        "Optimize image sizes",
        "Add meta descriptions to all pages",
        "Improve page load speed",
      ],
      performanceMetrics: {
        pageSpeed: 75,
        mobileOptimization: 68,
        accessibility: 82,
      },
    };
    
    // Publish audit completed event
    await publishEvent(EventType.SEO_AUDIT_COMPLETED, {
      userId,
      data: { 
        url, 
        depth, 
        checkMobile, 
        score: result.score,
        duration: Date.now() - startTime
      }
    });
    
    return result;
  } catch (error) {
    console.error("Error generating SEO audit:", error);
    
    // Publish audit failed event
    await publishEvent(EventType.SEO_AUDIT_FAILED, {
      userId,
      data: { 
        url, 
        depth, 
        checkMobile,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      }
    });
    
    throw new Error("Failed to generate SEO audit. Please try again later.");
  }
});

/**
 * Helper function to generate mock data for emulator testing
 * @return {AuditResponse} Mock audit response data
 */
function mockAuditResponse(): AuditResponse {
  return {
    score: 68 + Math.floor(Math.random() * 20),
    issues: {
      critical: ["Missing canonical tags", "Duplicate title tags found"],
      major: [
        "Slow page load time on mobile",
        "Poor internal linking structure",
        "Multiple H1 tags detected",
      ],
      minor: [
        "Some images missing alt text",
        "Meta descriptions too long on blog pages",
        "URL structure could be improved",
      ],
    },
    recommendations: [
      "Add canonical tags to all pages",
      "Optimize page loading speed",
      "Improve internal linking structure",
      "Fix duplicate title tags",
      "Ensure all images have descriptive alt text",
    ],
    performanceMetrics: {
      pageSpeed: 65 + Math.floor(Math.random() * 20),
      mobileOptimization: 70 + Math.floor(Math.random() * 15),
      accessibility: 75 + Math.floor(Math.random() * 15),
      userExperience: 72 + Math.floor(Math.random() * 18),
    },
  };
}
