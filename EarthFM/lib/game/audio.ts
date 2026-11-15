/* Web Audio sonification for the game. All sound is generated live from the data values (no samples). */
import type { Round, Timbre } from "./rounds";

const BASE = 261.63; // C4
const GLIDE_CAP = 18; // semitones; keeps +170% audibly above +73%

/* ---- pure mappings (tested in selfCheck) ---- */
export const semisForChange = (pct: number) => Math.max(-GLIDE_CAP, Math.min(GLIDE_CAP, 12 * Math.log2(1 + pct / 100)));
export const freq = (semis: number, base = BASE) => base * 2 ** (semis / 12);

/* A sound = a pitch contour over time: start and end semitones (equal for a steady tone). */
export type Contour = { from: number; to: number; dur: number };

export function contourFor(round: Round, value: number): Contour {
  if (round.mapping.kind === "change") return { from: 0, to: semisForChange(value), dur: 1.8 };
  const s = value * round.mapping.semisPerUnit;
  return { from: s, to: s, dur: 1.4 };
}

/* ---- engine ---- */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function audio() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setVolume(v: number) {
  audio();
  master!.gain.setTargetAtTime(v, ctx!.currentTime, 0.02);
}

/* Stop everything currently scheduled (fade out quickly, then swap the master bus). */
export function stopAll() {
  if (!ctx || !master) return;
  const old = master;
  old.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
  setTimeout(() => old.disconnect(), 120);
  master = ctx.createGain();
  master.gain.value = old.gain.value || 0.8;
  master.connect(ctx.destination);
}

function env(c: AudioContext, t0: number, dur: number, peak: number) {
  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + 0.06);
  g.gain.setValueAtTime(peak, t0 + dur - 0.15);
  g.gain.linearRampToValueAtTime(0, t0 + dur);
  g.connect(master!);
  return g;
}

function osc(c: AudioContext, type: OscillatorType, t0: number, dur: number, from: number, to: number, out: AudioNode, detune = 0) {
  const o = c.createOscillator();
  o.type = type;
  o.detune.value = detune;
  o.frequency.setValueAtTime(from, t0);
  if (to !== from) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  o.connect(out);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(c: AudioContext, t0: number, dur: number, out: AudioNode) {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(out);
  src.start(t0);
}

/* Play one contour in a timbre at time `when` (seconds from now). Returns its duration. */
export function playContour(k: Contour, timbre: Timbre, when = 0) {
  const c = audio();
  const t0 = c.currentTime + 0.05 + when;
  const f0 = freq(k.from), f1 = freq(k.to);
  if (timbre === "bell") {
    const g = env(c, t0, k.dur, 0.22);
    osc(c, "sine", t0, k.dur, f0, f1, g);
    osc(c, "triangle", t0, k.dur, f0 * 2, f1 * 2, g, 6);
  } else if (timbre === "water") {
    const g = env(c, t0, k.dur, 0.25);
    osc(c, "sine", t0, k.dur, f0, f1, g);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = Math.min(4000, f0 * 3);
    const ng = c.createGain();
    ng.gain.value = 0.05;
    lp.connect(ng).connect(g);
    noise(c, t0, k.dur, lp); // soft swell under the tone
  } else {
    // warm: brighter (higher filter cutoff) as the value rises
    const g = env(c, t0, k.dur, 0.18);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = Math.max(400, Math.min(6000, f0 * (2 + Math.max(0, k.from) / 3)));
    lp.connect(g);
    osc(c, "sawtooth", t0, k.dur, f0, f1, lp);
    osc(c, "sawtooth", t0, k.dur, f0, f1, lp, 9);
  }
  return k.dur;
}

/* Short cues: correct (up), wrong (down), tick (step change). */
export function earcon(kind: "correct" | "wrong" | "tick") {
  const c = audio();
  const t = c.currentTime + 0.02;
  const notes = kind === "correct" ? [0, 7, 12] : kind === "wrong" ? [4, 0] : [12];
  notes.forEach((s, i) => {
    const g = env(c, t + i * 0.11, 0.18, 0.12);
    osc(c, "triangle", t + i * 0.11, 0.18, freq(s + 12), freq(s + 12), g);
  });
}

export function selfCheck() {
  console.assert(semisForChange(0) === 0, "no change is flat");
  console.assert(semisForChange(170) > semisForChange(73) + 6, "Nairobi clearly above Mumbai");
  console.assert(semisForChange(-2) < 0 && semisForChange(-2) > -1, "Johannesburg nearly flat");
  console.assert(Math.abs(freq(12) - 2 * BASE) < 1e-9, "octave");
}
