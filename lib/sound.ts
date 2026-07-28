import type { Profile } from "@/lib/types";
import { STREAK_SNUFF_MIN } from "@/lib/streak-tier";

/**
 * Tiny Web Audio synth for game feedback — no audio files needed. All sounds
 * are short envelope-shaped tones so they feel game-like without being loud.
 *
 * AudioContext starts suspended under browser autoplay rules and can re-suspend
 * after backgrounding. Lifecycle (gesture prime, shared resume, keep-alive) is
 * owned here so cues stay audible without relying on React timing.
 */
export type SoundKind = "tap" | "play" | "correct" | "incorrect" | "streak" | "complete";

export type PlaySoundOptions = {
  /** Live answer streak after a correct response (1 = first correct in a row). */
  streak?: number;
  /** Prior streak length when a miss ends a run — adds a soft extinguish tail. */
  lostStreak?: number;
};

let audioContext: AudioContext | null = null;
let resumePromise: Promise<boolean> | null = null;
let gesturesInstalled = false;
let keepAliveInstalled = false;
/** Set when the tab backgrounds or the context suspends — iOS can report "running" but stay silent until re-primed on a gesture. */
let needsGestureUnlock = false;
let sessionKeepAlive: OscillatorNode | null = null;

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

  if (audioContext?.state === "closed") {
    resetAudioContext();
  }

  try {
    if (!audioContext) {
      audioContext = new AudioContextClass();
      installKeepAlive();
      audioContext.addEventListener("statechange", () => {
        if (!audioContext || audioContext.state === "closed") return;

        if (audioContext.state === "suspended" || audioContext.state === "interrupted") {
          markNeedsGestureUnlock();
        }

        if (
          audioContext.state !== "running" &&
          document.visibilityState === "visible"
        ) {
          primeAudioGraph(audioContext);
          void resumeContext(audioContext);
        }
      });
    }
    return audioContext;
  } catch {
    return null;
  }
}

function markNeedsGestureUnlock(): void {
  needsGestureUnlock = true;
  stopSessionKeepAlive();
}

function resetAudioContext(): void {
  stopSessionKeepAlive();
  audioContext = null;
  resumePromise = null;
}

function needsAudioRecovery(ctx: AudioContext): boolean {
  return needsGestureUnlock || ctx.state !== "running";
}

/** Near-silent oscillator keeps the media session warm so mobile OSes suspend less often. */
function startSessionKeepAlive(ctx: AudioContext): void {
  if (sessionKeepAlive) return;

  try {
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    const osc = ctx.createOscillator();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    sessionKeepAlive = osc;
  } catch {
    // Best-effort; foreground unlock still recovers playback.
  }
}

function stopSessionKeepAlive(): void {
  if (!sessionKeepAlive) return;

  try {
    sessionKeepAlive.stop();
    sessionKeepAlive.disconnect();
  } catch {
    // Ignore teardown errors on suspended/closed contexts.
  }
  sessionKeepAlive = null;
}

/** Re-resume after tab focus; browsers often suspend the context while hidden. */
function installKeepAlive() {
  if (keepAliveInstalled || typeof document === "undefined") return;
  keepAliveInstalled = true;

  const tryResumeOnForeground = () => {
    const ctx = audioContext;
    if (!ctx || ctx.state === "closed") return;

    if (needsGestureUnlock || ctx.state !== "running") {
      primeAudioGraph(ctx);
    }
    if (ctx.state !== "running") {
      void resumeContext(ctx);
    }
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      markNeedsGestureUnlock();
      return;
    }
    tryResumeOnForeground();
  });
  window.addEventListener("pageshow", tryResumeOnForeground);
  window.addEventListener("focus", tryResumeOnForeground);
}

/**
 * Install document-level gesture listeners so the AudioContext is primed on
 * the first real user interaction — not deferred until a React effect or the
 * first playSound call races the gesture window.
 */
export function installAudioGestures(): void {
  if (gesturesInstalled || typeof document === "undefined") return;
  gesturesInstalled = true;

  const onGesture = () => {
    unlockAudio();
  };

  // Capture phase so unlock runs before any target handler that plays a cue.
  // Prefer Pointer Events (covers mouse + touch). Fall back for older WebKit.
  if (typeof window.PointerEvent === "function") {
    document.addEventListener("pointerdown", onGesture, { capture: true });
  } else {
    document.addEventListener("touchstart", onGesture, { capture: true });
    document.addEventListener("mousedown", onGesture, { capture: true });
  }
  document.addEventListener("keydown", onGesture, { capture: true });
}

function resumeContext(ctx: AudioContext): Promise<boolean> {
  if (ctx.state === "running") return Promise.resolve(true);
  if (ctx.state === "closed") return Promise.resolve(false);

  resumePromise ??= ctx
    .resume()
    .then(() => ctx.state === "running")
    .catch(() => false)
    .finally(() => {
      resumePromise = null;
    });

  return resumePromise;
}

/** Prime, resume, and recreate the context if the browser left it in a bad state. */
async function ensureAudioReady(ctx: AudioContext): Promise<AudioContext | null> {
  if (!needsAudioRecovery(ctx)) {
    startSessionKeepAlive(ctx);
    return ctx;
  }

  primeAudioGraph(ctx);
  let running = await resumeContext(ctx);

  if (running) {
    needsGestureUnlock = false;
    startSessionKeepAlive(ctx);
    return ctx;
  }

  // Resume failed — recreate (common after long background on mobile Safari).
  try {
    if (ctx.state !== "closed") {
      await ctx.close();
    }
  } catch {
    // Ignore close errors on already-dead contexts.
  }
  resetAudioContext();

  const fresh = getAudioContext();
  if (!fresh) return null;

  primeAudioGraph(fresh);
  running = await resumeContext(fresh);
  if (running) {
    needsGestureUnlock = false;
    startSessionKeepAlive(fresh);
    return fresh;
  }

  return null;
}

/**
 * Prime the audio graph during a user gesture. Safari/iOS often stay silent
 * after resume() alone; starting a near-silent buffer is what actually unlocks
 * the destination.
 */
function primeAudioGraph(ctx: AudioContext): void {
  try {
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
  } catch {
    // Priming is best-effort; resume() below still helps on Chromium.
  }
}

export function isSoundEnabled(profile: Profile | null | undefined): boolean {
  return profile?.settings?.soundEnabled !== false;
}

/** Unlock / re-unlock Web Audio during a user gesture (pointer/keyboard/touch). */
export function unlockAudio(): void {
  installAudioGestures();
  const ctx = getAudioContext();
  if (!ctx || ctx.state === "closed" || !needsAudioRecovery(ctx)) return;

  void ensureAudioReady(ctx);
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
    { at: 0, frequency: 311, duration: 0.09, type: "square", gain: 0.08 },
    { at: 0.1, frequency: 233, duration: 0.16, type: "square", gain: 0.09 },
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

/** Incorrect cue plus a low “snuff” when a meaningful streak ends. */
export function getIncorrectLostStreakNotes(): Note[] {
  return [
    ...SOUNDS.incorrect,
    { at: 0.28, frequency: 185, duration: 0.2, type: "sine", gain: 0.06 },
    { at: 0.34, frequency: 120, duration: 0.32, type: "triangle", gain: 0.05 },
  ];
}

/** Pitch rises with streak; timbre and length improve as the run builds. */
export function getCorrectSoundNotes(streak: number): Note[] {
  const level = Math.max(1, Math.min(streak, 50));
  const pitch = Math.pow(2, (level - 1) / 22);
  const gain = Math.min(0.15 + (level - 1) * 0.0012, 0.21);
  const secondDuration = Math.min(0.16 + (level - 1) * 0.002, 0.24);
  const wave: OscillatorType = level >= 15 ? "sine" : "triangle";

  const root = 659 * pitch;
  const third = 880 * pitch;

  const notes: Note[] = [
    { at: 0, frequency: root, duration: 0.08, type: wave, gain },
    {
      at: 0.08,
      frequency: third,
      duration: secondDuration,
      type: wave,
      gain,
      ...(level >= 10 ? { frequencyEnd: third * 1.06 } : {}),
    },
  ];

  if (level >= 5) {
    notes.push({
      at: 0.08 + secondDuration * 0.55,
      frequency: third * 1.25,
      duration: 0.1,
      type: level >= 20 ? "sine" : "triangle",
      gain: gain * 0.72,
    });
  }

  if (level >= 15) {
    notes.push({
      at: 0.08 + secondDuration,
      frequency: third * 2,
      duration: 0.14,
      type: "sine",
      gain: gain * 0.55,
    });
  }

  if (level >= 30) {
    notes.push({
      at: 0.08 + secondDuration + 0.1,
      frequency: third * 2.5,
      frequencyEnd: third * 2.8,
      duration: 0.18,
      type: "sine",
      gain: gain * 0.45,
    });
  }

  return notes;
}

/**
 * Plays a synthesized sound effect. Pass the profile so the player's sound
 * setting is respected; a null/undefined profile plays (guest actions).
 */
export function playSound(
  kind: SoundKind,
  profile?: Profile | null,
  options?: PlaySoundOptions,
) {
  if (profile !== undefined && !isSoundEnabled(profile)) return;

  installAudioGestures();
  const ctx = getAudioContext();
  if (!ctx) return;

  if (!needsAudioRecovery(ctx)) {
    try {
      scheduleNotes(ctx, kind, options);
    } catch {
      // Ignore scheduling errors so one bad note doesn't break future sounds.
    }
    return;
  }

  // Still inside a user-gesture call stack in normal game flows: prime + resume
  // so Safari unlocks, then schedule only once the clock is running.
  void ensureAudioReady(ctx).then((ready) => {
    if (!ready) return;
    try {
      scheduleNotes(ready, kind, options);
    } catch {
      // Ignore scheduling errors so one bad note doesn't break future sounds.
    }
  });
}

function scheduleNotes(ctx: AudioContext, kind: SoundKind, options?: PlaySoundOptions) {
  const notes =
    kind === "correct" && options?.streak !== undefined
      ? getCorrectSoundNotes(options.streak)
      : kind === "incorrect" && options?.lostStreak !== undefined && options.lostStreak >= STREAK_SNUFF_MIN
        ? getIncorrectLostStreakNotes()
        : SOUNDS[kind];

  // Tiny lead-in so the first envelope event is never scheduled in the past.
  const start = ctx.currentTime + 0.01;
  for (const note of notes) {
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
