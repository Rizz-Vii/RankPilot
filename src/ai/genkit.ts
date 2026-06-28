// import the Genkit and Google AI plugin libraries
import { googleAI } from "@genkit-ai/googleai";
import { genkit } from "genkit";

// configure a Genkit instance.
// NOTE: gemini-1.5-flash was retired by Google (404 from v1beta generateContent), which caused all
// AI flows to fail and silently fall back to simulated/demo data. Use the current GA fast model.
// Prefer the BILLED key (GOOGLE_AI_API_KEY) over GEMINI_API_KEY. The GEMINI_API_KEY project is
// free-tier-only (generate_content quota limit 0) and can never serve generateContent; the
// GOOGLE_AI_API_KEY project has billing enabled. Mirrors functions/src/ai/genkit.ts.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY,
    }),
  ],
  // gemini-1.5-flash retired (404); gemini-2.0-flash sunset on the billed project ("no longer
  // available") — gemini-2.5-flash is the current GA fast model. Use the string helper since there
  // is no `gemini25Flash` named export in @genkit-ai/googleai 1.17.x.
  model: googleAI.model("gemini-2.5-flash"),
});
