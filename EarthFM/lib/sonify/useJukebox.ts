"use client";

/* Globe <-> teammates' sonification engine (spaceapps-2026/sonification/recipes-browser).
   Musical decisions live in sonify-core.js; jukebox-engine.js builds the Tone.js graph and follows a media clock.
   Here we only: load the global SST timeline, turn it into a SWEEP for one place, and drive a clip clock from the player UI.

   The sweep: around the place we take a window of 8 x 5 grid cells (80 x 50 degrees). The melody reads one cell per
   step (0.25 s), left to right, top row to bottom row, then starts again: 40 steps = one pass every 10 s. Each cell's
   temperature is the note. A land cell is a rest. Meanwhile the data moves through the dates of the year. */
import { useCallback, useEffect, useRef } from "react";
import core from "./sonify-core.js";
import Engine from "./jukebox-engine.js";
import { asset } from "@/components/asset";

export const TIMELINE_SECONDS = 68.6; // one song = the global SST timeline, first date to last date
export const VIEW_ROWS = 5, VIEW_COLS = 8; // the window of 10-degree cells swept around a place

type Frame = { t: number; mean: number; motion: number; grid: number[]; events: unknown[]; date?: string };
type Timeline = { meta: { grid: [number, number] } & Record<string, unknown>; frames: Frame[] };
type Place = { lat: number; lon: number; surface: "water" | "ice" | "land" };

/* Fixed pitch range for every place: 0..1 = 0..32 C, so a cold sea always sounds lower than a warm one.
   16 pulses in 16 steps = a note on every step, so no cell of the sweep is skipped. */
const MAP = { ...core.DEFAULT_MAPPING, leadRange: [0, 1], minPulses: 16, maxPulses: 16 };
const STEP: number = MAP.stepSeconds;
const TOGGLES = { pad: true, lead: true, ref: true, drum: true };
const HAS_DATA = 0.02; // grid values at or below this are land / no reading

/* The timeline is GLOBAL (built by spaceapps-2026/sonification/recipes-python/build_global_sst_timeline.py from flat
   NASA SVS 3912 frames): 10-degree cells, rows north -> south (90..-90), cols west -> east (-180..180), 0 = land. */
export function cellFor(tl: Timeline, p: Place) {
  const [rows, cols] = tl.meta.grid;
  const row = Math.min(rows - 1, Math.max(0, Math.floor(((90 - p.lat) / 180) * rows)));
  const col = Math.min(cols - 1, Math.max(0, Math.floor(((p.lon + 180) / 360) * cols)));
  return { row, col };
}

export type SweepStep = { row: number; col: number; value: number | null; note: string | null; frame: number };
export type SoundRecipe = {
  frames: Frame[]; // every date, all grid cells (0..1; 0 = land)
  grid: [number, number];
  window: { r0: number; c0: number }; // top-left cell of the swept window
  home: { row: number; col: number }; // the cell the place sits in
  valueRange: [number, number]; // what 0..1 means in data units (degrees C)
  lo: number; hi: number; // the values that play the lowest and the highest note
  scale: string[]; // note names, low to high
  stepSeconds: number; passSeconds: number; barSeconds: number;
  oceanCells: number; // how many of the window's cells have data (0 = nothing to play)
  stepAt: (t: number) => SweepStep; // what the sweep reads at clip time t
  timeline: Timeline; // what the player is given: one frame per step, mean = that step's cell
  rests: Set<number>; // step numbers that fall on land
  padLevel: number[]; // per step: the mean of the window's ocean cells (drives the background tone)
};

/* Build the sweep for one place. The player and the "how this sound is made" panel both use this. */
export function recipeFor(tl: Timeline, p: Place): SoundRecipe {
  const [rows, cols] = tl.meta.grid;
  const home = cellFor(tl, p);
  const r0 = Math.min(rows - VIEW_ROWS, Math.max(0, home.row - Math.floor(VIEW_ROWS / 2)));
  const c0 = Math.min(cols - VIEW_COLS, Math.max(0, home.col - Math.floor(VIEW_COLS / 2)));
  const notes: number[] = core.leadNotes(MAP);
  const [lo, hi] = MAP.leadRange;
  const noteFor = (v: number) => core.midiToName(notes[core.valueToIndex(core.norm(v, lo, hi), notes.length)]);
  const n = Math.floor(TIMELINE_SECONDS / STEP) + 1, cells = VIEW_ROWS * VIEW_COLS;
  const steps: SweepStep[] = [], dense: Frame[] = [], rests = new Set<number>(), padLevel: number[] = [];
  let oceanCells = 0;
  for (let k = 0; k < n; k++) {
    const t = k * STEP, s = core.sampleTimeline(tl, t), i = k % cells;
    const row = r0 + Math.floor(i / VIEW_COLS), col = c0 + (i % VIEW_COLS);
    const v: number = s.grid[row * cols + col], has = v > HAS_DATA;
    let sum = 0, count = 0;
    for (let rr = 0; rr < VIEW_ROWS; rr++)
      for (let cc = 0; cc < VIEW_COLS; cc++) {
        const w = s.grid[(r0 + rr) * cols + c0 + cc];
        if (w > HAS_DATA) { sum += w; count++; }
      }
    if (k === 0) oceanCells = count;
    if (!has) rests.add(k);
    padLevel.push(count ? sum / count : 0);
    steps.push({ row, col, value: has ? v : null, note: has ? noteFor(v) : null, frame: s.index });
    dense.push({ t, mean: has ? v : 0, motion: s.motion, grid: tl.frames[s.index].grid, events: [], date: tl.frames[s.index].date });
  }
  return {
    frames: tl.frames, grid: tl.meta.grid, window: { r0, c0 }, home,
    valueRange: (tl.meta.value_range as [number, number]) ?? [0, 1],
    lo, hi, scale: notes.map((m) => core.midiToName(m)),
    stepSeconds: STEP, passSeconds: cells * STEP, barSeconds: STEP * MAP.stepsPerBar, oceanCells,
    stepAt: (t) => steps[Math.min(n - 1, Math.max(0, Math.floor(t / STEP + 1e-6)))],
    timeline: { meta: { ...tl.meta, fps: 1 / STEP, frame_step: 1, n_frames: n }, frames: dense },
    rests, padLevel,
  };
}

export function useJukebox() {
  const st = useRef<{
    Tone?: typeof import("tone");
    engine?: { setMaster: (g: number, t: number) => void; start: (t: number) => void };
    player?: { setSource: (clock: unknown, tl: Timeline, map: unknown) => void; start: () => void; stop: () => void };
    clock?: { currentTime: number; play: () => void; pause: () => void };
    tl?: Timeline;
    sweep?: SoundRecipe; // the sweep now playing
    volume: number;
  }>({ volume: 0.75 });

  /* Must first run inside a click/keypress (browsers only start audio from a user gesture). */
  const ensure = useCallback(async () => {
    const s = st.current;
    if (s.player) return s;
    const [Tone, tl] = await Promise.all([import("tone"), fetch(asset("/sonify/sst-global.json")).then((r) => r.json())]);
    await Tone.start();
    s.Tone = Tone;
    s.tl = tl;
    s.engine = Engine.createEngine(Tone, core, MAP);
    s.engine!.start(Tone.now());
    s.engine!.setMaster(s.volume * 0.65, Tone.now());
    /* The engine is used as it is. Two of the functions it calls are wrapped so the sweep is honest:
       a land cell is a rest (not the lowest note), each note sits left/right where its cell is, and the
       background tone follows the mean of the whole window instead of jumping cell to cell. */
    const stepOf = (t: number) => Math.round(t / STEP);
    const sweepCore = {
      ...core,
      scoreWindow: (tl2: Timeline, map: unknown, stats: unknown, from: number, to: number) =>
        (core.scoreWindow(tl2, map, stats, from, to) as { t: number; kind: string; pan?: number }[]).flatMap((ev) => {
          const sw = st.current.sweep;
          if (ev.kind !== "lead" || !sw) return [ev];
          if (sw.rests.has(stepOf(ev.t))) return [];
          return [{ ...ev, pan: ((sw.stepAt(ev.t).col - sw.window.c0) / (VIEW_COLS - 1)) * 1.6 - 0.8 }];
        }),
      padTargets: (sample: { t: number; mean: number }, map: unknown, stats: unknown) => {
        const sw = st.current.sweep;
        const mean = sw ? sw.padLevel[Math.min(sw.padLevel.length - 1, Math.max(0, stepOf(sample.t)))] : sample.mean;
        return core.padTargets({ ...sample, mean }, map, stats);
      },
    };
    s.player = Engine.createPlayer(Tone, sweepCore, s.engine, TOGGLES);
    s.player!.start();
    return s;
  }, []);

  const play = useCallback(async (place: Place, fromSeconds = 0) => {
    const s = await ensure();
    s.clock?.pause();
    const clock = core.makeClipClock(TIMELINE_SECONDS, () => performance.now() / 1000);
    clock.currentTime = fromSeconds;
    s.sweep = recipeFor(s.tl!, place);
    s.player!.setSource(clock, s.sweep.timeline, MAP);
    s.clock = clock;
    clock.play();
  }, [ensure]);

  const pause = useCallback(() => {
    st.current.clock?.pause();
  }, []);
  const resume = useCallback(() => {
    st.current.clock?.play();
  }, []);
  const setVolume = useCallback((v: number) => {
    const s = st.current;
    s.volume = v;
    if (s.engine && s.Tone) s.engine.setMaster(v * 0.65, s.Tone.now());
  }, []);

  /* For the "how this sound is made" panel: the sweep for a place, and the position of the clip clock in seconds. */
  const recipe = useCallback(async (place: Place) => recipeFor((await ensure()).tl!, place), [ensure]);
  const time = useCallback(() => st.current.clock?.currentTime ?? 0, []);

  useEffect(() => () => { st.current.clock?.pause(); st.current.player?.stop(); }, []);
  return { ensure, play, pause, resume, setVolume, recipe, time };
}
