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

function makeWindowWithAudioElement() {
  const play = vi.fn(() => Promise.resolve());
  const load = vi.fn();
  const audioInstances = [];
  class FakeAudio {
    constructor(src) {
      this.src = src;
      this.currentTime = 0;
      this.preload = "";
      this.play = play;
      this.load = load;
      audioInstances.push(this);
    }
  }

  return { Audio: FakeAudio, audioInstances, load, play };
}

function makeWindowWithAudioContextAndElement() {
  return {
    ...makeWindowWithAudioContext(),
    ...makeWindowWithAudioElement()
  };
}

describe("preparePracticeBeep", () => {
  it("returns false when Web Audio is unavailable", () => {
    expect(preparePracticeBeep({ current: null }, {})).toBe(false);
  });

  it("creates and resumes an audio context without starting a tone", () => {
    const windowLike = makeWindowWithAudioContext();
    const audioContextRef = { current: null };

    expect(preparePracticeBeep(audioContextRef, windowLike)).toBe(true);
    expect(windowLike.AudioContext).toHaveBeenCalledTimes(1);
    expect(windowLike.context.createOscillator).not.toHaveBeenCalled();
    expect(windowLike.context.createGain).not.toHaveBeenCalled();
    expect(windowLike.oscillator.start).not.toHaveBeenCalled();
  });

  it("preloads an audio element fallback without playing it", () => {
    const windowLike = makeWindowWithAudioElement();
    const audioContextRef = { current: null };

    expect(preparePracticeBeep(audioContextRef, windowLike)).toBe(true);
    expect(windowLike.audioInstances).toHaveLength(1);
    expect(windowLike.audioInstances[0].src).toContain("data:audio/wav;base64,");
    expect(windowLike.audioInstances[0].preload).toBe("auto");
    expect(windowLike.load).toHaveBeenCalledTimes(1);
    expect(windowLike.play).not.toHaveBeenCalled();
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
    expect(windowLike.context.createOscillator).toHaveBeenCalledTimes(1);
    expect(windowLike.context.createGain).toHaveBeenCalledTimes(1);
    expect(windowLike.oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(
      880,
      10
    );
    expect(windowLike.gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(
      0.75,
      10.02
    );
    expect(windowLike.oscillator.start).toHaveBeenCalledWith(10);
    expect(windowLike.oscillator.stop.mock.calls[0][0]).toBeCloseTo(10.49);
  });

  it("reuses an existing audio context", () => {
    const windowLike = makeWindowWithAudioContext();
    const audioContextRef = {
      current: { audioContext: windowLike.context, audioElement: null }
    };

    expect(playPracticeBeep(audioContextRef, windowLike)).toBe(true);
    expect(windowLike.AudioContext).not.toHaveBeenCalled();
    expect(windowLike.context.createOscillator).toHaveBeenCalledTimes(1);
  });

  it("reuses the audio element fallback", () => {
    const windowLike = makeWindowWithAudioElement();
    const audioContextRef = { current: null };

    expect(playPracticeBeep(audioContextRef, windowLike)).toBe(true);
    expect(playPracticeBeep(audioContextRef, windowLike)).toBe(true);
    expect(windowLike.audioInstances).toHaveLength(1);
    expect(windowLike.play).toHaveBeenCalledTimes(2);
  });

  it("uses a single playback path when both media and Web Audio are available", () => {
    const windowLike = makeWindowWithAudioContextAndElement();
    const audioContextRef = { current: null };

    expect(preparePracticeBeep(audioContextRef, windowLike)).toBe(true);
    expect(playPracticeBeep(audioContextRef, windowLike)).toBe(true);
    expect(windowLike.play).toHaveBeenCalledTimes(1);
    expect(windowLike.context.createOscillator).not.toHaveBeenCalled();
  });
});
