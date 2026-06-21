export function preparePracticeBeep(audioContextRef, windowLike = window) {
  const AudioContextConstructor =
    windowLike.AudioContext || windowLike.webkitAudioContext;

  if (!AudioContextConstructor) return false;

  try {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextConstructor();
    }

    const context = audioContextRef.current;
    if (context.state === "suspended" && context.resume) {
      context.resume();
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(440, context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.03);
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.04);
    return true;
  } catch {
    return false;
  }
}

export function playPracticeBeep(audioContextRef, windowLike = window) {
  if (!preparePracticeBeep(audioContextRef, windowLike)) return false;

  try {
    const context = audioContextRef.current;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.22, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.38);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.42);
    return true;
  } catch {
    return false;
  }
}
