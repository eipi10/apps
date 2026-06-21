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

test("updates the displayed countdown when timer length changes before starting", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("remaining-time")).toHaveText("3:00");

  await page.getByLabel("Minutes per item").fill("5");
  await expect(page.getByTestId("remaining-time")).toHaveText("5:00");

  await page.getByLabel("Random range").check();
  await page.getByLabel("Min minutes").fill("1");
  await page.getByLabel("Max minutes").fill("1");
  await expect(page.getByTestId("remaining-time")).toHaveText("1:00");
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

test("plays an audio cue when a timed block ends", async ({ page }) => {
  await page.addInitScript(() => {
    window.__audioCueEvents = [];
    class FakeAudioContext {
      constructor() {
        this.currentTime = 0;
        this.destination = {};
        this.state = "running";
        window.__audioCueEvents.push("context");
      }

      createOscillator() {
        window.__audioCueEvents.push("oscillator");
        return {
          connect: () => {},
          frequency: { setValueAtTime: () => {} },
          start: () => window.__audioCueEvents.push("start"),
          stop: () => window.__audioCueEvents.push("stop")
        };
      }

      createGain() {
        return {
          connect: () => {},
          gain: {
            setValueAtTime: () => {},
            exponentialRampToValueAtTime: () => {}
          }
        };
      }
    }
    window.AudioContext = FakeAudioContext;
  });

  await page.goto("/");
  await page.getByLabel("Practice items").fill("A\nB");
  await page.getByLabel("Minutes per item").fill("0.02");
  await page.getByRole("button", { name: "Start" }).click();
  expect(await page.evaluate(() => window.__audioCueEvents.includes("start"))).toBe(
    false
  );

  await expect(page.getByTestId("current-item")).toHaveText("B");
  await expect
    .poll(async () =>
      page.evaluate(() => window.__audioCueEvents.filter((event) => event === "start").length)
    )
    .toBeGreaterThanOrEqual(1);
  await expect(page.getByTestId("remaining-time")).toHaveText("0:01");
});
