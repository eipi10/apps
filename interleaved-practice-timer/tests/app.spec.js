import { expect, test } from "@playwright/test";

test("configures a fixed ordered interleaved session", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /practice what comes next/i })).toBeVisible();

  await page.getByLabel("Practice items").fill("Etude bars 1-8\nShift drill\nCoda");
  await page.getByLabel("Minutes per item").fill("0.1");
  await page.getByRole("button", { name: "Start" }).click();

  await expect(page.getByTestId("current-item")).toHaveText("Etude bars 1-8");
  await expect(page.getByTestId("remaining-time")).toHaveText("0:06");

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByTestId("current-item")).toHaveText("Shift drill");
});

test("supports random ranges and random item selection without staying stuck", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Practice items").fill("A\nB\nC");
  await page.getByLabel("Random range").check();
  await page.getByLabel("Min minutes").fill("0.1");
  await page.getByLabel("Max minutes").fill("0.2");
  await page.getByLabel("Random", { exact: true }).check();

  const first = await page.getByTestId("current-item").textContent();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByTestId("session-summary")).toContainText("0.1-0.2 min");
  await expect(page.getByTestId("current-item")).not.toHaveText(first ?? "");
});
