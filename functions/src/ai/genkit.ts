import { gemini15Flash, googleAI } from "@genkit-ai/googleai";
import { genkit } from "genkit";

// Lazy initialization to avoid timeout during cold starts
let _ai: any = null;

export function getAI() {
  if (!_ai) {
    // Lightweight test stub path (avoids heavy Genkit init in unit tests)
    if (process.env.GENKIT_TEST_STUB === '1') {
      _ai = { generate: async () => ({ text: () => null }) };
      return _ai;
    }
    // Initialize Google AI with API key from environment
    _ai = genkit({
      plugins: [
        googleAI({
          apiKey: process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY,
        }),
      ],
      model: gemini15Flash,
    });
  }
  return _ai;
}

// Backward compatibility export
export const ai = {
  generate: (prompt: string) => getAI().generate(prompt),
};

// Default export for module compatibility
export default { getAI, ai };
