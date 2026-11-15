"use client";

/* Globe <-> teammates' sonification engine (spaceapps-2026/sonification/recipes-browser).
   Musical decisions live in sonify-core.js; jukebox-engine.js builds the Tone.js graph and follows a media clock.
   Here we only: load the SVS 3912 timeline, make a per-place version of it, and drive a clip clock from the player UI. */
import { registerAudioContext } from "@/lib/settings";
import { useCallback, useEffect, useRef } from "react";
import core from "./sonify-core.js";
import Engine from "./jukebox-engine.js";
import { asset } from "@/components/asset";

export const TIMELINE_SECONDS = 68.6; // SVS 3912 timeline: 344 frames, t = 0..68.6 s

type Timeline = { meta: { grid: [number, number] } & Record<string, unknown>; frames: { t: number; mean: number; grid: number[] }[] };
type Place = { lat: number; lon: number; surface: "water" | "ice" | "land" };

const MAP = { ...core.DEFAULT_MAPPING };
const TOGGLES = { pad: true, lead: true, ref: true, drum: true };

/* The timeline grid covers the whole flat SST map: rows north -> south (90..-90), cols west -> east (-180..180).
   For a place at sea, the lead melody follows that place's cell instead of the whole-view mean.
   ponytail: land and ice have no data timeline yet, so they hear the whole-ocean mean (still real SVS 3912 data). */
export function timelineForPlace(tl: Timeline, p: Place): Timeline {
  const [rows, cols] = tl.meta.grid;
  const r = Math.min(rows - 1, Math.max(0, Math.floor(((90 - p.lat) / 180) * rows)));
  const c = Math.min(cols - 1, Math.max(0, Math.floor(((p.lon + 180) / 360) * cols)));
  const k = r * cols + c;
  const hasCell = p.surface === "water" && tl.frames.some((f) => f.grid[k] > 0.02);
  if (!hasCell) return tl;
  return { ...tl, frames: tl.frames.map((f) => ({ ...f, mean: f.grid[k] })) };
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
    const [Tone, tl] = await Promise.all([import("tone"), fetch(asset("/sonify/3912.json")).then((r) => r.json())]);
    await Tone.start();
    registerAudioContext(Tone.getContext().rawContext as unknown as { destination: AudioDestinationNode }); // Mono audio setting
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

  useEffect(() => () => { st.current.clock?.pause(); st.current.player?.stop(); }, []);
  return { ensure, play, pause, resume, setVolume };
}
