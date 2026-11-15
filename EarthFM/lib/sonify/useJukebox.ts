"use client";

/* Globe <-> teammates' sonification engine (spaceapps-2026/sonification/recipes-browser).
   Musical decisions live in sonify-core.js; jukebox-engine.js builds the Tone.js graph and follows a media clock.
   Here we only: load the SVS 3912 timeline, make a per-place version of it, and drive a clip clock from the player UI. */
import { useCallback, useEffect, useRef } from "react";
import core from "./sonify-core.js";
import Engine from "./jukebox-engine.js";
import { asset } from "@/components/asset";

export const TIMELINE_SECONDS = 68.6; // one song = the global SST timeline, first date to last date

type Timeline = { meta: { grid: [number, number] } & Record<string, unknown>; frames: { t: number; mean: number; grid: number[]; date?: string }[] };
type Place = { lat: number; lon: number; surface: "water" | "ice" | "land" };

/* Fixed pitch range for every place: 0..1 = 0..32 C. A cold sea always sounds low and a warm sea high, so places can be
   compared by ear. (The default, "auto", stretches each place over the full range, which makes them all sound alike.) */
const MAP = { ...core.DEFAULT_MAPPING, leadRange: [0, 1] };
const TOGGLES = { pad: true, lead: true, ref: true, drum: true };

/* The timeline is GLOBAL (built by spaceapps-2026/sonification/recipes-python/build_global_sst_timeline.py from flat
   NASA SVS 3912 frames): 10-degree cells, rows north -> south (90..-90), cols west -> east (-180..180), 0 = land.
   For a place at sea, the lead melody follows that place's cell instead of the whole-ocean mean.
   ponytail: land and ice have no data timeline yet, so they hear the whole-ocean mean (still real SVS 3912 data). */
/* Which grid cell a place reads, and whether that cell has data (same rule the sound uses). */
export function cellFor(tl: Timeline, p: Place) {
  const [rows, cols] = tl.meta.grid;
  const row = Math.min(rows - 1, Math.max(0, Math.floor(((90 - p.lat) / 180) * rows)));
  const col = Math.min(cols - 1, Math.max(0, Math.floor(((p.lon + 180) / 360) * cols)));
  const k = row * cols + col;
  return { row, col, k, hasCell: p.surface === "water" && tl.frames.some((f) => f.grid[k] > 0.02) };
}

export function timelineForPlace(tl: Timeline, p: Place): Timeline {
  const { k, hasCell } = cellFor(tl, p);
  if (!hasCell) return tl;
  return { ...tl, frames: tl.frames.map((f) => ({ ...f, mean: f.grid[k] })) };
}

/* Everything the "how this sound is made" panel shows, computed with the SAME functions the player uses. */
export type SoundRecipe = {
  frames: Timeline["frames"]; // every date, all grid cells (0..1; 0 = land)
  series: number[]; // the value this place's melody follows, one per date (0..1)
  cell: ReturnType<typeof cellFor>;
  grid: [number, number];
  valueRange: [number, number]; // what 0..1 means in data units (degrees C)
  lo: number; hi: number; // the values that play the lowest and the highest note
  scale: string[]; // note names, low to high
  minPulses: number; maxPulses: number; barSeconds: number;
  noteAt: (t: number) => { value: number; note: string; frame: number }; // what is sounding at clip time t
};
export function recipeFor(tl: Timeline, p: Place): SoundRecipe {
  const mine = timelineForPlace(tl, p);
  const stats = core.timelineStats(mine);
  const [lo, hi] = core.leadRange(MAP, stats);
  const notes: number[] = core.leadNotes(MAP);
  return {
    frames: tl.frames,
    series: mine.frames.map((f) => f.mean),
    cell: cellFor(tl, p),
    grid: tl.meta.grid,
    valueRange: (tl.meta.value_range as [number, number]) ?? [0, 1],
    lo, hi,
    scale: notes.map((m) => core.midiToName(m)),
    minPulses: MAP.minPulses, maxPulses: MAP.maxPulses, barSeconds: MAP.stepSeconds * MAP.stepsPerBar,
    noteAt: (t) => {
      const sm = core.sampleTimeline(mine, t); // same sampling and same value -> note rule as scoreWindow()
      return { value: sm.mean, note: core.midiToName(notes[core.valueToIndex(core.norm(sm.mean, lo, hi), notes.length)]), frame: sm.index };
    },
  };
}

export function useJukebox() {
  const st = useRef<{
    Tone?: typeof import("tone");
    engine?: { setMaster: (g: number, t: number) => void; start: (t: number) => void };
    player?: { setSource: (clock: unknown, tl: Timeline, map: unknown) => void; start: () => void; stop: () => void };
    clock?: { currentTime: number; play: () => void; pause: () => void };
    tl?: Timeline;
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
    s.player = Engine.createPlayer(Tone, core, s.engine, TOGGLES);
    s.player!.start();
    return s;
  }, []);

  const play = useCallback(async (place: Place, fromSeconds = 0) => {
    const s = await ensure();
    s.clock?.pause();
    const clock = core.makeClipClock(TIMELINE_SECONDS, () => performance.now() / 1000);
    clock.currentTime = fromSeconds;
    s.player!.setSource(clock, timelineForPlace(s.tl!, place), MAP);
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

  /* For the "how this sound is made" panel: the recipe for a place, and the position of the clip clock in seconds. */
  const recipe = useCallback(async (place: Place) => recipeFor((await ensure()).tl!, place), [ensure]);
  const time = useCallback(() => st.current.clock?.currentTime ?? 0, []);

  useEffect(() => () => { st.current.clock?.pause(); st.current.player?.stop(); }, []);
  return { ensure, play, pause, resume, setVolume, recipe, time };
}
