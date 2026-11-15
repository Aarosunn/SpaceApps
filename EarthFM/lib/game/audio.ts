/* Sound for the game. It uses the SAME Tone.js engine and the same musical rules as the globe
   (lib/sonify: jukebox-engine.js + sonify-core.js), so the two modes sound like one product:
   - the same plucked lead voice, soft background tone and reference blip;
   - every pitch is snapped to the same major pentatonic scale;
   - notes are played on the same quarter-second grid.
   What a round means is unchanged: a "change" round climbs (or stays flat) by the size of the change,
   a "level" round sits on one pitch that is higher when the value is higher. All sound is generated live (no samples). */
import type { Round, Timbre } from "./rounds";
import core from "@/lib/sonify/sonify-core.js";
import Engine from "@/lib/sonify/jukebox-engine.js";
import { getPref } from "@/lib/prefs";
import { FLAGS } from "@/lib/flags";
import { createInstruments, type VoiceId } from "@/lib/sonify/instruments";

const BASE = 261.63; // C4
const BASE_MIDI = 60;
const GLIDE_CAP = 18; // semitones; keeps +170% audibly above +73%
const STEP = core.DEFAULT_MAPPING.stepSeconds as number; // 0.25 s, the globe's note grid
const SCALE = core.DEFAULT_MAPPING.scale as string;

/* ---- pure mappings (tested in selfCheck) ---- */
export const semisForChange = (pct: number) => Math.max(-GLIDE_CAP, Math.min(GLIDE_CAP, 12 * Math.log2(1 + pct / 100)));
export const freq = (semis: number, base = BASE) => base * 2 ** (semis / 12);
/* Semitones above C4 -> the nearest note of the globe's scale (as a MIDI number). */
export const snap = (semis: number): number => core.quantizeToScale(BASE_MIDI + semis, BASE_MIDI, SCALE);

/* A sound = a pitch contour over time: start and end semitones (equal for a steady tone). */
/* lo / hi: the lowest and highest pitch (semitones) any value of this round reaches, so a note knows how high it sits in the round.
   steps / gap: a staircase contour plays steps + 1 notes, `gap` seconds apart (see "steps" in rounds.ts). */
export type Contour = { from: number; to: number; dur: number; lo?: number; hi?: number; steps?: number; gap?: number };

const STAIRS = [0, 2, 4, 7, 9, 12, 14]; // semitones above the base note: the scale's own steps, so every stair is a clear note
const STAIR_GAP = 0.6; // seconds between stairs: slow enough to count
/* How many stairs a value climbs. Pure, checked in selfCheck. */
export const stairsFor = (value: number, unitsPerStep: number) => Math.max(0, Math.min(STAIRS.length - 1, Math.round(value / unitsPerStep)));

const endSemis = (round: Round, value: number) =>
  round.mapping.kind === "change" ? semisForChange(value) : round.mapping.kind === "steps" ? STAIRS[stairsFor(value, round.mapping.unitsPerStep)] : value * round.mapping.semisPerUnit;

export function contourFor(round: Round, value: number): Contour {
  // the round's own range: every option and every "how it sounds" example (a change round also starts from 0)
  const ends = [...round.options, ...round.learn.demo].map((o) => endSemis(round, o.value));
  if (round.mapping.kind !== "level") ends.push(0);
  const lo = Math.min(...ends), hi = Math.max(...ends), s = endSemis(round, value);
  if (round.mapping.kind === "steps") {
    const steps = stairsFor(value, round.mapping.unitsPerStep);
    return { from: 0, to: s, dur: (steps + 1) * STAIR_GAP + 0.5, lo, hi, steps, gap: STAIR_GAP };
  }
  return round.mapping.kind === "change" ? { from: 0, to: s, dur: 1.75, lo, hi } : { from: s, to: s, dur: 1.5, lo, hi };
}

/* Where note i of a contour sits in the round's range, 0..1: drives how full the band is. */
export function levelAt(k: Contour, i: number, n: number): number {
  if (k.lo === undefined || k.hi === undefined || k.hi === k.lo) return 0.5;
  const semis = k.steps !== undefined ? STAIRS[i] : k.from + ((k.to - k.from) * i) / Math.max(1, n - 1);
  return Math.max(0, Math.min(1, (semis - k.lo) / (k.hi - k.lo)));
}

/* The notes a contour is played as: one per quarter second, walking evenly from `from` to `to`, each snapped to the scale. */
export function notesFor(k: Contour): number[] {
  if (k.steps !== undefined) return Array.from({ length: k.steps + 1 }, (_, i) => snap(STAIRS[i])); // base note, then one stair per step
  const n = Math.max(2, Math.round(k.dur / STEP) - 1); // leave the last step for the note to ring out
  return Array.from({ length: n }, (_, i) => snap(k.from + ((k.to - k.from) * i) / (n - 1)));
}

/* ---- engine (shared with the globe) ---- */
type Eng = { setMaster: (g: number, t: number) => void; setPad: (p: { gain: number; cutoff?: number }, t: number, tau?: number) => void; play: (ev: object, t: number) => void; start: (t: number) => void; setVoice?: (v: VoiceId) => void; level?: () => number; accompany?: (level: number, t: number, i: number, midi: number) => void };
/* Round timbre -> instrument (lib/sonify/instruments.ts): the same voices the globe uses for its data layers. */
const TIMBRE_VOICE: Record<Timbre, VoiceId> = { bell: "bell", water: "water", warm: "warm", fire: "fire" };
let ready: Promise<{ Tone: typeof import("tone"); engine: Eng }> | null = null;
let volume = 0.8;
let timers: ReturnType<typeof setTimeout>[] = [];

/* Call from a tap or key press: browsers only start audio from a user gesture. */
export function audio() {
  ready ??= (async () => {
    const Tone = await import("tone");
    await Tone.start();
    const engine: Eng = FLAGS.instruments ? createInstruments(Tone, core) : Engine.createEngine(Tone, core, core.DEFAULT_MAPPING);
    engine.start(Tone.now());
    Tone.getDestination().chain(...(getPref("earthfm-mono") === "1" ? [new Tone.Mono()] : [])); // the Mono audio setting from the globe
    engine.setMaster(volume * 0.65, Tone.now());
    eng = engine;
    return { Tone, engine };
  })();
  return ready;
}

export function setVolume(v: number) {
  volume = v;
  void audio().then(({ Tone, engine }) => engine.setMaster(v * 0.65, Tone.now()));
}

/* Stop what is queued: notes are scheduled one by one, so dropping the timers silences the rest. */
export function stopAll() {
  timers.forEach(clearTimeout);
  timers = [];
  void ready?.then(({ Tone, engine }) => engine.setPad({ gain: 0 }, Tone.now(), 0.05));
}

/* Play one contour at time `when` (seconds from now). Returns its duration.
   The timbre no longer picks a different instrument (the globe has one voice); it only sets where the sound sits. */
export function playContour(k: Contour, timbre: Timbre, when = 0) {
  const notes = notesFor(k), map = core.DEFAULT_MAPPING, gap = k.gap ?? STEP;
  const pan = timbre === "bell" ? 0 : timbre === "water" ? -0.25 : 0.25;
  void audio().then(({ Tone, engine }) => {
    engine.setVoice?.(TIMBRE_VOICE[timbre]);
    notes.forEach((midi, i) => {
      timers.push(
        setTimeout(() => {
          const t = Tone.now() + 0.03;
          // the background tone follows the pitch, as on the globe: louder and brighter when higher
          const u = core.clamp((midi - (BASE_MIDI - 12)) / 36);
          engine.setPad({ gain: core.scaleLinear(u, map.padMinGain, map.padMaxGain), cutoff: core.scaleExp(u, map.padMinHz, map.padMaxHz) }, t, 0.08);
          if (i === 0) engine.play({ kind: "ref", midi: snap(0) + 12 }, t); // reference blip marks the start, as on the globe
          // the instrument's own cue (crackle count, wave size, brightness) follows the value's place in the round
          const level = FLAGS.gameBand ? levelAt(k, i, notes.length) : u;
          // a staircase: the base note is still water; every stair after it arrives on a wave
          const stair = k.steps !== undefined;
          engine.play({ kind: "lead", midi, vel: stair || i % 4 === 0 ? 0.9 : 0.6, pan, dur: gap * 0.8, u: level, ...(stair ? { wave: i > 0 } : {}) }, t);
          if (FLAGS.gameBand) engine.accompany?.(level, t, i, midi);
        }, (when + i * gap) * 1000),
      );
    });
    timers.push(setTimeout(() => engine.setPad({ gain: 0 }, Tone.now(), 0.15), (when + k.dur - 0.2) * 1000));
  });
  return k.dur;
}

/* Loudness 0..1 of what is sounding, for the visuals (0 with the single shared voice). */
let eng: Eng | null = null;
export const level = () => eng?.level?.() ?? 0;

/* Short cues: correct (up), wrong (down), tick (step change). Same blip voice as the globe's reference tone. */
export function earcon(kind: "correct" | "wrong" | "tick") {
  const semis = kind === "correct" ? [0, 7, 12] : kind === "wrong" ? [4, 0] : [12];
  void audio().then(({ Tone, engine }) => {
    semis.forEach((s, i) => engine.play({ kind: "ref", midi: snap(s) + 12 }, Tone.now() + 0.03 + i * 0.11));
  });
}

export function selfCheck() {
  console.assert(semisForChange(0) === 0, "no change is flat");
  console.assert(semisForChange(170) > semisForChange(73) + 6, "Nairobi clearly above Mumbai");
  console.assert(semisForChange(-2) < 0 && semisForChange(-2) > -1, "Johannesburg nearly flat");
  console.assert(Math.abs(freq(12) - 2 * BASE) < 1e-9, "octave");
  console.assert(snap(0) === 60 && snap(12) === 72 && snap(1) === 60 && snap(6) !== 66, "snaps to the pentatonic scale");
  console.assert(levelAt({ from: 0, to: 10, dur: 1, lo: 0, hi: 10 }, 0, 5) === 0 && levelAt({ from: 0, to: 10, dur: 1, lo: 0, hi: 10 }, 4, 5) === 1, "level runs from the round's lowest to its highest");
  console.assert([3.0, 6.5, 9.1, 11.3].map((v) => stairsFor(v, 3)).join() === "1,2,3,4" && stairsFor(0, 3) === 0, "sea level: one stair per 3 cm");
  console.assert(notesFor({ from: 0, to: 4, dur: 2, steps: 2, gap: 0.6 }).length === 3, "a 2-stair contour plays 3 notes");
  const flat = notesFor({ from: 0, to: 0, dur: 1.75 });
  console.assert(flat.every((m) => m === flat[0]), "no change stays on one note");
}
