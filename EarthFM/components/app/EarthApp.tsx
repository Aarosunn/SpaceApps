"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Stage, Scrim } from "@/components/Stage";
import { MapLayer, Plane, HoverCard, PinCursor } from "@/components/MapLayer";
import { MapDot } from "@/components/MapDot";
import { TopLeft } from "@/components/TopLeft";
import { Mixtape, type Stop } from "@/components/Mixtape";
import { NowListening, SoundPlayer } from "@/components/Player";
import { MenuPanel, TopLeftOpen } from "@/components/menu-open/MenuPanel";
import { SharePopover } from "@/components/mixtape-shared/SharePopover";
import { ShowControlsPill } from "@/components/controls-hidden/ShowControlsPill";
import { HalfScrim } from "@/components/controls-hidden/Caption";
import { WordCaption } from "./WordCaption";
import { DatePicker } from "./DatePicker";
import { speak, stopSpeaking } from "@/lib/speech";
import { getPref, setPref } from "@/lib/prefs";
import { ShowPlaylistTab } from "@/components/playlist-hidden/ShowPlaylistTab";
import { asset } from "@/components/asset";
import { findArea, latLonToXy, regionName, surfaceOf, xyToLatLon, type Surface } from "@/lib/geo";
import { legPath, pointOnLeg } from "@/lib/route";
import { TIMELINE_SECONDS, useJukebox, type SoundRecipe } from "@/lib/sonify/useJukebox";
import { LAYERS, type LayerId, type SonMode } from "@/lib/sonify/layers";
import { HowButton, HowPanel } from "@/components/how/HowPanel";
import { FLAGS } from "@/lib/flags";
import { canListen, listenOnce, parseCommand, VOICE_HELP, type Command } from "@/lib/voice";
import { MicButton } from "@/components/voice/MicButton";
import { MapFx, LAYER_RGB } from "@/components/fx/MapFx";
import { VOICE_WORDS } from "@/lib/sonify/instruments";
import { LAYER_VOICE } from "@/lib/sonify/useJukebox";
import s from "./EarthApp.module.css";

const W = 1440, H = 900;
const HOVER_DELAY_MS = 450; // debounce: the card only appears once the cursor rests this long
const TRACK_SECONDS = Math.round(TIMELINE_SECONDS); // one pass of the SVS 3912 timeline per stop
const MAX_STOPS = 7;
const FLIGHT_MS = 2600; // plane flight between songs
const LANDING_GAP_MS = 700; // quiet beat after landing, before the next song starts
const IDLE_CAPTION = FLAGS.voiceControl
  ? 'Click the map to add a place, type its name in the search box, or press V and say "add Amazon".'
  : "To add a place, click the map, or type its name in the search box and press Enter.";
const PROBE_STEP = 30; // px per arrow key on the map (Shift = 3x)

type Place = { name: string; x: number; y: number; surface: Surface };



const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

/* Sample the map image so hover can tell water / ice / land. Mirrors Stage's object-fit: cover. */
function useMapSampler() {
  const ctx = useRef<CanvasRenderingContext2D | null>(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const g = c.getContext("2d", { willReadFrequently: true });
      g?.drawImage(img, 0, 0);
      ctx.current = g;
    };
    img.src = asset("/figma/map.png");
  }, []);
  return useCallback((x: number, y: number): Surface => {
    const g = ctx.current;
    if (!g) return "land";
    const k = Math.max(W / g.canvas.width, H / g.canvas.height);
    const ox = (g.canvas.width * k - W) / 2, oy = (g.canvas.height * k - H) / 2;
    const d = g.getImageData(Math.round((x + ox) / k), Math.round((y + oy) / k), 1, 1).data;
    return surfaceOf([d[0], d[1], d[2]]);
  }, []);
}

/* Fit the fixed 1440x900 artboard into the window, but never shrink it below MIN_SCALE: past that the page scrolls.
   Without the floor, browser zoom did nothing (zooming in shrank the artboard by the same amount). */
const MIN_SCALE = 0.7;
function useFitScale() {
  const [k, setK] = useState(1);
  useEffect(() => {
    const fit = () => setK(Math.max(MIN_SCALE, Math.min(window.innerWidth / W, window.innerHeight / H)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return k;
}

export function EarthApp() {
  const scale = useFitScale();
  const router = useRouter();
  const sample = useMapSampler();
  const jb = useJukebox(); // teammates' Tone.js sonification engine
  const stageRef = useRef<HTMLDivElement>(null);

  const [stops, setStops] = useState<Place[]>([]); // start empty
  const [current, setCurrent] = useState(-1); // -1: nothing from the mixtape played yet
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [playToken, setPlayToken] = useState(0); // bumps whenever a song (re)starts from the top
  const [volume, setVolume] = useState(0.75);
  const [layer, setLayer] = useState<LayerId>("sst"); // which NASA data layer every place plays
  const [captionsOn, setCaptionsOn] = useState(true); // settings: show the caption at the bottom left
  const [voiceOn, setVoiceOn] = useState(true); // settings: read the caption aloud (text to speech)
  const [speaking, setSpeaking] = useState(false); // the voice is talking: the music is turned down meanwhile
  const [mono, setMono] = useState(false); // settings: play both ears the same (for one-sided hearing)
  const [dateIdx, setDateIdx] = useState<number | null>(null); // by area: which date's picture is played (null = the latest)
  const [sonMode, setSonMode] = useState<SonMode>("area"); // "area": sweep the picture; "time": follow its average through the dates
  const [menuOpen, setMenuOpen] = useState(false);
  const [controlsHidden, setControlsHidden] = useState(false);
  const [playlistHidden, setPlaylistHidden] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  // Keyboard exploring: a listening pin moved over the map with the arrow keys (the map has focus).
  const [probe, setProbe] = useState<{ x: number; y: number } | null>(null);
  // Voice commands: listening for one spoken command; `heard` is the text so far.
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const stopListening = useRef<() => void>(() => {});
  const runRef = useRef<(c: Command) => void>(() => {}); // the newest runCommand (it reads fresh state)
  // "How this sound is made" panel: opens for a place when it is added, or with the ? key / button.
  const [how, setHow] = useState<Place | null>(null);
  const [howOpen, setHowOpen] = useState(false);
  const [recipe, setRecipe] = useState<{ key: string; data: SoundRecipe } | null>(null);
  // The voice and mono choices are remembered (and shared with the game).
  useEffect(() => {
    const load = () => {
      if (getPref("earthfm-voice") === "0") setVoiceOn(false);
      if (getPref("earthfm-mono") === "1") setMono(true);
    };
    load();
  }, []);
  // Closing the settings menu removes the focused button: put keyboard focus back on the menu button.
  const menuWasOpen = useRef(false);
  useEffect(() => {
    if (menuWasOpen.current && !menuOpen && document.activeElement === document.body) document.querySelector<HTMLElement>('[aria-label^="Open menu"]')?.focus();
    menuWasOpen.current = menuOpen;
  }, [menuOpen]);
  // Hiding a panel with the keyboard removes the focused button: move focus to the button that brings it back.
  // Only after a key press on that button: after a mouse click, or the B / P shortcuts, Space must still play and pause.
  const refocus = useRef<string | null>(null);
  const viaKeys = useRef(false);
  useEffect(() => {
    const onKeys = () => { viaKeys.current = true; };
    const onPointer = () => { viaKeys.current = false; };
    window.addEventListener("keydown", onKeys, true);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKeys, true);
      window.removeEventListener("pointerdown", onPointer, true);
    };
  }, []);
  const focusAfter = (selector: string) => {
    if (viaKeys.current) refocus.current = selector;
  };
  useEffect(() => {
    if (refocus.current && document.activeElement === document.body) document.querySelector<HTMLElement>(refocus.current)?.focus();
    refocus.current = null;
  });
  // Plane flight between two songs: the only time the plane is on screen.
  type Flight = { from: Place; to: Place; toIdx: number; t: number };
  const [flight, setFlight] = useState<Flight | null>(null);
  const flightRef = useRef<Flight | null>(null);
  useEffect(() => {
    flightRef.current = flight;
  });

  // Debounced hover card (the pin cursor itself is a CSS cursor, see EarthApp.module.css)
  const [hover, setHover] = useState<Place | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nowPlaying: Place | null = current >= 0 ? stops[current] ?? null : null;

  const describe = useCallback(
    (x: number, y: number): Place => {
      const surface = sample(x, y);
      const { lat, lon } = xyToLatLon(x, y);
      const name = regionName(lat, lon, surface);
      return { name, x, y, surface };
    },
    [sample],
  );

  const toStage = (e: React.PointerEvent | React.MouseEvent) => {
    const r = stageRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };

  // Drag a waypoint to a new place. A press that moves less than 5 px is still a click (play that stop).
  const dragged = useRef(false);
  const startDrag = (i: number, e: React.PointerEvent) => {
    if (flightRef.current || e.button !== 0) return;
    const from = stops[i], sx = e.clientX, sy = e.clientY;
    const at = (ev: PointerEvent) => {
      const r = stageRef.current!.getBoundingClientRect();
      return { x: Math.min(W, Math.max(0, ((ev.clientX - r.left) * W) / r.width)), y: Math.min(H, Math.max(0, ((ev.clientY - r.top) * H) / r.height)) };
    };
    const move = (ev: PointerEvent) => {
      if (!dragged.current && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
      dragged.current = true;
      const p = at(ev);
      setStops((list) => list.map((st, j) => (j === i ? { ...st, x: p.x, y: p.y } : st)));
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!dragged.current) return;
      setTimeout(() => (dragged.current = false), 0); // let the click that follows the release be ignored
      const p = at(ev), place = describe(p.x, p.y);
      if (stops.some((st, j) => j !== i && st.name === place.name)) {
        setStops((list) => list.map((st, j) => (j === i ? from : st))); // one stop per area: put it back
        setNotice(`${place.name} is already in the mixtape.`);
        return;
      }
      setStops((list) => list.map((st, j) => (j === i ? place : st)));
      setNotice(`Moved place ${i + 1} to ${place.name}.`);
      if (i === current) setPlayToken((k) => k + 1); // it is playing: carry on from the new place
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onMapMove = (e: React.PointerEvent) => {
    const p = toStage(e);
    setHover(null); // moving: no info
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const place = describe(p.x, p.y);
      setHover(place);
    }, HOVER_DELAY_MS);
  };
  const onMapLeave = () => {
    if (timer.current) clearTimeout(timer.current);
    setHover(null);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const playStop = useCallback((i: number) => {
    setCurrent(i);
    setElapsed(0);
    setPlayToken((k) => k + 1);
    setPlaying(true);
  }, []);
  // Move to stop i: fly there from the current stop (plane + quiet gap), or start directly if nothing is playing.
  const goTo = useCallback(
    (i: number) => {
      const to = stops[i];
      if (!to || flightRef.current) return;
      const from = current >= 0 ? stops[current] : null;
      if (!from || i === current) return playStop(i);
      setPlaying(false);
      setNotice(null); // the flight caption takes over
      setFlight({ from, to, toIdx: i, t: 0 });
    },
    [stops, current, playStop],
  );
  const next = useCallback(() => {
    if (!stops.length) return;
    goTo((current + 1) % stops.length);
  }, [goTo, current, stops.length]);
  const prev = useCallback(() => {
    if (elapsed > 3 || !stops.length) {
      setElapsed(0);
      setPlayToken((k) => k + 1);
      return;
    }
    goTo((current - 1 + stops.length) % stops.length);
  }, [elapsed, goTo, current, stops.length]);
  const togglePlay = useCallback(() => {
    if (nowPlaying && !flight) setPlaying((p) => !p);
  }, [nowPlaying, flight]);

  // Animate the flight, then land, pause briefly, and start the next song.
  const flightKey = flight ? `${flight.from.name}>${flight.to.name}` : null;
  useEffect(() => {
    if (!flightKey) return;
    const start = performance.now();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches; // no flight animation: land at once
    let raf = 0;
    let gap: ReturnType<typeof setTimeout> | undefined;
    const step = (now: number) => {
      const t = still ? 1 : Math.min(1, (now - start) / FLIGHT_MS);
      setFlight((f) => f && { ...f, t });
      if (t < 1) raf = requestAnimationFrame(step);
      else
        gap = setTimeout(() => {
          const f = flightRef.current;
          setFlight(null);
          if (f) playStop(f.toIdx);
        }, LANDING_GAP_MS);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(gap);
    };
  }, [flightKey, playStop]);

  // Drive the sonification engine from the player state. A new playToken restarts the song from the top;
  // otherwise play/pause just resumes or pauses the same clip clock. Flights are silent (the quiet gap between songs).
  const audioKey = nowPlaying && !flight ? `${nowPlaying.name}#${playToken}#${layer}#${sonMode}#${dateIdx}` : null;
  const audioState = useRef({ key: null as string | null, place: nowPlaying, elapsed });
  useEffect(() => {
    audioState.current.place = nowPlaying;
    audioState.current.elapsed = elapsed;
  });
  useEffect(() => {
    const a = audioState.current;
    if (!audioKey || !playing || !a.place) {
      jb.pause();
      return;
    }
    if (a.key === audioKey) {
      jb.resume();
      return;
    }
    // Only the date changed (the key's last part): carry on from the exact position of the running clock, so the sweep
    // does not jump back. `elapsed` is the display's whole-second counter, good enough for starting a new song.
    const songOf = (key: string) => key.slice(0, key.lastIndexOf("#"));
    const from = a.key !== null && songOf(a.key) === songOf(audioKey) ? jb.time() : a.elapsed;
    a.key = audioKey;
    const { lat, lon } = xyToLatLon(a.place.x, a.place.y);
    void jb.play({ lat, lon }, layer, sonMode, from, dateIdx);
  }, [audioKey, playing, jb, layer, sonMode, dateIdx]);
  const { setVolume: setEngineVolume, setMono: setEngineMono } = jb; // stable; `jb` itself is a new object every render
  useEffect(() => {
    setEngineVolume(listening ? volume * 0.12 : speaking ? volume * 0.3 : volume); // duck the music under the voice, and more so for the microphone
  }, [volume, speaking, listening, setEngineVolume]);
  useEffect(() => {
    setEngineMono(mono);
  }, [mono, setEngineMono]);

  const removeStop = useCallback(
    (i: number) => {
      const name = stops[i]?.name;
      setFlight(null);
      setStops((list) => list.filter((_, j) => j !== i));
      if (i === current) {
        setCurrent(-1);
        setPlaying(false);
        setElapsed(0);
      } else if (i < current) setCurrent((c) => c - 1);
      if (name) setNotice(`Removed ${name}.`);
    },
    [stops, current],
  );

  const onMapClick = (e: React.MouseEvent) => {
    const p = toStage(e);
    const place = describe(p.x, p.y);
    const i = stops.findIndex((st) => st.name === place.name);
    if (i >= 0) goTo(i);
    else addPlace(place);
  };

  const addPlace = useCallback(
    (place: Place) => {
      if (stops.length >= MAX_STOPS) {
        setNotice(`The mixtape is full (${MAX_STOPS} places max).`);
        return;
      }
      if (stops.some((st) => st.name === place.name)) {
        setNotice(`${place.name} is already in the mixtape.`);
        return;
      }
      setStops((list) => [...list, place]);
      setNotice(`Added ${place.name} to the mixtape.`);
      setHow(place); // show how this place's sound is generated
      // The panel animates for the whole song: with reduced motion it opens only on request (? key or button).
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setHowOpen(true);
      if (current < 0) playStop(stops.length); // nothing is playing: start the new place (otherwise click its dot to hear it)
    },
    [stops, current, playStop],
  );

  // The song (data + notes) for the place shown on the panel and in the caption: the one playing now, else the one
  // last added. It is built by the same function the player uses, for the current layer and mode.
  const shown: Place | null = nowPlaying ?? how;
  const songKey = shown ? `${shown.name}|${Math.round(shown.x)},${Math.round(shown.y)}|${layer}|${sonMode}|${dateIdx}` : null;
  const loadRecipe = jb.recipe; // stable; `jb` itself is a new object every render
  useEffect(() => {
    if (!shown || !songKey) return;
    let stale = false;
    const { lat, lon } = xyToLatLon(shown.x, shown.y);
    loadRecipe({ lat, lon }, layer, sonMode, dateIdx)
      .then((data) => !stale && setRecipe({ key: songKey, data }))
      .catch((e: Error) => !stale && setNotice(e.message));
    return () => {
      stale = true;
    };
  }, [songKey]); // eslint-disable-line react-hooks/exhaustive-deps -- songKey covers shown, layer, sonMode and dateIdx
  // While a newly picked date loads, keep the previous date's song for the same place, layer and mode on screen,
  // so the caption, the panel and the timeline do not flash "Loading" on every step along the timeline.
  const sameButDate = (a: string, b: string) => a.slice(0, a.lastIndexOf("|")) === b.slice(0, b.lastIndexOf("|"));
  const song = recipe && songKey && (recipe.key === songKey || sameButDate(recipe.key, songKey)) ? recipe.data : null;
  // The timeline's dates and bars. While a newly picked date loads, the previous song for this layer still supplies
  // them, so the timeline (and the keyboard focus on it) does not blink away between two dates.
  const shownInMixtape = !!shown && stops.some((st) => st.name === shown.name); // not a place that was removed
  const timelineOf = sonMode === "area" && shownInMixtape && recipe && recipe.data.date >= 0 && recipe.data.layer.id === layer ? recipe.data : null;
  // Jump to a point in the song (click on the progress bar): restart the clip clock from there.
  const seek = useCallback(
    (fraction: number) => {
      if (!nowPlaying || flight) return;
      setElapsed(Math.min(TRACK_SECONDS - 1, Math.max(0, Math.floor(fraction * TRACK_SECONDS))));
      setPlayToken((k) => k + 1);
      setPlaying(true);
    },
    [nowPlaying, flight],
  );
  const toggleHow = useCallback(() => {
    if (howOpen) return setHowOpen(false);
    const target = nowPlaying ?? how ?? stops[stops.length - 1] ?? null;
    if (!target) return setNotice("Add a place first: click the map or search for one.");
    setHow(target);
    setHowOpen(true);
  }, [howOpen, nowPlaying, how, stops]);

  // Playback clock: advances while playing; at the end of a track, fly to the next stop.
  const tick = useRef<() => void>(() => {});
  useEffect(() => {
    tick.current = () => {
      if (elapsed + 1 < TRACK_SECONDS) return setElapsed(elapsed + 1);
      if (stops.length > 1) return next(); // fly on to the next stop (plane + quiet gap)
      setPlaying(false); // a lone place just ends
      setElapsed(0);
    };
  });
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => tick.current(), 1000);
    return () => clearInterval(id);
  }, [playing]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), Math.max(5000, notice.split(" ").length * 700)); // long enough to read
    return () => clearTimeout(id);
  }, [notice]);

  // Clicking anywhere outside the popover (or its Share button) closes it.
  useEffect(() => {
    if (!shareOpen) return;
    const close = (e: PointerEvent) => {
      const t = e.target as Element;
      if (!t.closest("[data-share-popover], [data-share-anchor]")) setShareOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [shareOpen]);

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?mix=my-mixtape`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setNotice("Copy failed: select the link and copy it manually.");
    }
  };
  const toggleShare = () => {
    setShareOpen((o) => !o);
    if (!shareOpen) void copyLink();
  };

  const search = useCallback(() => {
    if (!query.trim()) return;
    if (FLAGS.voiceControl) {
      // the search box also takes the voice commands, typed: "next", "wildfires", "remove last"...
      const cmd = parseCommand(query);
      if (cmd.type !== "unknown") {
        setQuery("");
        return runRef.current(cmd); // "take me to the Sahara" and plain "Sahara" both end up as { add }
      }
    }
    const hit = findArea(query);
    if (!hit) {
      setNotice(`No place called "${query}" yet.`);
      return;
    }
    setQuery(""); // ready for the next name: keyboard users add several places in a row
    const { x, y } = latLonToXy(hit.lat, hit.lon);
    const surface: Surface = hit.water ? "water" : "land";
    const place = { name: hit.name, x, y, surface };
    const i = stops.findIndex((st) => st.name === place.name);
    if (i >= 0) playStop(i);
    else addPlace(place);
  }, [query, stops, playStop, addPlace]);

  // ---- voice / typed commands ----
  const runCommand = (cmd: Command) => {
    const lbl = LAYERS[layer].label;
    switch (cmd.type) {
      case "play":
        if (!stops.length) return setNotice('No places yet. Say "add Amazon", or click the map.');
        if (current < 0) return playStop(0);
        setPlaying(true);
        return setNotice(`Playing ${stops[current].name}.`);
      case "pause": setPlaying(false); return setNotice("Paused.");
      case "next": if (!stops.length) return setNotice("No places yet."); return next();
      case "prev": return prev();
      case "add": {
        const hit = findArea(cmd.place);
        if (!hit) return setNotice(`I don't know a place called ${cmd.place}.`);
        const { x, y } = latLonToXy(hit.lat, hit.lon);
        const place: Place = { name: hit.name, x, y, surface: hit.water ? "water" : "land" };
        const i = stops.findIndex((st) => st.name === place.name);
        return i >= 0 ? goTo(i) : addPlace(place);
      }
      case "remove": {
        const i = cmd.place === null ? stops.length - 1 : stops.findIndex((st) => st.name.toLowerCase().includes(cmd.place!));
        return i >= 0 ? removeStop(i) : setNotice(cmd.place ? `${cmd.place} is not in the mixtape.` : "The mixtape is empty.");
      }
      case "clear":
        setFlight(null); setStops([]); setCurrent(-1); setPlaying(false); setElapsed(0);
        return setNotice("Mixtape cleared.");
      case "layer": setLayer(cmd.layer); return setNotice(`Now playing ${LAYERS[cmd.layer].label.toLowerCase()}${FLAGS.instruments ? `: ${VOICE_WORDS[LAYER_VOICE[cmd.layer]]}` : ""}.`);
      case "mode": setSonMode(cmd.mode); return setNotice(cmd.mode === "area" ? "Reading the picture square by square." : "Following the average through time.");
      case "volume": {
        const v = Math.max(0, Math.min(1, +(volume + cmd.delta).toFixed(2)));
        setVolume(v);
        return setNotice(`Volume ${Math.round(v * 100)} percent.`);
      }
      case "status":
        return setNotice(nowPlaying ? `${playing ? "Playing" : "Paused on"} ${nowPlaying.name}, ${lbl}. ${song?.caption ?? ""} Place ${current + 1} of ${stops.length}.` : stops.length ? `Nothing is playing. ${stops.length} places in the mixtape.` : "Nothing yet. Add a place to begin.");
      case "help": return setNotice(VOICE_HELP);
      case "how": return toggleHow();
      case "game": return router.push("/play");
      case "menu": return setMenuOpen(cmd.open);
      default: return setNotice(`I heard "${cmd.text}". Try: add Amazon, next, wildfires, or help.`);
    }
  };
  useEffect(() => {
    runRef.current = runCommand;
  });

  const toggleListening = useCallback(() => {
    if (listening) {
      stopListening.current();
      setListening(false);
      return;
    }
    if (!canListen()) return setNotice("Voice commands need Chrome, Edge or Safari. You can type the same commands in the search box.");
    stopSpeaking(); // never let our own voice talk into the microphone
    setHeard("");
    setListening(true);
    stopListening.current = listenOnce(setHeard, (alts, error) => {
      setListening(false);
      if (error === "not-allowed" || error === "service-not-allowed") return setNotice("The microphone is blocked. Allow it in the address bar, or type commands in the search box.");
      if (!alts.length) return setNotice("I didn't hear anything. Press V and try again.");
      // take the first alternative that makes sense
      const cmds = alts.map(parseCommand);
      runRef.current(cmds.find((c) => c.type !== "unknown") ?? cmds[0]);
    });
  }, [listening]);
  useEffect(() => () => stopListening.current(), []);

  // ---- keyboard exploring of the map ----
  const probeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMapKey = (e: React.KeyboardEvent) => {
    const d = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, number[]>)[e.key];
    const at = probe ?? { x: W / 2, y: H / 2 };
    if (d) {
      e.preventDefault();
      e.stopPropagation();
      const k = PROBE_STEP * (e.shiftKey ? 3 : 1);
      const p = { x: Math.min(W - 10, Math.max(10, at.x + d[0] * k)), y: Math.min(H - 10, Math.max(60, at.y + d[1] * k)) };
      setProbe(p);
      setHover(null); // moving: no info, as with the mouse
      if (probeTimer.current) clearTimeout(probeTimer.current);
      probeTimer.current = setTimeout(() => {
        const place = describe(p.x, p.y);
        setHover(place);
        setNotice(`${place.name}. ${stops.some((st) => st.name === place.name) ? "In your mixtape: Enter plays it." : "Enter adds it."}`);
      }, HOVER_DELAY_MS);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const place = describe(at.x, at.y);
      const i = stops.findIndex((st) => st.name === place.name);
      if (i >= 0) goTo(i);
      else addPlace(place);
    }
  };
  useEffect(() => () => { if (probeTimer.current) clearTimeout(probeTimer.current); }, []);

  // Keyboard map (matches the key hints in the Figma labels).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      // Leave browser and screen-reader shortcuts (Ctrl+P, Alt+M...) alone, and stay quiet behind the help pop-up.
      if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector('[aria-modal="true"]')) return;
      if (t.tagName === "INPUT" && (t as HTMLInputElement).type !== "radio") {
        if (e.key === "Escape") t.blur();
        if (e.key === "Enter" && t.getAttribute("placeholder")?.startsWith("Search")) search();
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "m") setMenuOpen((o) => !o);
      else if (k === "b") setControlsHidden((h) => !h);
      else if (k === "p") setPlaylistHidden((h) => !h);
      else if (k === "n") next();
      else if (k === "escape") {
        setMenuOpen(false);
        setShareOpen(false);
      }
      else if (k === "backspace") { if (stops.length) removeStop(stops.length - 1); } // undo the last place added
      else if (k === "?") toggleHow();
      else if (k === "v" && FLAGS.voiceControl) toggleListening();
      else if (k === " " && t.tagName !== "BUTTON" && t.tagName !== "INPUT") {
        e.preventDefault();
        togglePlay();
      } else return;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, search, togglePlay, toggleHow, toggleListening, removeStop, stops.length]);

  // ---- derived view data
  const activeIdx = current;
  // Plane is only shown while flying between songs. Ease in/out; nose follows the arc (SVG nose points NE = -45deg).
  const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const plane = flight && pointOnLeg(flight.from, flight.to, ease(flight.t));
  const fromIdx = flight ? stops.indexOf(flight.from) : -1;
  const flyingLeg = flight && Math.abs(fromIdx - flight.toIdx) === 1 ? Math.min(fromIdx, flight.toIdx) : -1;
  const layerLabel = LAYERS[layer].label;
  const mixStops: Stop[] = stops.map((st, i) => ({
    n: i + 1,
    name: st.name,
    active: flight ? i === flight.toIdx : i === activeIdx,
    sub:
      flight && i === flight.toIdx
        ? `${layerLabel} · flying there now`
        : flight && i === fromIdx
          ? `${layerLabel} · played`
          : i === activeIdx
        ? `${layerLabel} · ${playing ? "playing now" : "paused"}`
        : i < activeIdx
          ? `${layerLabel} · played`
          : i === activeIdx + 1
            ? `${layerLabel} · next, flying there`
            : `${layerLabel} · then, flying there`,
  }));
  const meta = `Mixtape · ${stops.length} ${stops.length === 1 ? "place" : "places"} · ${mmss(stops.length * 164)}`; // Figma: 3 stops = 8:12 (2:44 per stop incl. travel)
  const caption =
    (listening ? (heard ? `Heard: "${heard}"` : 'Listening… try "add Amazon", "next" or "wildfires".') : null) ??
    notice ??
    (flight ? `Flying to ${flight.to.name}…` : nowPlaying ? (song ? song.caption : `Loading ${layerLabel.toLowerCase()}…`) : IDLE_CAPTION);
  // Text to speech: read each new message aloud once. A notice ("Added X") is read when it appears; the line under it
  // (the song, the flight or the opening hint) is read when it changes, and is not repeated after every notice.
  // A song line starts with the place and the data, which sighted users read in the bar above the player.
  const songLine = !flight && nowPlaying && song ? `${nowPlaying.name}, ${layerLabel}${song.date >= 0 ? `, ${song.allDates[song.date]}` : ""}. ${song.caption}` : null;
  const baseLine = songLine ?? (flight ? `Flying to ${flight.to.name}` : nowPlaying ? null : IDLE_CAPTION); // null while loading
  const said = useRef<{ notice: string | null; base: string | null }>({ notice: null, base: null });
  useEffect(() => {
    const s = said.current;
    if (!voiceOn) {
      s.notice = s.base = null;
      return stopSpeaking();
    }
    if (listening) return; // the microphone is open: stay silent
    const line = notice ?? baseLine;
    if (!line || line === (notice ? s.notice : s.base)) {
      if (!notice) s.notice = null;
      return;
    }
    if (notice) s.notice = notice;
    else {
      s.notice = null;
      s.base = line;
    }
    speak(line, () => setSpeaking(true), () => setSpeaking(false));
  }, [notice, baseLine, voiceOn, listening]);
  useEffect(() => () => { stopSpeaking(); said.current = { notice: null, base: null }; }, []); // leaving the page (e.g. to the game) stops the voice
  // "Place · layer · first date – last date" (the dates the song runs through)
  // by area: the one date being played; by time: the dates the song runs through
  const span = !song ? "" : song.date >= 0 ? ` · ${song.allDates[song.date]}` : ` · ${song.dates[0]} – ${song.dates[1]}`;
  const nowText = flight ? `Up next: ${flight.to.name} · ${layerLabel}` : nowPlaying ? `${nowPlaying.name} · ${layerLabel}${span}` : "Now listening: nothing yet";
  // The vehicle rides the current leg (current stop -> next) as the track plays; boat if the next stop is at sea.
  const legOpacity = (i: number) =>
    flight ? (i === flyingLeg ? 1 : 0.3) : activeIdx < 0 ? 0.45 : i === activeIdx ? 1 : i < activeIdx ? 0.25 : 0.45; // current leg bright, upcoming dim, played faint

  // Hover card sits down-right of the pin tip (Figma: tip 83.8,431.6 -> card 107,459), flipped near edges.
  const card = hover && {
    left: hover.x + 23 + 260 > W ? hover.x - 283 : hover.x + 23,
    top: hover.y + 27 + 72 > H ? hover.y - 99 : hover.y + 27,
  };

  return (
    <div className={`${s.viewport} ${FLAGS.visualFx ? s.fx : ""}`} style={{ "--layer-rgb": LAYER_RGB[layer] } as React.CSSProperties} onPointerDownCapture={() => void jb.ensure()} onKeyDownCapture={() => void jb.ensure()}>
      <div ref={stageRef} className={s.scaler} style={{ width: W * scale, height: H * scale }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0", width: W, height: H }}>
          <Stage>
            <MapLayer>
              {/* Map hit area: pin cursor + debounced area info. Dots and panels sit above it. */}
              {FLAGS.mapKeyboard ? (
                <div
                  className={s.hit}
                  onPointerMove={onMapMove}
                  onPointerLeave={onMapLeave}
                  onClick={onMapClick}
                  tabIndex={0}
                  role="application"
                  aria-label="World map. Arrow keys move the listening pin (hold Shift for bigger steps). Pause to hear where you are. Enter adds that place."
                  onKeyDown={onMapKey}
                  onFocus={(e) => e.target.matches(":focus-visible") && setProbe((p) => p ?? { x: W / 2, y: H / 2 })}
                  onBlur={() => { setProbe(null); setHover(null); }}
                />
              ) : (
                <div className={s.hit} onPointerMove={onMapMove} onPointerLeave={onMapLeave} onClick={onMapClick} aria-hidden="true" />
              )}
              {FLAGS.visualFx && nowPlaying && <MapFx song={song} live={playing && !flight} x={nowPlaying.x} y={nowPlaying.y} getTime={jb.time} getLevel={jb.level} />}
              <svg className={s.routes} width={W} height={H} aria-hidden="true">
                <defs>
                  <filter id="route-shadow" x="-5%" y="-5%" width="110%" height="110%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.35" />
                  </filter>
                </defs>
                {stops.slice(1).map((b, i) => (
                  <path key={`${stops[i].name}>${b.name}`} d={legPath(stops[i], b)} className={s.leg} style={{ opacity: legOpacity(i) }} />
                ))}
                {flight && flyingLeg < 0 && <path d={legPath(flight.from, flight.to)} className={s.leg} />}
              </svg>
              {plane && <Plane left={plane.x - 26.44} top={plane.y - 26.44} rotate={plane.heading + 45} />}
              {stops.map((st, i) => (
                <MapDot
                  key={i}
                  n={i + 1}
                  kind={i === activeIdx ? "Playing" : "Queued"}
                  left={st.x - 22}
                  top={st.y - 22}
                  label={`Place ${i + 1}: ${st.name}, ${layerLabel}${i === activeIdx ? ", playing" : ""}. Enter plays it, arrow keys move it.`}
                  onKeyDown={(e) => {
                    // keyboard version of dragging: the arrow keys move the place in small steps
                    const d = ({ ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] } as Record<string, number[]>)[e.key];
                    if (!d || flightRef.current) return;
                    e.preventDefault();
                    const place = describe(Math.min(W, Math.max(0, st.x + d[0])), Math.min(H, Math.max(0, st.y + d[1])));
                    if (stops.some((o, j) => j !== i && o.name === place.name)) return setNotice(`${place.name} is already in the mixtape.`);
                    setStops((l) => l.map((o, j) => (j === i ? place : o)));
                    if (place.name !== st.name) setNotice(`Moved place ${i + 1} to ${place.name}.`);
                    if (i === current && place.name !== st.name) setPlayToken((k) => k + 1);
                  }}
                  onClick={() => !dragged.current && goTo(i)}
                  onDragStart={(e) => startDrag(i, e)}
                />
              ))}
              {probe && <PinCursor left={probe.x - 13.5} top={probe.y - 8.4} />}
              {hover && card && <HoverCard left={card.left} top={card.top} title={`${hover.name} · ${layerLabel}`} hint="Click to add to mixtape" />}
            </MapLayer>

            {controlsHidden ? <HalfScrim /> : <Scrim />}
            {/* Captions off still leaves the text for screen readers, unless the voice is already reading it. */}
            {captionsOn ? <WordCaption text={caption} spoken={voiceOn} /> : !voiceOn && <span className="sr-only" aria-live="polite">{caption}</span>}
            {/* The timeline: only by area, where the song is one date's picture. By time already plays every date. */}
            {!controlsHidden && timelineOf && (
              <DatePicker layer={layerLabel} dates={timelineOf.allDates} levels={timelineOf.levels} index={Math.min(timelineOf.allDates.length - 1, dateIdx ?? timelineOf.date)} onPick={setDateIdx} />
            )}
            {!controlsHidden && (
              <>
                <NowListening text={nowText} onHide={() => { focusAfter('[aria-label^="Show controls"]'); setControlsHidden(true); }} />
                <SoundPlayer
                  time={`${mmss(elapsed)} / ${mmss(TRACK_SECONDS)}`}
                  progress={elapsed / TRACK_SECONDS}
                  onSeek={seek}
                  getSpectrum={FLAGS.visualFx ? jb.spectrum : undefined}
                  playing={playing}
                  volume={volume}
                  onPlayPause={togglePlay}
                  onPrev={prev}
                  onNext={next}
                  onVolume={setVolume}
                />
              </>
            )}
            {controlsHidden && (
              <ShowControlsPill
                title={nowPlaying ? `${nowPlaying.name} · ${layerLabel}` : "Nothing playing"}
                playing={playing}
                onPlayPause={togglePlay}
                onNext={next}
                onShow={() => { focusAfter('[aria-label^="Hide controls"]'); setControlsHidden(false); }}
              />
            )}

            {playlistHidden ? (
              <ShowPlaylistTab count={stops.length} onShow={() => { focusAfter('[aria-label^="Hide playlist"]'); setPlaylistHidden(false); }} />
            ) : (
              <Mixtape
                compact
                title="My mixtape"
                meta={meta}
                stops={mixStops}
                emptyText="No places yet. Click the map or search for one."
                addDisabled={stops.length >= MAX_STOPS}
                onHide={() => { focusAfter('[aria-label^="Show playlist"]'); setPlaylistHidden(true); }}
                onSelect={(n) => goTo(n - 1)}
                onRemove={(n) => { focusAfter('[aria-label^="Hide playlist"]'); removeStop(n - 1); }}
                onAdd={() => {
                  // a way in without a mouse: go to the search box, where typing a name and Enter adds the place
                  document.querySelector<HTMLInputElement>('input[placeholder^="Search"]')?.focus();
                  setNotice("Type a place name, like Amazon or Pacific, then press Enter. Or click the map.");
                }}
                onShare={toggleShare}
                shareOpen={shareOpen}
              >
                {shareOpen && (
                  <SharePopover anchored url="earthjukebox.app/my-mixtape" copied={copied} onCopy={copyLink} saved={saved} onSave={() => setSaved(true)} onClose={() => setShareOpen(false)} />
                )}
              </Mixtape>
            )}

            {!menuOpen && howOpen && shown && (
              <HowPanel placeName={shown.name} recipe={song} live={!flight && nowPlaying?.name === shown.name} getTime={jb.time} onClose={() => { focusAfter('[aria-label="Show how this sound is made"]'); setHowOpen(false); }} />
            )}
            {!menuOpen && !howOpen && (stops.length > 0 || nowPlaying) && <HowButton onClick={toggleHow} />}

            {FLAGS.voiceControl && <MicButton listening={listening} onClick={toggleListening} left={341} top={24} />}
            {menuOpen ? (
              <>
                <MenuPanel onClose={() => setMenuOpen(false)} onMode={(m) => m === "play" && router.push("/play")} layer={layer} onLayer={(l) => { setLayer(l); setDateIdx(null); /* each layer has its own dates */ }} sonMode={sonMode} onSonMode={setSonMode} captions={captionsOn} onCaptions={setCaptionsOn} voice={voiceOn} onVoice={(on) => { setVoiceOn(on); setPref("earthfm-voice", on ? "1" : "0"); }} mono={mono} onMono={(on) => { setMono(on); setPref("earthfm-mono", on ? "1" : "0"); }} />
                <TopLeftOpen onMenu={() => setMenuOpen(false)} query={query} onQuery={setQuery} />
              </>
            ) : (
              <TopLeft onMenu={() => setMenuOpen(true)} query={query} onQuery={setQuery} />
            )}
          </Stage>
        </div>
      </div>
    </div>
  );
}
