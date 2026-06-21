let beepWavDataUrl;

function getAudioState(audioRef) {
  if (!audioRef.current || !("audioContext" in audioRef.current)) {
    audioRef.current = { audioContext: null, audioElement: null };
  }
  return audioRef.current;
}

function makeBeepWavDataUrl() {
  if (beepWavDataUrl) return beepWavDataUrl;

  const sampleRate = 8000;
  const duration = 0.18;
  const samples = Math.floor(sampleRate * duration);
  const bytes = new Uint8Array(44 + samples * 2);
  const view = new DataView(bytes.buffer);

  function writeString(offset, value) {
    for (let index = 0; index < value.length; index += 1) {
      bytes[offset + index] = value.charCodeAt(index);
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, bytes.length - 8, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples * 2, true);

  for (let index = 0; index < samples; index += 1) {
    const envelope = Math.sin((Math.PI * index) / samples);
    const value =
      Math.sin((2 * Math.PI * 880 * index) / sampleRate) * envelope * 0.45;
    view.setInt16(44 + index * 2, Math.round(value * 32767), true);
  }

  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  beepWavDataUrl = `data:audio/wav;base64,${btoa(binary)}`;
  return beepWavDataUrl;
}

function ensureAudioContext(state, windowLike) {
  const AudioContextConstructor =
    windowLike.AudioContext || windowLike.webkitAudioContext;

  if (!AudioContextConstructor) return null;
  if (!state.audioContext) {
    state.audioContext = new AudioContextConstructor();
  }

  if (state.audioContext.state === "suspended" && state.audioContext.resume) {
    state.audioContext.resume();
  }

  return state.audioContext;
}

function playMediaElement(state, windowLike) {
  if (!windowLike.Audio) return false;
  if (!state.audioElement) {
    state.audioElement = new windowLike.Audio(makeBeepWavDataUrl());
    state.audioElement.preload = "auto";
  }

  try {
    state.audioElement.currentTime = 0;
    const playResult = state.audioElement.play();
    if (playResult?.catch) playResult.catch(() => {});
    return true;
  } catch {
    return false;
  }
}

function playWebAudioTone(state, windowLike, { frequency, volume, duration }) {
  try {
    const context = ensureAudioContext(state, windowLike);
    if (!context) return false;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + duration + 0.04);
    return true;
  } catch {
    return false;
  }
}

export function preparePracticeBeep(audioRef, windowLike = window) {
  const state = getAudioState(audioRef);
  const webAudioReady = playWebAudioTone(state, windowLike, {
    frequency: 440,
    volume: 0.04,
    duration: 0.08
  });
  const mediaReady = playMediaElement(state, windowLike);
  return webAudioReady || mediaReady;
}

export function playPracticeBeep(audioRef, windowLike = window) {
  const state = getAudioState(audioRef);
  const webAudioPlayed = playWebAudioTone(state, windowLike, {
    frequency: 880,
    volume: 0.22,
    duration: 0.38
  });
  const mediaPlayed = playMediaElement(state, windowLike);
  return webAudioPlayed || mediaPlayed;
}
