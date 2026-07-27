import type { Profile } from "@/lib/types";

/**
 * Tiny Web Audio synth for game feedback — no audio files needed. All sounds
 * are short envelope-shaped tones so they feel game-like without being loud.
 *
 * AudioContext starts suspended under browser autoplay rules and can re-suspend
 * after backgrounding. Lifecycle (gesture prime, shared resume, keep-alive) is
 * owned here so cues stay audible without relying on React timing.
 */
export type SoundKind = "tap" | "play" | "correct" | "incorrect" | "streak" | "complete";

let audioContext: AudioContext | null = null;
let resumePromise: Promise<boolean> | null = null;
let gesturesInstalled = false;
let keepAliveInstalled = false;

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
    audioContext = null;
    resumePromise = null;
  }

  try {
    if (!audioContext) {
      audioContext = new AudioContextClass();
      installKeepAlive();
      audioContext.addEventListener("statechange", () => {
        if (
          audioContext &&
          audioContext.state !== "running" &&
          audioContext.state !== "closed" &&
          document.visibilityState === "visible"
        ) {
          void resumeContext(audioContext);
        }
      });
    }
    return audioContext;
  } catch {
    return null;
  }
}

/** Re-resume after tab focus; browsers often suspend the context while hidden. */
function installKeepAlive() {
  if (keepAliveInstalled || typeof document === "undefined") return;
  keepAliveInstalled = true;

  const tryResume = () => {
    const ctx = audioContext;
    if (!ctx || ctx.state === "closed" || ctx.state === "running") return;
    void resumeContext(ctx);
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") tryResume();
  });
  window.addEventListener("pageshow", tryResume);
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
  if (!ctx || ctx.state === "closed" || ctx.state === "running") return;

  primeAudioGraph(ctx);
  void resumeContext(ctx);
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

/**
 * Plays a synthesized sound effect. Pass the profile so the player's sound
 * setting is respected; a null/undefined profile plays (guest actions).
 */
export function playSound(kind: SoundKind, profile?: Profile | null) {
  if (profile !== undefined && !isSoundEnabled(profile)) return;

  installAudioGestures();
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

  // Still inside a user-gesture call stack in normal game flows: prime + resume
  // so Safari unlocks, then schedule only once the clock is running.
  primeAudioGraph(ctx);

  void resumeContext(ctx).then((running) => {
    if (running) play();
  });
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
