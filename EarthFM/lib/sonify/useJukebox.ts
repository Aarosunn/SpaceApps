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
import { FLAGS } from "@/lib/flags";
import { createInstruments, VOICE_MAP, type VoiceId } from "./instruments";

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
/* Each data layer has its own instrument, key and scale (lib/sonify/instruments.ts). */
export const LAYER_VOICE: Record<LayerId, VoiceId> = { sst: "water", fires: "fire", heat: "warm" };
const mapFor = (mode: SonMode, layer: LayerId) => (FLAGS.instruments ? { ...MAPS[mode], ...VOICE_MAP[LAYER_VOICE[layer]] } : MAPS[mode]);
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
  caption: string; // one short line for the whole song: how it sounds, and why
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
  const map = mapFor(mode, layer.id);
  const notes: number[] = core.leadNotes(map);
  const [lo, hi] = map.leadRange;
  const [vmin, vmax] = (tl.meta.value_range as [number, number]) ?? [0, 1];
  const fmt = (v: number) => `${(vmin + v * (vmax - vmin)).toFixed(layer.decimals)}${layer.unit}`;
  const noteFor = (v: number) => core.midiToName(notes[core.valueToIndex(core.norm(v, lo, hi), notes.length)]);
  const n = Math.floor(TIMELINE_SECONDS / STEP) + 1, cells = VIEW_ROWS * VIEW_COLS;
  const steps: SweepStep[] = [], dense: Frame[] = [], rests = new Set<number>(), padLevel: number[] = [];
  let dataCells = 0;
  for (let k = 0; k < n; k++) {
    const t = k * STEP, s = core.sampleTimeline(tl, t), i = k % cells;
    const row = r0 + Math.floor(i / VIEW_COLS), col = c0 + (i % VIEW_COLS);
    let sum = 0, count = 0;
    for (let rr = 0; rr < VIEW_ROWS; rr++)
      for (let cc = 0; cc < VIEW_COLS; cc++) {
        const w: number = s.grid[(r0 + rr) * cols + c0 + cc];
        if (w <= HAS_DATA) continue;
        sum += w;
        count++;
      }
    if (k === 0) dataCells = count;
    const mean = count ? sum / count : 0;
    const v: number = mode === "area" ? s.grid[row * cols + col] : mean;
    const has = v > HAS_DATA;
    if (!has) rests.add(k);
    padLevel.push(mean);
    steps.push({ row: mode === "area" ? row : -1, col: mode === "area" ? col : -1, value: has ? v : null, note: has ? noteFor(v) : null, frame: s.index });
    dense.push({ t, mean: has ? v : 0, motion: s.motion, grid: tl.frames[s.index].grid, events: [], date: tl.frames[s.index].date });
  }
  const at = (t: number) => Math.min(n - 1, Math.max(0, Math.floor(t / STEP + 1e-6)));
  // ONE short caption for the whole song: how it sounds, and why. It does not change while the song plays.
  //   by area: "Mostly high notes: warm water, 20 to 29 °C."   by time: "Notes rise: cooler than normal to hotter than normal."
  const band = (v: number) => { const u = core.norm(v, lo, hi); return u < 1 / 3 ? 0 : u < 2 / 3 ? 1 : 2; };
  const PITCH = ["low", "mid", "high"];
  const cap = (x: string) => x[0].toUpperCase() + x.slice(1);
  // one decimal fewer than the data, to keep the caption short
  const round = (v: number) => (vmin + v * (vmax - vmin)).toFixed(Math.max(0, layer.decimals - 1));
  const played = steps.filter((x) => x.value !== null).map((x) => x.value as number);
  let caption: string;
  if (!played.length) caption = `Silent: ${layer.noData.toLowerCase()} in this picture.`;
  else if (mode === "area") {
    const min = Math.min(...played), max = Math.max(...played), b = band(played.reduce((a, v) => a + v, 0) / played.length);
    const mixed = band(min) !== band(max);
    caption = `${cap(mixed ? `mostly ${PITCH[b]}` : PITCH[b])} notes: ${layer.words[b]}` + (layer.numbers ? `, ${round(min)} to ${round(max)}${layer.unit}.` : ".");
  } else {
    const a = played[0], z = played[played.length - 1], d = z - a;
    const moving = Math.abs(d) < 0.02 ? "stay level" : d > 0 ? "rise" : "fall";
    const words = band(a) === band(z) ? `${layer.words[band(a)]} throughout` : `${layer.words[band(a)]} to ${layer.words[band(z)]}`;
    caption = `Notes ${moving}: ${words}` + (layer.numbers ? `, ${round(a)} to ${round(z)}${layer.unit}.` : ".");
  }
  return {
    layer, mode, frames: tl.frames, grid: tl.meta.grid, window: { r0, c0 }, home, lo, hi,
    scale: notes.map((m) => core.midiToName(m)),
    stepSeconds: STEP, passSeconds: cells * STEP, barSeconds: STEP * map.stepsPerBar, dataCells,
    dates: [prettyDate(tl.frames[0].date), prettyDate(tl.frames[tl.frames.length - 1].date)],
    fmt, stepAt: (t) => steps[at(t)], caption,
    timeline: { meta: { ...tl.meta, fps: 1 / STEP, frame_step: 1, n_frames: n }, frames: dense },
    rests, padLevel,
  };
}

export function useJukebox() {
  const st = useRef<{
    Tone?: typeof import("tone");
    engine?: { setMaster: (g: number, t: number) => void; setPad: (p: { gain: number }, t: number, tau?: number) => void; start: (t: number) => void; setVoice?: (v: VoiceId) => void; level?: () => number; spectrum?: () => Float32Array };
    player?: { setSource: (clock: unknown, tl: Timeline, map: unknown) => void; start: () => void; stop: () => void };
    clock?: { currentTime: number; play: () => void; pause: () => void };
    timelines: Partial<Record<LayerId, Promise<Timeline>>>;
    song?: SoundRecipe; // the song now playing
    left?: boolean; // the globe was closed: nothing may start sounding after this
    volume: number;
    mono?: boolean;
  }>({ volume: 0.75, timelines: {} });

  /* Each layer's timeline is fetched once and kept. */
  const timeline = useCallback((layer: LayerId) => {
    const s = st.current;
    return (s.timelines[layer] ??= fetch(asset(LAYERS[layer].file)).then((r) => {
      if (!r.ok) throw new Error(`Could not load the ${LAYERS[layer].label.toLowerCase()} data. Check your internet connection and reload the page.`);
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
    s.engine = FLAGS.instruments ? createInstruments(Tone, core) : Engine.createEngine(Tone, core, MAPS.area);
    s.engine!.start(Tone.now());
    Tone.getDestination().chain(...(s.mono ? [new Tone.Mono()] : [])); // match the switch even if the game set it before
    s.engine!.setMaster(s.left ? 0 : s.volume * 0.65, Tone.now()); // silent if the page was left while this was loading
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
    if (s.left) return;
    s.clock?.pause();
    const clock = core.makeClipClock(TIMELINE_SECONDS, () => performance.now() / 1000);
    clock.currentTime = fromSeconds;
    s.song = song;
    s.engine!.setVoice?.(LAYER_VOICE[layer]);
    s.player!.setSource(clock, song.timeline, mapFor(mode, layer));
    s.clock = clock;
    clock.play();
  }, [ensure, recipe]);

  const pause = useCallback(() => {
    st.current.clock?.pause();
  }, []);
  const resume = useCallback(() => {
    st.current.clock?.play();
  }, []);
  // Mono: fold left and right into one channel at the very end of the chain, so panned notes reach both ears.
  const setMono = useCallback((on: boolean) => {
    const s = st.current;
    s.mono = on;
    if (!s.Tone) return; // applied when the engine starts
    const out = s.Tone.getDestination();
    if (on) out.chain(new s.Tone.Mono());
    else out.chain();
  }, []);
  const setVolume = useCallback((v: number) => {
    const s = st.current;
    s.volume = v;
    if (s.engine && s.Tone) s.engine.setMaster(v * 0.65, s.Tone.now());
  }, []);
  /* Position of the clip clock in seconds (0 before anything has played). */
  const time = useCallback(() => st.current.clock?.currentTime ?? 0, []);

  /* Leaving the globe (for the game, or any other page): stop the song AND silence the engine. Pausing the clock alone
     left the background tone droning, because the player is what normally fades it out. */
  useEffect(() => {
    const s = st.current; // the same object for the life of the component
    s.left = false; // React's development mode mounts, unmounts and mounts again: re-arm on every mount
    return () => {
      s.clock?.pause();
      s.player?.stop();
      if (s.engine && s.Tone) {
        s.engine.setPad({ gain: 0 }, s.Tone.now(), 0.05);
        s.engine.setMaster(0, s.Tone.now());
      }
      s.left = true;
    };
  }, []);
  /* For the visuals: loudness 0..1 and the spectrum of what is sounding now (0 / null before the engine starts). */
  const level = useCallback(() => st.current.engine?.level?.() ?? 0, []);
  const spectrum = useCallback(() => st.current.engine?.spectrum?.() ?? null, []);
  return { ensure, play, pause, resume, setVolume, setMono, recipe, time, level, spectrum };
}
