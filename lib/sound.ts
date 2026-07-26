import type { Profile } from "@/lib/types";

/**
 * Tiny Web Audio synth for game feedback — no audio files needed. All sounds
 * are short envelope-shaped tones so they feel game-like without being loud.
 */
export type SoundKind = "tap" | "play" | "correct" | "incorrect" | "streak" | "complete";

let audioContext: AudioContext | null = null;

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
    null
  );
}

function getAudioContext(): AudioContext | null {
  const AudioContextClass = getAudioContextConstructor();
  if (!AudioContextClass) return null;
  try {
    audioContext ??= new AudioContextClass();
    return audioContext;
  } catch {
    return null;
  }
}

export function isSoundEnabled(profile: Profile | null | undefined): boolean {
  return profile?.settings.soundEnabled !== false;
}

/** Resume a suspended context during a user gesture (pointer/keyboard). */
export function unlockAudio(): void {
  const ctx = getAudioContext();
  if (!ctx || ctx.state === "running") return;
  void ctx.resume().catch(() => {});
}

type Note = {
  /** Seconds after the sound starts. */
  at: number;
  frequency: number;
  /** Optional pitch slide target. */
  frequencyEnd?: number;
  duration: number;
  type: OscillatorType;
  gain: number;
};

const SOUNDS: Record<SoundKind, Note[]> = {
  tap: [{ at: 0, frequency: 520, frequencyEnd: 640, duration: 0.06, type: "sine", gain: 0.12 }],
  play: [
    { at: 0, frequency: 392, duration: 0.09, type: "triangle", gain: 0.16 },
    { at: 0.09, frequency: 587, duration: 0.14, type: "triangle", gain: 0.16 },
  ],
  correct: [
    { at: 0, frequency: 659, duration: 0.08, type: "triangle", gain: 0.15 },
    { at: 0.08, frequency: 880, duration: 0.16, type: "triangle", gain: 0.15 },
  ],
  incorrect: [
    { at: 0, frequency: 196, frequencyEnd: 147, duration: 0.2, type: "triangle", gain: 0.14 },
  ],
  streak: [
    { at: 0, frequency: 523, duration: 0.07, type: "triangle", gain: 0.14 },
    { at: 0.07, frequency: 659, duration: 0.07, type: "triangle", gain: 0.14 },
    { at: 0.14, frequency: 784, duration: 0.07, type: "triangle", gain: 0.14 },
    { at: 0.21, frequency: 1047, duration: 0.18, type: "triangle", gain: 0.15 },
  ],
  complete: [
    { at: 0, frequency: 523, duration: 0.08, type: "triangle", gain: 0.14 },
    { at: 0.08, frequency: 659, duration: 0.08, type: "triangle", gain: 0.14 },
    { at: 0.16, frequency: 784, duration: 0.08, type: "triangle", gain: 0.14 },
    { at: 0.24, frequency: 1047, duration: 0.12, type: "triangle", gain: 0.15 },
    { at: 0.38, frequency: 1319, duration: 0.28, type: "triangle", gain: 0.16 },
  ],
};

/**
 * Plays a synthesized sound effect. Pass the profile so the player's sound
 * setting is respected; a null/undefined profile plays (guest actions).
 */
export function playSound(kind: SoundKind, profile?: Profile | null) {
  if (profile !== undefined && !isSoundEnabled(profile)) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const play = () => {
    try {
      scheduleNotes(ctx, kind);
    } catch {
      // Ignore scheduling errors so one bad note doesn't break future sounds.
    }
  };

  if (ctx.state === "running") {
    play();
    return;
  }

  // Browsers keep the context suspended until a user gesture. Scheduling
  // against a suspended (frozen) clock makes queued notes fire late and
  // bunched together, so resume first and only then schedule.
  void ctx
    .resume()
    .then(() => {
      if (ctx.state === "running") play();
    })
    .catch(() => {});
}

function scheduleNotes(ctx: AudioContext, kind: SoundKind) {
  // Tiny lead-in so the first envelope event is never scheduled in the past.
  const start = ctx.currentTime + 0.01;
  for (const note of SOUNDS[kind]) {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const noteStart = start + note.at;
    const noteEnd = noteStart + note.duration;
    const attackEnd = noteStart + Math.min(0.008, note.duration * 0.5);

    oscillator.type = note.type;
    oscillator.frequency.setValueAtTime(note.frequency, noteStart);
    if (note.frequencyEnd) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(note.frequencyEnd, 1),
        noteEnd,
      );
    }

    gainNode.gain.setValueAtTime(0, noteStart);
    gainNode.gain.linearRampToValueAtTime(note.gain, attackEnd);
    gainNode.gain.exponentialRampToValueAtTime(0.001, noteEnd);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteEnd + 0.02);
  }
}
