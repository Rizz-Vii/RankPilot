// Playwright CT runtime hooks for React
// Initialize global providers or themes here if needed.
import {
  afterMount,
  beforeMount,
} from "@playwright/experimental-ct-react/hooks";

export type HooksConfig = {
  // Example: enableRouting?: boolean;
};

beforeMount<HooksConfig>(async ({ App }) => {
  // Wrap with providers if needed
  return <App />;
});

afterMount<HooksConfig>(async () => {
  // Cleanup if needed after each mount
});
