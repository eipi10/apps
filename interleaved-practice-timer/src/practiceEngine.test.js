import { describe, expect, it } from "vitest";
import {
  formatDuration,
  getIntervalSeconds,
  getNextItemIndex,
  makeRandomItemOrder,
  parsePracticeItems,
  secondsFromMinutes
} from "./practiceEngine.js";

describe("practiceEngine", () => {
  it("parses newline and comma separated practice items", () => {
    expect(parsePracticeItems("A\nB, C\n\nD ")).toEqual(["A", "B", "C", "D"]);
  });

  it("converts decimal minutes to seconds", () => {
    expect(secondsFromMinutes(3)).toBe(180);
    expect(secondsFromMinutes(0.5)).toBe(30);
    expect(secondsFromMinutes("bad")).toBe(0);
  });

  it("returns fixed interval lengths", () => {
    expect(getIntervalSeconds({ timerMode: "fixed", fixedMinutes: 5 })).toBe(300);
  });

  it("returns a random interval within the configured range", () => {
    const settings = { timerMode: "range", minMinutes: 3, maxMinutes: 5 };
    expect(getIntervalSeconds(settings, () => 0)).toBe(180);
    expect(getIntervalSeconds(settings, () => 0.999)).toBe(300);
  });

  it("advances ordered items cyclically", () => {
    expect(
      getNextItemIndex({ currentIndex: 1, itemCount: 3, orderMode: "ordered" })
    ).toBe(2);
    expect(
      getNextItemIndex({ currentIndex: 2, itemCount: 3, orderMode: "ordered" })
    ).toBe(0);
  });

  it("never repeats the same item when randomizing with multiple choices", () => {
    const randomValues = [0.1, 0.1, 0.8];
    const next = getNextItemIndex({
      currentIndex: 0,
      itemCount: 3,
      orderMode: "random",
      random: () => randomValues.shift()
    });
    expect(next).toBe(2);
  });

  it("makes a random permutation of item indexes", () => {
    const randomValues = [0, 0];
    expect(
      makeRandomItemOrder(3, { random: () => randomValues.shift() ?? 0 })
    ).toEqual([1, 2, 0]);
  });

  it("does not put the previous cycle's last item first", () => {
    expect(makeRandomItemOrder(3, { previousLastIndex: 1, random: () => 0 })).toEqual([
      2,
      1,
      0
    ]);
  });

  it("formats durations for the timer face", () => {
    expect(formatDuration(180)).toBe("3:00");
    expect(formatDuration(7)).toBe("0:07");
  });
});
