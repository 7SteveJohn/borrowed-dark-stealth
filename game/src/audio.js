// All sound is synthesised with WebAudio: no audio files, no network.
// The context is created on the first user gesture (browsers require one);
// until then every call is a silent no-op. Mute persists in localStorage.

import { MUTE_KEY } from './config.js';

export function createAudio() {
  let context = null;
  let muted = false;
  try {
    muted = window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    muted = false;
  }

  function ensure() {
    if (!context) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return null;
        context = new AudioContext();
      } catch {
        return null;
      }
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
    return context;
  }

  /** A short oscillator tone with a quick fade, the building block of every sound. */
  function tone(freq, dur, type, gain, when, slideTo) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + (when || 0);
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /** Filtered noise burst: the rustle of a shadow being pulled loose. */
  function rustle(dur) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const length = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    filter.Q.value = 0.8;
    const amp = ctx.createGain();
    amp.gain.value = 0.25;
    source.connect(filter).connect(amp).connect(ctx.destination);
    source.start(t0);
  }

  return {
    /** Call from any user gesture so later sounds are allowed to play. */
    unlock() {
      ensure();
    },
    isMuted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      try {
        window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
      } catch {
        // Storage can be off: the mute then lasts this visit only.
      }
      return muted;
    },
    step() {
      tone(140 + Math.random() * 40, 0.05, 'sine', 0.05);
    },
    steal() {
      rustle(0.35);
      tone(520, 0.3, 'sine', 0.12, 0, 180);
    },
    place() {
      tone(300, 0.16, 'triangle', 0.1, 0, 150);
    },
    pickup() {
      tone(220, 0.12, 'triangle', 0.1, 0, 420);
    },
    fade() {
      tone(400, 0.5, 'sine', 0.08, 0, 90);
    },
    spotted() {
      tone(880, 0.12, 'square', 0.06);
      tone(880, 0.12, 'square', 0.06, 0.14);
    },
    alert() {
      tone(660, 0.18, 'sawtooth', 0.09);
      tone(440, 0.28, 'sawtooth', 0.09, 0.18);
    },
    win() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => tone(freq, 0.35, 'triangle', 0.12, i * 0.13));
    },
    lose() {
      tone(220, 0.5, 'sawtooth', 0.1, 0, 110);
      tone(165, 0.7, 'sawtooth', 0.08, 0.15, 82);
    },
  };
}
