// import the Genkit and Google AI plugin libraries
import { gemini20Flash, googleAI } from "@genkit-ai/googleai";
import { genkit } from "genkit";

// configure a Genkit instance.
// NOTE: gemini-1.5-flash was retired by Google (404 from v1beta generateContent), which caused all
// AI flows to fail and silently fall back to simulated/demo data. Use the current GA fast model.
export const ai = genkit({
  plugins: [googleAI()],
  model: gemini20Flash, // set default model
});
