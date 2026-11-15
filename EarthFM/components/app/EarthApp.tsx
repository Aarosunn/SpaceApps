"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Stage, Scrim } from "@/components/Stage";
import { MapLayer, Plane, HoverCard } from "@/components/MapLayer";
import { MapDot } from "@/components/MapDot";
import { TopLeft } from "@/components/TopLeft";
import { Mixtape, type Stop } from "@/components/Mixtape";
import { NowListening, SoundPlayer } from "@/components/Player";
import { YearPicker } from "@/components/YearPicker";
import { MenuPanel, TopLeftOpen } from "@/components/menu-open/MenuPanel";
import { SharePopover } from "@/components/mixtape-shared/SharePopover";
import { ShowControlsPill } from "@/components/controls-hidden/ShowControlsPill";
import { HalfScrim } from "@/components/controls-hidden/Caption";
import { WordCaption } from "./WordCaption";
import { isLongTalk, setVoiceEnabled, speakLong, speakNow, stopSpeaking, useSpokenCaption, useVoiceEnabled } from "@/lib/voice";
import { HELP, INTRO, VOICE_ON } from "@/lib/guide";
import { useSetting } from "@/lib/settings";
import { ShowPlaylistTab } from "@/components/playlist-hidden/ShowPlaylistTab";
import { asset } from "@/components/asset";
import { findArea, latLonToXy, layerFor, regionName, surfaceOf, xyToLatLon, type Surface } from "@/lib/geo";
import { legPath, pointOnLeg } from "@/lib/route";
import { TIMELINE_SECONDS, useJukebox } from "@/lib/sonify/useJukebox";
import s from "./EarthApp.module.css";

const W = 1440, H = 900;
const HOVER_DELAY_MS = 450; // debounce: the card only appears once the cursor rests this long
const TRACK_SECONDS = Math.round(TIMELINE_SECONDS); // one pass of the SVS 3912 timeline per stop
const LAND_LAYER = "Wildfires";
const LAND_SHORT = "Fires";
const MAX_STOPS = 7;
const FLIGHT_MS = 2600; // plane flight between songs
const LANDING_GAP_MS = 700; // quiet beat after landing, before the next song starts
const IDLE_CAPTION = "Hover the map to explore. Click a place to listen, + to add it.";

type Place = { name: string; layer: string; x: number; y: number; surface: Surface };


const CAPTIONS: Record<string, string> = {
  Fires: "Fast crackle, heavy fire. Bass rising.",
  "Sea heat": "Warm swell, slow pads. Pitch climbing.",
  "Sea ice": "Thin chimes, thinning out as the ice retreats.",
};

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

/* Fit the fixed 1440x900 artboard into the window. */
function useFitScale() {
  const [k, setK] = useState(1);
  useEffect(() => {
    const fit = () => setK(Math.min(window.innerWidth / W, window.innerHeight / H));
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
  const [preview, setPreview] = useState<Place | null>(null); // a clicked map area that is not in the mixtape
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [playToken, setPlayToken] = useState(0); // bumps whenever a song (re)starts from the top
  const [volume, setVolume] = useState(0.75);
  const [year, setYear] = useState(2019);
  const [menuOpen, setMenuOpen] = useState(false);
  const [controlsHidden, setControlsHidden] = useState(false);
  const [playlistHidden, setPlaylistHidden] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [pickMode, setPickMode] = useState(false); // "Add place" with nothing hovered: next map click adds
  // Plane flight between two songs: the only time the plane is on screen.
  type Flight = { from: Place; to: Place; toIdx: number; t: number };
  const [flight, setFlight] = useState<Flight | null>(null);
  const flightRef = useRef<Flight | null>(null);
  useEffect(() => {
    flightRef.current = flight;
  });
  const lastHover = useRef<Place | null>(null); // the area the info card last described

  // Debounced hover card (the pin cursor itself is a CSS cursor, see EarthApp.module.css)
  const [hover, setHover] = useState<Place | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nowPlaying: Place | null = preview ?? (current >= 0 ? stops[current] ?? null : null);

  const describe = useCallback(
    (x: number, y: number): Place => {
      const surface = sample(x, y);
      const { lat, lon } = xyToLatLon(x, y);
      const name = regionName(lat, lon, surface);
      return { name, layer: layerFor(surface, name, LAND_SHORT), x, y, surface };
    },
    [sample],
  );

  const toStage = (e: React.PointerEvent | React.MouseEvent) => {
    const r = stageRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };

  const onMapMove = (e: React.PointerEvent) => {
    const p = toStage(e);
    cursor.current = null; // the mouse takes over from the keyboard explore cursor
    setHover(null); // moving: no info
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const place = describe(p.x, p.y);
      lastHover.current = place;
      setHover(place);
    }, HOVER_DELAY_MS);
  };
  const onMapLeave = () => {
    if (timer.current) clearTimeout(timer.current);
    setHover(null);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const playStop = useCallback((i: number) => {
    setPreview(null);
    setCurrent(i);
    setElapsed(0);
    setPlayToken((k) => k + 1);
    setPlaying(true);
  }, []);
  const playPreview = useCallback((place: Place) => {
    setPreview(place);
    setElapsed(0);
    setPlayToken((k) => k + 1);
    setPlaying(true);
  }, []);
  // Move to stop i: fly there from the current stop (plane + quiet gap), or start directly if nothing is playing.
  const goTo = useCallback(
    (i: number) => {
      const to = stops[i];
      if (!to || flightRef.current) return;
      const from = !preview && current >= 0 ? stops[current] : null;
      if (!from || i === current) return playStop(i);
      setPlaying(false);
      setNotice(null); // the flight caption takes over
      setFlight({ from, to, toIdx: i, t: 0 });
    },
    [stops, preview, current, playStop],
  );
  const next = useCallback(() => {
    if (!stops.length) return;
    goTo(preview && current >= 0 ? current : (current + 1) % stops.length);
  }, [goTo, current, stops.length, preview]);
  const prev = useCallback(() => {
    if (elapsed > 3 || !stops.length) {
      setElapsed(0);
      setPlayToken((k) => k + 1);
      return;
    }
    goTo(preview && current >= 0 ? current : (current - 1 + stops.length) % stops.length);
  }, [elapsed, goTo, current, stops.length, preview]);
  const togglePlay = useCallback(() => {
    if (nowPlaying && !flight) setPlaying((p) => !p);
  }, [nowPlaying, flight]);

  // Animate the flight, then land, pause briefly, and start the next song.
  const flightKey = flight ? `${flight.from.name}>${flight.to.name}` : null;
  useEffect(() => {
    if (!flightKey) return;
    const start = performance.now();
    let raf = 0;
    let gap: ReturnType<typeof setTimeout> | undefined;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / FLIGHT_MS);
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
  const audioKey = nowPlaying && !flight ? `${nowPlaying.name}#${playToken}` : null;
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
    a.key = audioKey;
    const { lat, lon } = xyToLatLon(a.place.x, a.place.y);
    void jb.play({ lat, lon, surface: a.place.surface }, a.elapsed);
  }, [audioKey, playing, jb]);
  useEffect(() => {
    jb.setVolume(volume);
  }, [volume, jb]);

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
    if (pickMode) {
      setPickMode(false);
      return addPlace(place);
    }
    const i = stops.findIndex((st) => st.name === place.name);
    if (i >= 0) goTo(i);
    else playPreview(place);
  };

  const addPlace = useCallback(
    (place: Place | null) => {
      if (!place) {
        setPickMode(true);
        setNotice("Click a place on the map to add it.");
        return;
      }
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
      if (preview?.name === place.name) setPreview(null);
    },
    [stops, preview],
  );

  // Playback clock: advances while playing; at the end of a track, fly to the next stop.
  const tick = useRef<() => void>(() => {});
  useEffect(() => {
    tick.current = () => {
      if (elapsed + 1 < TRACK_SECONDS) return setElapsed(elapsed + 1);
      if (!preview && stops.length > 1) return next(); // fly on to the next stop (plane + quiet gap)
      setPlaying(false); // a lone place or a preview just ends
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
    const id = setTimeout(() => setNotice(null), 3500);
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
    const hit = findArea(query);
    if (!hit) {
      setNotice(`No place called "${query}" yet.`);
      return;
    }
    const { x, y } = latLonToXy(hit.lat, hit.lon);
    const surface: Surface = hit.water ? "water" : "land";
    const place = { name: hit.name, layer: layerFor(surface, hit.name, LAND_SHORT), x, y, surface };
    const i = stops.findIndex((st) => st.name === place.name);
    if (i >= 0) playStop(i);
    else playPreview(place);
  }, [query, stops, playStop, playPreview]);

  // Keyboard map (matches the key hints in the Figma labels).
  // V turns spoken descriptions on or off from anywhere (same setting as the menu switch).
  const voiceOn = useVoiceEnabled();
  const toggleVoice = useCallback(() => {
    setVoiceEnabled(!voiceOn);
    if (voiceOn) speakNow("Voice guidance off.");
    else speakLong(VOICE_ON);
  }, [voiceOn]);

  const spokenHover = useRef<string | null>(null);
  const hintSpoken = useRef(false);
  const captionRef = useRef("");
  const captionsOn = useSetting("captions");

  // ---- Audio navigation for people who can't see the map.
  // `announce` speaks (when voice is on) and also updates a hidden live region for screen readers.
  const [announcement, setAnnouncement] = useState("");
  const announce = useCallback(
    (text: string) => {
      setAnnouncement((a) => (a === text ? text + "\u00a0" : text)); // force a re-read of repeated text
      if (voiceOn) speakNow(text);
    },
    [voiceOn],
  );
  const help = useCallback(() => {
    setAnnouncement(HELP);
    speakLong(HELP); // H always speaks, even with voice guidance off, so anyone can find the commands
  }, []);

  // First visit in this tab: read the intro on the first click or key press (browsers only allow speech after one).
  const introDone = useRef(false);
  useEffect(() => {
    try {
      introDone.current = sessionStorage.getItem("earthfm.intro") === "done";
    } catch {}
  }, []);
  const playIntroOnce = useCallback(() => {
    if (introDone.current) return false;
    introDone.current = true;
    try {
      sessionStorage.setItem("earthfm.intro", "done");
    } catch {}
    if (voiceOn) return false; // already using voice guidance; no need for the welcome
    speakLong(INTRO); // one short line, spoken even with voice off, so blind visitors learn about V
    return false; // let this first key still do its job (V turns voice on right away)
  }, [voiceOn]);
  useEffect(() => {
    const onPointer = () => playIntroOnce();
    window.addEventListener("pointerdown", onPointer, { once: true });
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [playIntroOnce]);

  // Explore cursor: Shift + arrows move an invisible pointer over the map; the hover card follows it.
  const cursor = useRef<{ x: number; y: number } | null>(null);
  const STEP = 60;
  const moveCursor = (dx: number, dy: number) => {
    const c = cursor.current ?? (lastHover.current ? { x: lastHover.current.x, y: lastHover.current.y } : { x: W / 2, y: H / 2 });
    const x = Math.max(10, Math.min(W - 10, c.x + dx * STEP));
    const y = Math.max(10, Math.min(H - 10, c.y + dy * STEP));
    const edge = cursor.current && x === c.x && y === c.y;
    cursor.current = { x, y };
    const place = describe(x, y);
    lastHover.current = place;
    spokenHover.current = `${place.name}|${place.layer}`; // so the hover reader doesn't say it twice
    setHover(place);
    const inMix = stops.findIndex((st) => st.name === place.name);
    announce(`${edge ? "Edge of the map. " : ""}${place.name}. ${place.layer}${inMix >= 0 ? `, stop ${inMix + 1} in your mixtape` : ""}.`);
  };
  const actOn = (place: Place) => {
    const i = stops.findIndex((st) => st.name === place.name);
    if (i >= 0) goTo(i);
    else playPreview(place);
  };

  const changeYear = (y: number) => {
    const ny = Math.max(2001, Math.min(2025, y));
    setYear(ny);
    announce(ny === year ? `Already at ${ny}.` : String(ny));
  };
  const changeVolume = (d: number) => {
    const v = Math.max(0, Math.min(1, +(volume + d).toFixed(2)));
    setVolume(v);
    announce(`Volume ${Math.round(v * 100)} percent.`);
  };
  const status = () => {
    const playingText = nowPlaying
      ? `${flight ? "Flying to" : playing ? "Playing" : "Paused on"} ${nowPlaying.name}, ${nowPlaying.layer}, ${year}${!preview && current >= 0 ? `, stop ${current + 1} of ${stops.length}` : ""}.`
      : `Nothing playing. The year is ${year}.`;
    return `${playingText} Your mixtape has ${stops.length} ${stops.length === 1 ? "stop" : "stops"}. Volume ${Math.round(volume * 100)} percent.`;
  };
  const listMix = () =>
    stops.length
      ? `Your mixtape: ${stops.map((st, i) => `${i + 1}, ${st.name}, ${st.layer}`).join(". ")}.`
      : "Your mixtape is empty. Explore with Shift and the arrows, then press plus to add a place.";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT") {
        if (e.key === "Escape") t.blur();
        if (e.key === "Enter" && t.getAttribute("placeholder")?.startsWith("Search")) search();
        return;
      }
      if (e.metaKey || e.ctrlKey) return; // leave browser shortcuts alone
      if (playIntroOnce()) return; // the first key press starts the intro
      const k = e.key.toLowerCase();
      const onControl = t.tagName === "BUTTON" || t.tagName === "A" || t.getAttribute("role") === "slider";
      if (e.shiftKey && k.startsWith("arrow")) {
        e.preventDefault();
        if (k === "arrowleft") moveCursor(-1, 0);
        else if (k === "arrowright") moveCursor(1, 0);
        else if (k === "arrowup") moveCursor(0, -1);
        else moveCursor(0, 1);
        return;
      }
      if (k === "m") {
        setMenuOpen((o) => !o);
        announce(menuOpen ? "Settings closed." : "Settings open. Press Tab to move through the options, Escape to close.");
      } else if (k === "b") {
        setControlsHidden((h) => !h);
        announce(controlsHidden ? "Controls shown." : "Controls hidden.");
      } else if (k === "p") {
        setPlaylistHidden((h) => !h);
        announce(playlistHidden ? "Playlist shown." : "Playlist hidden.");
      } else if (k === "n" || k === "]") {
        if (!stops.length) announce("Your mixtape is empty.");
        next();
      } else if (k === "[") {
        if (!stops.length) announce("Your mixtape is empty.");
        prev();
      } else if (/^[1-9]$/.test(k)) {
        const i = Number(k) - 1;
        if (stops[i]) goTo(i);
        else announce(`There is no stop ${k}. Your mixtape has ${stops.length}.`);
      } else if (k === "v") toggleVoice();
      else if (k === "h" || k === "?" || k === "k") help();
      else if (k === "w") announce(status());
      else if (k === "l") announce(listMix());
      else if (k === "r") announce(captionRef.current);
      else if (k === "y") announce(`The year is ${year}.`);
      else if (k === "g") router.push("/play");
      else if (k === "/") {
        e.preventDefault();
        (document.querySelector('input[placeholder^="Search"]') as HTMLInputElement | null)?.focus();
        announce("Search. Type a place name and press Enter.");
      } else if (k === "escape") {
        if (isLongTalk()) stopSpeaking();
        setMenuOpen(false);
        setShareOpen(false);
        setPickMode(false);
      } else if (onControl && (k === "enter" || k === " " || k.startsWith("arrow") || k === "home" || k === "end" || k.startsWith("page"))) return; // let the focused control handle it
      else if (k === "arrowleft") changeYear(year - 1);
      else if (k === "arrowright") changeYear(year + 1);
      else if (k === "home") changeYear(2001);
      else if (k === "end") changeYear(2025);
      else if (k === "arrowup") {
        e.preventDefault();
        changeVolume(0.1);
      } else if (k === "arrowdown") {
        e.preventDefault();
        changeVolume(-0.1);
      } else if (k === "enter") {
        const place = cursor.current ? describe(cursor.current.x, cursor.current.y) : hover ?? lastHover.current;
        if (place) actOn(place);
        else announce("Hold Shift and use the arrow keys to pick a place first.");
      } else if (k === "+" || k === "=") addPlace(hover ?? lastHover.current ?? preview);
      else if (k === " ") {
        e.preventDefault();
        if (!nowPlaying) announce("Nothing to play yet. Explore with Shift and the arrows, then press Enter.");
        else if (!flight) announce(playing ? "Paused." : "Playing.");
        togglePlay();
      } else return;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---- derived view data
  const activeIdx = preview ? -1 : current;
  // Plane is only shown while flying between songs. Ease in/out; nose follows the arc (SVG nose points NE = -45deg).
  const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const plane = flight && pointOnLeg(flight.from, flight.to, ease(flight.t));
  const fromIdx = flight ? stops.indexOf(flight.from) : -1;
  const flyingLeg = flight && Math.abs(fromIdx - flight.toIdx) === 1 ? Math.min(fromIdx, flight.toIdx) : -1;
  const mixStops: Stop[] = stops.map((st, i) => ({
    n: i + 1,
    name: st.name,
    active: flight ? i === flight.toIdx : i === activeIdx,
    sub:
      flight && i === flight.toIdx
        ? `${st.layer} · flying there now`
        : flight && i === fromIdx
          ? `${st.layer} · played`
          : i === activeIdx
        ? `${st.layer} · ${playing ? "playing now" : "paused"}`
        : i < activeIdx
          ? `${st.layer} · played`
          : i === activeIdx + 1
            ? `${st.layer} · next, flying there`
            : `${st.layer} · then, flying there`,
  }));
  const meta = `Mixtape · ${stops.length} stops · ${mmss(stops.length * 164)}`; // Figma: 3 stops = 8:12 (2:44 per stop incl. travel)
  const caption =
    notice ??
    (flight ? `Flying to ${flight.to.name}…` : pickMode ? "Click a place on the map to add it." : nowPlaying ? CAPTIONS[nowPlaying.layer] ?? CAPTIONS.Fires : IDLE_CAPTION);
  useSpokenCaption(caption);
  useEffect(() => {
    captionRef.current = caption;
  }, [caption]);

  // Read out what the pointer is resting on (the same text as the hover card), so the map can be explored by ear.
  // The how-to hint is spoken only the first time; the same place isn't repeated while the pointer wiggles inside it.
  useEffect(() => {
    if (!voiceOn || !hover || isLongTalk()) return;
    const key = `${hover.name}|${hover.layer}`;
    if (key === spokenHover.current) return;
    spokenHover.current = key;
    const hint = hintSpoken.current ? "" : " Click to play, or press plus to add it to your mixtape.";
    hintSpoken.current = true;
    speakNow(`${hover.name}. ${hover.layer}, ${year}.${hint}`);
  }, [hover, voiceOn, year]);
  const nowText = flight ? `Up next: ${flight.to.name} ${year}` : nowPlaying ? `Now listening: ${nowPlaying.name} ${year}` : "Now listening: nothing yet";
  // The vehicle rides the current leg (current stop -> next) as the track plays; boat if the next stop is at sea.
  const legOpacity = (i: number) =>
    flight ? (i === flyingLeg ? 1 : 0.3) : activeIdx < 0 ? 0.45 : i === activeIdx ? 1 : i < activeIdx ? 0.25 : 0.45; // current leg bright, upcoming dim, played faint

  // Hover card sits down-right of the pin tip (Figma: tip 83.8,431.6 -> card 107,459), flipped near edges.
  const card = hover && {
    left: hover.x + 23 + 260 > W ? hover.x - 283 : hover.x + 23,
    top: hover.y + 27 + 72 > H ? hover.y - 99 : hover.y + 27,
  };

  return (
    <div className={s.viewport} onPointerDownCapture={() => void jb.ensure()} onKeyDownCapture={() => void jb.ensure()}>
      <div ref={stageRef} className={s.scaler} style={{ width: W * scale, height: H * scale }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0", width: W, height: H }}>
          <Stage>
            <MapLayer>
              {/* Map hit area: pin cursor + debounced area info. Dots and panels sit above it. */}
              <div className={s.hit} onPointerMove={onMapMove} onPointerLeave={onMapLeave} onClick={onMapClick} aria-label="Map: click a place to play it, + to add it. Keyboard: hold Shift and use the arrow keys to explore, Enter to play." />
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
                  key={st.name}
                  n={i + 1}
                  kind={i === activeIdx ? "Playing" : "Queued"}
                  left={st.x - 22}
                  top={st.y - 22}
                  label={`Stop ${i + 1}: ${st.name}, ${st.layer}${i === activeIdx ? ", playing" : ""}`}
                  onClick={() => goTo(i)}
                />
              ))}
              {hover && card && <HoverCard left={card.left} top={card.top} title={`${hover.name} · ${hover.layer} · ${year}`} hint="Click to play · + to add to mixtape" />}
            </MapLayer>

            {controlsHidden ? <HalfScrim /> : <Scrim />}
            {!controlsHidden && <YearPicker layer={LAND_LAYER} year={year} onYear={setYear} arrows={false} />}
            <WordCaption text={caption} show={captionsOn} />
            <h1 className="sr-only">EarthFM</h1>
            <p className="sr-only">{INTRO}</p>
            <p className="sr-only" aria-live="assertive">{announcement}</p>
            {!controlsHidden && (
              <>
                <NowListening text={nowText} onHide={() => setControlsHidden(true)} />
                <SoundPlayer
                  time={`${mmss(elapsed)} / ${mmss(TRACK_SECONDS)}`}
                  progress={elapsed / TRACK_SECONDS}
                  playing={playing}
                  volume={volume}
                  onPlayPause={togglePlay}
                  onPrev={prev}
                  onNext={next}
                  onVolume={(v) => {
                    setVolume(v);
                    if (voiceOn) speakNow(`Volume ${Math.round(v * 100)} percent.`);
                  }}
                />
              </>
            )}
            {controlsHidden && (
              <ShowControlsPill
                title={nowPlaying ? `${nowPlaying.name} · ${year}` : "Nothing playing"}
                playing={playing}
                onPlayPause={togglePlay}
                onNext={next}
                onShow={() => setControlsHidden(false)}
              />
            )}

            {playlistHidden ? (
              <ShowPlaylistTab count={stops.length} onShow={() => setPlaylistHidden(false)} />
            ) : (
              <Mixtape
                compact
                title="My mixtape"
                meta={meta}
                stops={mixStops}
                emptyText="No places yet. Hover the map, then click to listen or press + to add."
                addDisabled={stops.length >= MAX_STOPS}
                onHide={() => setPlaylistHidden(true)}
                onSelect={(n) => goTo(n - 1)}
                onRemove={(n) => removeStop(n - 1)}
                onAdd={() => addPlace(hover ?? lastHover.current ?? preview)}
                onShare={toggleShare}
                shareOpen={shareOpen}
              >
                {shareOpen && (
                  <SharePopover anchored url="earthjukebox.app/my-mixtape" copied={copied} onCopy={copyLink} saved={saved} onSave={() => setSaved(true)} onClose={() => setShareOpen(false)} />
                )}
              </Mixtape>
            )}

            {menuOpen ? (
              <>
                <MenuPanel onHelp={help} onClose={() => setMenuOpen(false)} onMode={(m) => m === "play" && router.push("/play")} />
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
