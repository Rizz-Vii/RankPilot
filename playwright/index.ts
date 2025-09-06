// Playwright CT runtime hooks for React
// You can initialize global providers, themes, or mocks here.
// For now, keep minimal to ensure mount works.
import { afterMount, beforeMount } from '@playwright/experimental-ct-react/hooks';
import React from 'react';

export type HooksConfig = {
    // Add flags for routing/theme if needed later
};

beforeMount<HooksConfig>(async ({ App }) => {
    // Return the App as-is; attach providers here if needed
    // Use createElement to avoid JSX in a .ts file
    return React.createElement(App as React.ComponentType, null);
});

afterMount<HooksConfig>(async () => {
    // Cleanup hooks if needed
});
