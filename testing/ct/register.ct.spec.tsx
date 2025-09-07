import RegisterPage from "@/app/(auth)/register/page";
import { expect, test } from "@playwright/experimental-ct-react";

// Basic component-level checks for minimum validation

test("register: requires email and minimum password", async ({ mount }) => {
  const cmp = await mount(<RegisterPage />);
  await cmp.getByRole("button", { name: "Register" }).click();
  await expect(cmp.getByRole("alert")).toContainText("Email is required");
});

test("register: password length validation", async ({ mount }) => {
  const cmp = await mount(<RegisterPage />);
  await cmp.getByLabel("Work Email").fill("test@example.com");
  await cmp.getByLabel("Password").fill("123");
  await cmp.getByLabel("Confirm Password").fill("123");
  await cmp.getByRole("button", { name: "Register" }).click();
  await expect(cmp.getByRole("alert")).toContainText("at least 6 characters");
});
