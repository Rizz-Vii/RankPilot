import { expect, test } from "@playwright/experimental-ct-react";

test("sanity: mount works", async ({ mount }) => {
  const cmp = await mount(<button type="button">Click me</button>);
  await expect(cmp).toContainText("Click me");
});
