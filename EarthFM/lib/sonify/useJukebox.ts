"use client";

/* Globe <-> teammates' sonification engine (spaceapps-2026/sonification/recipes-browser).
   Musical decisions live in sonify-core.js; jukebox-engine.js builds the Tone.js graph and follows a media clock.
   Here we only: load a layer's global timeline, turn it into a song for one place, and drive a clip clock from the player UI.

   Around the place we take a window of 8 x 5 grid cells (80 x 50 degrees). Two ways to turn it into a song:
   - "area": the melody reads one cell per step (0.25 s), left to right, top row to bottom row, then starts again:
     40 steps = one pass every 10 s. A cell with no data is a rest. Meanwhile the data moves through the dates.
   - "time": the melody follows the average of the whole window, from the first date to the last. */
import { useCallback, useEffect, useRef } from "react";
import core from "./sonify-core.js";
import Engine from "./jukebox-engine.js";
import { asset } from "@/components/asset";
import { LAYERS, type Layer, type LayerId, type SonMode } from "./layers";

export const TIMELINE_SECONDS = 68.6; // one song = a layer's timeline, first date to last date
export const VIEW_ROWS = 5, VIEW_COLS = 8; // the window of 10-degree cells around a place

type Frame = { t: number; mean: number; motion: number; grid: number[]; events: unknown[]; date?: string };
type Timeline = { meta: { grid: [number, number] } & Record<string, unknown>; frames: Frame[] };
type Place = { lat: number; lon: number };

/* Fixed pitch range for every place (0..1 = the layer's whole value range), so places can be compared by ear.
   Area mode: 16 pulses in 16 steps = a note on every step, so no cell of the sweep is skipped.
   Time mode: the engine's own rhythm (more notes when the picture changes faster). */
const MAPS = {
  area: { ...core.DEFAULT_MAPPING, leadRange: [0, 1], minPulses: 16, maxPulses: 16 },
  time: { ...core.DEFAULT_MAPPING, leadRange: [0, 1] },
};
const STEP: number = core.DEFAULT_MAPPING.stepSeconds;
const TOGGLES = { pad: true, lead: true, ref: true, drum: true };
const HAS_DATA = 0.02; // grid values at or below this mean "no data"
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/* "2007-03-25" -> "25 Mar 2007"; a bare year ("1881") stays as it is. */
export const prettyDate = (iso?: string) => (!iso ? "" : iso.length < 10 ? iso : `${+iso.slice(8, 10)} ${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`);

/* Timelines are GLOBAL: 10-degree cells, rows north -> south (90..-90), cols west -> east (-180..180). */
export function cellFor(tl: Timeline, p: Place) {
  const [rows, cols] = tl.meta.grid;
  const row = Math.min(rows - 1, Math.max(0, Math.floor(((90 - p.lat) / 180) * rows)));
  const col = Math.min(cols - 1, Math.max(0, Math.floor(((p.lon + 180) / 360) * cols)));
  return { row, col };
}

export type SweepStep = { row: number; col: number; value: number | null; note: string | null; frame: number };
export type SoundRecipe = {
  layer: Layer;
  mode: SonMode;
  frames: Frame[]; // every date, all grid cells (0..1; 0 = no data)
  grid: [number, number];
  window: { r0: number; c0: number }; // top-left cell of the window
  home: { row: number; col: number }; // the cell the place sits in
  lo: number; hi: number; // the values (0..1) that play the lowest and the highest note
  scale: string[]; // note names, low to high
  stepSeconds: number; passSeconds: number; barSeconds: number;
  dataCells: number; // how many of the window's cells have data on the first date (0 = nothing to play)
  dates: [string, string]; // first and last date, formatted
  fmt: (v: number) => string; // 0..1 -> "23.4 °C"
  stepAt: (t: number) => SweepStep; // what is being read at clip time t (row/col = -1 in time mode: the whole window)
  captionAt: (t: number) => string; // one sentence on what the song is doing at clip time t
  timeline: Timeline; // what the player is given: one frame per step, mean = that step's value
  rests: Set<number>; // step numbers with nothing to play
  padLevel: number[]; // per step: the mean of the window's cells with data (drives the background tone)
};

/* Build the song for one place. The player, the panel and the caption all read this one object. */
export function recipeFor(tl: Timeline, p: Place, layer: Layer, mode: SonMode): SoundRecipe {
  const [rows, cols] = tl.meta.grid;
  const home = cellFor(tl, p);
  const r0 = Math.min(rows - VIEW_ROWS, Math.max(0, home.row - Math.floor(VIEW_ROWS / 2)));
  const c0 = Math.min(cols - VIEW_COLS, Math.max(0, home.col - Math.floor(VIEW_COLS / 2)));
  const map = MAPS[mode];
  const notes: number[] = core.leadNotes(map);
  const [lo, hi] = map.leadRange;
  const [vmin, vmax] = (tl.meta.value_range as [number, number]) ?? [0, 1];
  const fmt = (v: number) => `${(vmin + v * (vmax - vmin)).toFixed(layer.decimals)}${layer.unit}`;
  const noteFor = (v: number) => core.midiToName(notes[core.valueToIndex(core.norm(v, lo, hi), notes.length)]);
  const n = Math.floor(TIMELINE_SECONDS / STEP) + 1, cells = VIEW_ROWS * VIEW_COLS;
  const steps: SweepStep[] = [], dense: Frame[] = [], rests = new Set<number>(), padLevel: number[] = [];
  const rowRange: ([number, number] | null)[] = []; // per step: lowest and highest value in the row being swept
  let dataCells = 0;
  for (let k = 0; k < n; k++) {
    const t = k * STEP, s = core.sampleTimeline(tl, t), i = k % cells;
    const row = r0 + Math.floor(i / VIEW_COLS), col = c0 + (i % VIEW_COLS);
    let sum = 0, count = 0, rmin = Infinity, rmax = -Infinity;
    for (let rr = 0; rr < VIEW_ROWS; rr++)
      for (let cc = 0; cc < VIEW_COLS; cc++) {
        const w: number = s.grid[(r0 + rr) * cols + c0 + cc];
        if (w <= HAS_DATA) continue;
        sum += w;
        count++;
        if (r0 + rr === row) { rmin = Math.min(rmin, w); rmax = Math.max(rmax, w); }
      }
    if (k === 0) dataCells = count;
    const mean = count ? sum / count : 0;
    const v: number = mode === "area" ? s.grid[row * cols + col] : mean;
    const has = v > HAS_DATA;
    if (!has) rests.add(k);
    padLevel.push(mean);
    rowRange.push(rmax >= rmin ? [rmin, rmax] : null);
    steps.push({ row: mode === "area" ? row : -1, col: mode === "area" ? col : -1, value: has ? v : null, note: has ? noteFor(v) : null, frame: s.index });
    dense.push({ t, mean: has ? v : 0, motion: s.motion, grid: tl.frames[s.index].grid, events: [], date: tl.frames[s.index].date });
  }
  const at = (t: number) => Math.min(n - 1, Math.max(0, Math.floor(t / STEP + 1e-6)));
  // A short caption: how it sounds, and why. "High notes: warm water, 27.6 to 29.0 °C."
  const band = (v: number) => { const u = core.norm(v, lo, hi); return u < 1 / 3 ? 0 : u < 2 / 3 ? 1 : 2; };
  const PITCH = ["Low", "Mid", "High"];
  // one decimal fewer than the readout, so the caption does not rewrite itself on every tiny change
  const round = (v: number) => (vmin + v * (vmax - vmin)).toFixed(Math.max(0, layer.decimals - 1));
  const captionAt = (t: number) => {
    const k = at(t), st = steps[k];
    if (mode === "area") {
      const r = rowRange[k];
      if (!r) return `Silent: ${layer.noData.toLowerCase()} in this row.`;
      const b = band((r[0] + r[1]) / 2);
      if (!layer.numbers) return `${PITCH[b]} notes: ${layer.words[b]}.`;
      return `${PITCH[b]} notes: ${layer.words[b]}, ${round(r[0])} to ${round(r[1])}${layer.unit}.`;
    }
    if (st.value === null) return `Silent: ${layer.noData.toLowerCase()} here.`;
    const before = steps[Math.max(0, k - 16)].value ?? st.value, d = st.value - before; // against 4 seconds ago
    const b = band(st.value), moving = Math.abs(d) < 0.004 ? "steady" : d > 0 ? "rising" : "falling";
    if (!layer.numbers) return `${PITCH[b]} notes, ${moving}: ${layer.words[b]}.`;
    return `${PITCH[b]} notes, ${moving}: ${layer.words[b]}, ${round(st.value)}${layer.unit}.`;
  };
  return {
    layer, mode, frames: tl.frames, grid: tl.meta.grid, window: { r0, c0 }, home, lo, hi,
    scale: notes.map((m) => core.midiToName(m)),
    stepSeconds: STEP, passSeconds: cells * STEP, barSeconds: STEP * map.stepsPerBar, dataCells,
    dates: [prettyDate(tl.frames[0].date), prettyDate(tl.frames[tl.frames.length - 1].date)],
    fmt, stepAt: (t) => steps[at(t)], captionAt,
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
    timelines: Partial<Record<LayerId, Promise<Timeline>>>;
    song?: SoundRecipe; // the song now playing
    volume: number;
  }>({ volume: 0.75, timelines: {} });

  /* Each layer's timeline is fetched once and kept. */
  const timeline = useCallback((layer: LayerId) => {
    const s = st.current;
    return (s.timelines[layer] ??= fetch(asset(LAYERS[layer].file)).then((r) => {
      if (!r.ok) throw new Error(`Could not load ${LAYERS[layer].file} (HTTP ${r.status})`);
      return r.json();
    }));
  }, []);

  /* Must first run inside a click/keypress (browsers only start audio from a user gesture). */
  const ensure = useCallback(async () => {
    const s = st.current;
    if (s.player) return s;
    const Tone = await import("tone");
    await Tone.start();
    if (s.player) return s; // a second call finished first
    s.Tone = Tone;
    s.engine = Engine.createEngine(Tone, core, MAPS.area);
    s.engine!.start(Tone.now());
    s.engine!.setMaster(s.volume * 0.65, Tone.now());
    /* The engine is used as it is. Two of the functions it calls are wrapped so the song is honest:
       a cell with no data is a rest (not the lowest note), in area mode each note sits left/right where its cell is,
       and the background tone follows the mean of the whole window instead of jumping cell to cell. */
    const stepOf = (t: number) => Math.round(t / STEP);
    const songCore = {
      ...core,
      scoreWindow: (tl2: Timeline, map: unknown, stats: unknown, from: number, to: number) =>
        (core.scoreWindow(tl2, map, stats, from, to) as { t: number; kind: string; pan?: number }[]).flatMap((ev) => {
          const sg = st.current.song;
          if (ev.kind !== "lead" || !sg) return [ev];
          if (sg.rests.has(stepOf(ev.t))) return [];
          if (sg.mode === "time") return [{ ...ev, pan: 0 }];
          return [{ ...ev, pan: ((sg.stepAt(ev.t).col - sg.window.c0) / (VIEW_COLS - 1)) * 1.6 - 0.8 }];
        }),
      padTargets: (sample: { t: number; mean: number }, map: unknown, stats: unknown) => {
        const sg = st.current.song;
        const mean = sg ? sg.padLevel[Math.min(sg.padLevel.length - 1, Math.max(0, stepOf(sample.t)))] : sample.mean;
        return core.padTargets({ ...sample, mean }, map, stats);
      },
    };
    s.player = Engine.createPlayer(Tone, songCore, s.engine, TOGGLES);
    s.player!.start();
    return s;
  }, []);

  const recipe = useCallback(async (place: Place, layer: LayerId, mode: SonMode) => recipeFor(await timeline(layer), place, LAYERS[layer], mode), [timeline]);

  const play = useCallback(async (place: Place, layer: LayerId, mode: SonMode, fromSeconds = 0) => {
    const [s, song] = await Promise.all([ensure(), recipe(place, layer, mode)]);
    s.clock?.pause();
    const clock = core.makeClipClock(TIMELINE_SECONDS, () => performance.now() / 1000);
    clock.currentTime = fromSeconds;
    s.song = song;
    s.player!.setSource(clock, song.timeline, MAPS[mode]);
    s.clock = clock;
    clock.play();
  }, [ensure, recipe]);

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
  /* Position of the clip clock in seconds (0 before anything has played). */
  const time = useCallback(() => st.current.clock?.currentTime ?? 0, []);

  useEffect(() => () => { st.current.clock?.pause(); st.current.player?.stop(); }, []);
  return { ensure, play, pause, resume, setVolume, recipe, time };
}
