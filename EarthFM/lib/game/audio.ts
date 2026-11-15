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
export type Contour = { from: number; to: number; dur: number };

export function contourFor(round: Round, value: number): Contour {
  if (round.mapping.kind === "change") return { from: 0, to: semisForChange(value), dur: 1.75 };
  const s = value * round.mapping.semisPerUnit;
  return { from: s, to: s, dur: 1.5 };
}

/* The notes a contour is played as: one per quarter second, walking evenly from `from` to `to`, each snapped to the scale. */
export function notesFor(k: Contour): number[] {
  const n = Math.max(2, Math.round(k.dur / STEP) - 1); // leave the last step for the note to ring out
  return Array.from({ length: n }, (_, i) => snap(k.from + ((k.to - k.from) * i) / (n - 1)));
}

/* ---- engine (shared with the globe) ---- */
type Eng = { setMaster: (g: number, t: number) => void; setPad: (p: { gain: number; cutoff?: number }, t: number, tau?: number) => void; play: (ev: object, t: number) => void; start: (t: number) => void };
let ready: Promise<{ Tone: typeof import("tone"); engine: Eng }> | null = null;
let volume = 0.8;
let timers: ReturnType<typeof setTimeout>[] = [];

/* Call from a tap or key press: browsers only start audio from a user gesture. */
export function audio() {
  ready ??= (async () => {
    const Tone = await import("tone");
    await Tone.start();
    const engine: Eng = Engine.createEngine(Tone, core, core.DEFAULT_MAPPING);
    engine.start(Tone.now());
    engine.setMaster(volume * 0.65, Tone.now());
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
  const notes = notesFor(k), map = core.DEFAULT_MAPPING;
  const pan = timbre === "bell" ? 0 : timbre === "water" ? -0.25 : 0.25;
  void audio().then(({ Tone, engine }) => {
    notes.forEach((midi, i) => {
      timers.push(
        setTimeout(() => {
          const t = Tone.now() + 0.03;
          // the background tone follows the pitch, as on the globe: louder and brighter when higher
          const u = core.clamp((midi - (BASE_MIDI - 12)) / 36);
          engine.setPad({ gain: core.scaleLinear(u, map.padMinGain, map.padMaxGain), cutoff: core.scaleExp(u, map.padMinHz, map.padMaxHz) }, t, 0.08);
          if (i === 0) engine.play({ kind: "ref", midi: snap(0) + 12 }, t); // reference blip marks the start, as on the globe
          engine.play({ kind: "lead", midi, vel: i % 4 === 0 ? 0.9 : 0.6, pan, dur: STEP * 0.8 }, t);
        }, (when + i * STEP) * 1000),
      );
    });
    timers.push(setTimeout(() => engine.setPad({ gain: 0 }, Tone.now(), 0.15), (when + k.dur - 0.2) * 1000));
  });
  return k.dur;
}

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
  const flat = notesFor({ from: 0, to: 0, dur: 1.75 });
  console.assert(flat.every((m) => m === flat[0]), "no change stays on one note");
}
