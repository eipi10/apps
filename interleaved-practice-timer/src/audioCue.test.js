import { describe, expect, it, vi } from "vitest";
import { playPracticeBeep, preparePracticeBeep } from "./audioCue.js";

function makeWindowWithAudioContext() {
  const oscillator = {
    connect: vi.fn(),
    frequency: { setValueAtTime: vi.fn() },
    start: vi.fn(),
    stop: vi.fn()
  };
  const gain = {
    connect: vi.fn(),
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn()
    }
  };
  const context = {
    currentTime: 10,
    destination: {},
    state: "running",
    createOscillator: vi.fn(() => oscillator),
    createGain: vi.fn(() => gain),
    resume: vi.fn()
  };

  return {
    AudioContext: vi.fn(() => context),
    context,
    oscillator,
    gain
  };
}

describe("preparePracticeBeep", () => {
  it("returns false when Web Audio is unavailable", () => {
    expect(preparePracticeBeep({ current: null }, {})).toBe(false);
  });

  it("creates an audio context and schedules an inaudible unlock tone", () => {
    const windowLike = makeWindowWithAudioContext();
    const audioContextRef = { current: null };

    expect(preparePracticeBeep(audioContextRef, windowLike)).toBe(true);
    expect(windowLike.AudioContext).toHaveBeenCalledTimes(1);
    expect(windowLike.context.createOscillator).toHaveBeenCalledTimes(1);
    expect(windowLike.context.createGain).toHaveBeenCalledTimes(1);
    expect(windowLike.oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(
      440,
      10
    );
    expect(windowLike.gain.gain.setValueAtTime).toHaveBeenCalledWith(0.0001, 10);
    expect(windowLike.oscillator.start).toHaveBeenCalledWith(10);
    expect(windowLike.oscillator.stop).toHaveBeenCalledWith(10.04);
  });
});

describe("playPracticeBeep", () => {
  it("returns false when Web Audio is unavailable", () => {
    expect(playPracticeBeep({ current: null }, {})).toBe(false);
  });

  it("creates and schedules a short beep", () => {
    const windowLike = makeWindowWithAudioContext();
    const audioContextRef = { current: null };

    expect(playPracticeBeep(audioContextRef, windowLike)).toBe(true);
    expect(windowLike.AudioContext).toHaveBeenCalledTimes(1);
    expect(windowLike.context.createOscillator).toHaveBeenCalledTimes(2);
    expect(windowLike.context.createGain).toHaveBeenCalledTimes(2);
    expect(windowLike.oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(
      880,
      10
    );
    expect(windowLike.gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(
      0.22,
      10.02
    );
    expect(windowLike.oscillator.start).toHaveBeenCalledWith(10);
    expect(windowLike.oscillator.stop).toHaveBeenCalledWith(10.42);
  });

  it("reuses an existing audio context", () => {
    const windowLike = makeWindowWithAudioContext();
    const audioContextRef = { current: windowLike.context };

    expect(playPracticeBeep(audioContextRef, windowLike)).toBe(true);
    expect(windowLike.AudioContext).not.toHaveBeenCalled();
    expect(windowLike.context.createOscillator).toHaveBeenCalledTimes(2);
  });
});
