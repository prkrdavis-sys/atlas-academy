import type { Profile } from "@/lib/types";
import { STREAK_SNUFF_MIN } from "@/lib/streak-tier";

/**
 * Tiny Web Audio synth for game feedback. Most cues are short envelope-shaped
 * tones; end-of-game uses a bright level-complete jingle (`complete`).
 *
 * AudioContext starts suspended under browser autoplay rules and can re-suspend
 * after backgrounding. Lifecycle (gesture prime, resume, mobile keep-alive) is
 * owned here so cues stay audible without relying on React timing.
 *
 * Important: `AudioContext.resume()` must run on a user-gesture call stack.
 * Background focus/visibility handlers must not start a shared resume that
 * later gesture code reuses — that pattern silently breaks desktop Safari.
 */
export type SoundKind =
  | "tap"
  | "play"
  | "correct"
  | "incorrect"
  | "streak"
  | "complete"
  | "explosion";

export type PlaySoundOptions = {
  /** Live answer streak after a correct response (1 = first correct in a row). */
  streak?: number;
  /** Prior streak length when a miss ends a run — adds a soft extinguish tail. */
  lostStreak?: number;
};

/** Sample-backed cues (Mixkit Game level completed — free Mixkit License). */
const SAMPLE_URLS = {
  complete: "/sounds/complete.mp3",
} as const;

const SAMPLE_GAIN = {
  complete: 0.24,
} as const;

type SampleSoundKind = keyof typeof SAMPLE_URLS;

let audioContext: AudioContext | null = null;
let gesturesInstalled = false;
let keepAliveInstalled = false;
/** Set when the tab backgrounds or the context suspends — iOS can report "running" but stay silent until re-primed on a gesture. */
let needsGestureUnlock = false;
let sessionKeepAlive: OscillatorNode | null = null;
const sampleBuffers = new Map<SoundKind, AudioBuffer>();
const sampleLoads = new Map<SoundKind, Promise<AudioBuffer | null>>();

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
    null
  );
}

/** Touch phones/tablets benefit from a silent keep-alive; desktop should not. */
function prefersMobileAudioKeepAlive(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(pointer: coarse)").matches;
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

        // Only flag recovery — never resume() from statechange. That stack is
        // not a user gesture and can poison later unlock attempts.
        if (audioContext.state === "suspended" || audioContext.state === "interrupted") {
          markNeedsGestureUnlock();
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
  sampleBuffers.clear();
  sampleLoads.clear();
}

function needsAudioRecovery(ctx: AudioContext): boolean {
  return needsGestureUnlock || ctx.state !== "running";
}

/** Near-silent oscillator keeps the media session warm so mobile OSes suspend less often. */
function startSessionKeepAlive(ctx: AudioContext): void {
  if (sessionKeepAlive || !prefersMobileAudioKeepAlive()) return;

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

/**
 * After backgrounding, mark that the next gesture must re-prime. Do not call
 * resume() here — desktop browsers often ignore non-gesture resumes, and a
 * shared in-flight resume can block the real click unlock.
 */
function installKeepAlive() {
  if (keepAliveInstalled || typeof document === "undefined") return;
  keepAliveInstalled = true;

  const markForegroundRecovery = () => {
    const ctx = audioContext;
    if (!ctx || ctx.state === "closed") return;
    if (needsGestureUnlock || ctx.state !== "running") {
      markNeedsGestureUnlock();
    }
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      markNeedsGestureUnlock();
      return;
    }
    markForegroundRecovery();
  });
  window.addEventListener("pageshow", markForegroundRecovery);
  window.addEventListener("focus", markForegroundRecovery);
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
  // Use mousedown/touchstart/keydown (not pointerdown alone): Safari desktop
  // often rejects pointerdown as an AudioContext unlock gesture.
  document.addEventListener("pointerdown", onGesture, { capture: true });
  document.addEventListener("mousedown", onGesture, { capture: true });
  document.addEventListener("touchstart", onGesture, { capture: true });
  document.addEventListener("keydown", onGesture, { capture: true });
}

/**
 * Always invoke resume() on this call. Never coalesce with a prior promise —
 * a focus/visibility resume started off-gesture must not satisfy a later click.
 */
function resumeContext(ctx: AudioContext): Promise<boolean> {
  if (ctx.state === "running") return Promise.resolve(true);
  if (ctx.state === "closed") return Promise.resolve(false);

  return ctx
    .resume()
    .then(() => ctx.state === "running")
    .catch(() => false);
}

/** Prime, resume, and recreate the context if the browser left it in a bad state. */
async function ensureAudioReady(ctx: AudioContext): Promise<AudioContext | null> {
  if (!needsAudioRecovery(ctx)) {
    startSessionKeepAlive(ctx);
    return ctx;
  }

  // resume() is started synchronously here so callers on a gesture stack unlock.
  primeAudioGraph(ctx);
  let running = await resumeContext(ctx);

  if (running) {
    needsGestureUnlock = false;
    startSessionKeepAlive(ctx);
    return ctx;
  }

  // Resume failed — recreate (common after long background on mobile Safari).
  // Do not await close(): a fresh resume() must still start on this gesture stack.
  try {
    if (ctx.state !== "closed") {
      void ctx.close();
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
  if (!ctx || ctx.state === "closed") return;

  if (!needsAudioRecovery(ctx)) {
    preloadSamples(ctx);
    return;
  }

  void ensureAudioReady(ctx).then((ready) => {
    if (ready) preloadSamples(ready);
  });
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

type SynthSoundKind = Exclude<SoundKind, SampleSoundKind | "explosion">;

const SOUNDS: Record<SynthSoundKind, Note[]> = {
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

function isSampleSound(kind: SoundKind): kind is SampleSoundKind {
  return kind in SAMPLE_URLS;
}

function loadSample(ctx: AudioContext, kind: SampleSoundKind): Promise<AudioBuffer | null> {
  const url = SAMPLE_URLS[kind];
  if (!url) return Promise.resolve(null);

  const cached = sampleBuffers.get(kind);
  if (cached) return Promise.resolve(cached);

  const inflight = sampleLoads.get(kind);
  if (inflight) return inflight;

  const load = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to load ${url}`);
      return response.arrayBuffer();
    })
    .then((bytes) => ctx.decodeAudioData(bytes.slice(0)))
    .then((buffer) => {
      sampleBuffers.set(kind, buffer);
      sampleLoads.delete(kind);
      return buffer;
    })
    .catch(() => {
      sampleLoads.delete(kind);
      return null;
    });

  sampleLoads.set(kind, load);
  return load;
}

/** Warm sample decode after unlock so end-of-game jingle is ready on first play. */
function preloadSamples(ctx: AudioContext): void {
  for (const kind of Object.keys(SAMPLE_URLS) as SampleSoundKind[]) {
    void loadSample(ctx, kind);
  }
}

function playSample(ctx: AudioContext, kind: SampleSoundKind, buffer: AudioBuffer): void {
  const source = ctx.createBufferSource();
  const gainNode = ctx.createGain();
  const start = ctx.currentTime + 0.01;
  const gain = SAMPLE_GAIN[kind];

  source.buffer = buffer;
  gainNode.gain.setValueAtTime(0, start);
  gainNode.gain.linearRampToValueAtTime(gain, start + 0.02);
  source.connect(gainNode);
  gainNode.connect(ctx.destination);
  source.start(start);
}

/**
 * Plays a sound effect (synth cue or sample). Pass the profile so the player's
 * sound setting is respected; a null/undefined profile plays (guest actions).
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
      scheduleSound(ctx, kind, options);
    } catch {
      // Ignore scheduling errors so one bad cue doesn't break future sounds.
    }
    return;
  }

  // Still inside a user-gesture call stack in normal game flows: prime + resume
  // so Safari unlocks, then schedule only once the clock is running.
  void ensureAudioReady(ctx).then((ready) => {
    if (!ready) return;
    preloadSamples(ready);
    try {
      scheduleSound(ready, kind, options);
    } catch {
      // Ignore scheduling errors so one bad cue doesn't break future sounds.
    }
  });
}

function scheduleSound(ctx: AudioContext, kind: SoundKind, options?: PlaySoundOptions) {
  if (isSampleSound(kind)) {
    void loadSample(ctx, kind).then((buffer) => {
      if (!buffer) return;
      try {
        playSample(ctx, kind, buffer);
      } catch {
        // Ignore playback errors on suspended/closed contexts.
      }
    });
    return;
  }

  if (kind === "explosion") {
    scheduleExplosion(ctx);
    return;
  }

  scheduleNotes(ctx, kind, options);
}

function scheduleExplosion(ctx: AudioContext): void {
  const start = ctx.currentTime + 0.01;
  const duration = 0.46;
  const noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) {
    const progress = i / noiseData.length;
    noiseData[i] = (Math.random() * 2 - 1) * (1 - progress) ** 1.4;
  }

  const noise = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const noiseGain = ctx.createGain();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1400, start);
  filter.frequency.exponentialRampToValueAtTime(180, start + duration);
  noiseGain.gain.setValueAtTime(0, start);
  noiseGain.gain.linearRampToValueAtTime(0.22, start + 0.012);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  noise.buffer = noiseBuffer;
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(start);
  noise.stop(start + duration + 0.02);

  const thud = ctx.createOscillator();
  const thudGain = ctx.createGain();
  thud.type = "sawtooth";
  thud.frequency.setValueAtTime(150, start);
  thud.frequency.exponentialRampToValueAtTime(38, start + 0.3);
  thudGain.gain.setValueAtTime(0, start);
  thudGain.gain.linearRampToValueAtTime(0.16, start + 0.008);
  thudGain.gain.exponentialRampToValueAtTime(0.001, start + 0.34);
  thud.connect(thudGain);
  thudGain.connect(ctx.destination);
  thud.start(start);
  thud.stop(start + 0.36);
}

function scheduleNotes(
  ctx: AudioContext,
  kind: Exclude<SynthSoundKind, "explosion">,
  options?: PlaySoundOptions,
) {
  const notes =
    kind === "correct" && options?.streak !== undefined
      ? getCorrectSoundNotes(options.streak)
      : kind === "incorrect" &&
          options?.lostStreak !== undefined &&
          options.lostStreak >= STREAK_SNUFF_MIN
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
