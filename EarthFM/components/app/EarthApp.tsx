"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Scrim } from "@/components/Stage";
import { MapLayer, RouteLegs, Plane, Boat, PinCursor, HoverCard } from "@/components/MapLayer";
import { MapDot } from "@/components/MapDot";
import { TopLeft } from "@/components/TopLeft";
import { Mixtape, type Stop } from "@/components/Mixtape";
import { NowListening, SoundPlayer } from "@/components/Player";
import { YearPicker } from "@/components/YearPicker";
import { LiveCaption } from "@/components/LiveCaption";
import { MenuPanel, TopLeftOpen } from "@/components/menu-open/MenuPanel";
import { SharePopover } from "@/components/mixtape-shared/SharePopover";
import { ShowControlsPill } from "@/components/controls-hidden/ShowControlsPill";
import { Caption, HalfScrim } from "@/components/controls-hidden/Caption";
import { ShowPlaylistTab } from "@/components/playlist-hidden/ShowPlaylistTab";
import { asset } from "@/components/asset";
import { findArea, latLonToXy, layerFor, regionName, surfaceOf, xyToLatLon, type Surface } from "@/lib/geo";
import s from "./EarthApp.module.css";

const W = 1440, H = 900;
const HOVER_DELAY_MS = 450; // debounce: the card only appears once the cursor rests this long
const TRACK_SECONDS = 75; // 1:15 per stop, as in the Figma player
const LAND_LAYER = "Wildfires";
const LAND_SHORT = "Fires";

type Place = { name: string; layer: string; x: number; y: number; surface: Surface };

const INITIAL_STOPS: Place[] = [
  { name: "Amazon", layer: "Fires", x: 425, y: 540, surface: "land" },
  { name: "Central Africa", layer: "Fires", x: 782, y: 452, surface: "land" },
  { name: "Indian Ocean", layer: "Sea heat", x: 1012, y: 632, surface: "water" },
];

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
  const sample = useMapSampler();
  const stageRef = useRef<HTMLDivElement>(null);

  const [stops, setStops] = useState<Place[]>(INITIAL_STOPS);
  const [current, setCurrent] = useState(0);
  const [preview, setPreview] = useState<Place | null>(null); // a clicked map area that is not in the mixtape
  const [playing, setPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(57);
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

  // Cursor + debounced hover card
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState<Place | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nowPlaying: Place = preview ?? stops[current];

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
    setPointer(p);
    setHover(null); // moving: no info
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setHover(describe(p.x, p.y)), HOVER_DELAY_MS);
  };
  const onMapLeave = () => {
    if (timer.current) clearTimeout(timer.current);
    setPointer(null);
    setHover(null);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const playStop = useCallback((i: number) => {
    setPreview(null);
    setCurrent(i);
    setElapsed(0);
    setPlaying(true);
  }, []);
  const next = useCallback(() => playStop((preview ? current : current + 1) % stops.length), [playStop, current, stops.length, preview]);
  const prev = useCallback(() => (elapsed > 3 && !preview ? setElapsed(0) : playStop((current - 1 + stops.length) % stops.length)), [elapsed, playStop, current, stops.length, preview]);

  const onMapClick = (e: React.MouseEvent) => {
    const p = toStage(e);
    const place = describe(p.x, p.y);
    const i = stops.findIndex((st) => st.name === place.name);
    if (i >= 0) playStop(i);
    else {
      setPreview(place);
      setElapsed(0);
      setPlaying(true);
    }
  };

  const addPlace = useCallback(
    (place: Place | null) => {
      if (!place) {
        setNotice("Hover or click a place on the map, then press + to add it.");
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
    tick.current = () => (elapsed + 1 >= TRACK_SECONDS ? next() : setElapsed(elapsed + 1));
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

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?mix=fires-south`;
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
    else {
      setPreview(place);
      setElapsed(0);
      setPlaying(true);
    }
  }, [query, stops, playStop]);

  // Keyboard map (matches the key hints in the Figma labels).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT") {
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
      } else if (k === "arrowleft") setYear((y) => Math.max(2001, y - 1));
      else if (k === "arrowright") setYear((y) => Math.min(2025, y + 1));
      else if (k === "+" || k === "=") addPlace(hover ?? preview);
      else if (k === " " && t.tagName !== "BUTTON") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else return;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, addPlace, hover, preview, search]);

  // ---- derived view data
  const activeIdx = preview ? -1 : current;
  const travel = (to: Place) => (to.surface === "water" ? "sailing" : "flying");
  const mixStops: Stop[] = stops.map((st, i) => ({
    n: i + 1,
    name: st.name,
    active: i === activeIdx,
    sub:
      i === activeIdx
        ? `${st.layer} · ${playing ? "playing now" : "paused"}`
        : i < activeIdx
          ? `${st.layer} · played`
          : i === activeIdx + 1
            ? `${st.layer} · next, ${travel(st)} there`
            : `${st.layer} · then, ${travel(st)} there`,
  }));
  const meta = `Mixtape · ${stops.length} stops · ${mmss(stops.length * 164)}`; // Figma: 3 stops = 8:12 (2:44 per stop incl. travel)
  const caption = notice ?? CAPTIONS[nowPlaying.layer] ?? CAPTIONS.Fires;
  const defaultRoute = stops.length >= 3 && stops.slice(0, 3).every((st, i) => st.name === INITIAL_STOPS[i].name);

  // Hover card sits down-right of the pin tip (Figma: tip 83.8,431.6 -> card 107,459), flipped near edges.
  const card = hover && {
    left: hover.x + 23 + 260 > W ? hover.x - 283 : hover.x + 23,
    top: hover.y + 27 + 72 > H ? hover.y - 99 : hover.y + 27,
  };

  return (
    <div className={s.viewport}>
      <div ref={stageRef} className={s.scaler} style={{ width: W * scale, height: H * scale }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0", width: W, height: H }}>
          <Stage>
            <MapLayer>
              {/* Map hit area: pin cursor + debounced area info. Dots and panels sit above it. */}
              <div className={s.hit} onPointerMove={onMapMove} onPointerLeave={onMapLeave} onClick={onMapClick} aria-label="Map: click a place to play it, + to add it" />
              {defaultRoute && (
                <>
                  <RouteLegs />
                  {activeIdx <= 0 ? <Plane left={594.66} top={407.74} rotate={34.71} /> : <Plane left={755} top={400} rotate={4.32} />}
                  {activeIdx <= 1 ? <Boat left={964.76} top={557.96} /> : <Boat left={1036} top={600} />}
                </>
              )}
              {stops.map((st, i) => (
                <MapDot
                  key={st.name}
                  n={i + 1}
                  kind={i === activeIdx ? "Playing" : "Queued"}
                  left={st.x - 22}
                  top={st.y - 22}
                  label={`Stop ${i + 1}: ${st.name}, ${st.layer}${i === activeIdx ? ", playing" : ""}`}
                  onClick={() => playStop(i)}
                />
              ))}
              {pointer && <PinCursor left={pointer.x - 13.5} top={pointer.y - 8.4} />}
              {hover && card && <HoverCard left={card.left} top={card.top} title={`${hover.name} · ${hover.layer} · ${year}`} hint="Click to play · + to add to mixtape" />}
            </MapLayer>

            {controlsHidden ? <HalfScrim /> : <Scrim />}
            {!controlsHidden && <YearPicker layer={LAND_LAYER} year={year} onYear={setYear} />}
            {controlsHidden ? <Caption text={caption} /> : <LiveCaption text={caption} />}
            {!controlsHidden && (
              <>
                <NowListening text={`Now listening: ${nowPlaying.name} ${year}`} onHide={() => setControlsHidden(true)} />
                <SoundPlayer
                  time={`${mmss(elapsed)} / ${mmss(TRACK_SECONDS)}`}
                  progress={elapsed / TRACK_SECONDS}
                  playing={playing}
                  volume={volume}
                  onPlayPause={() => setPlaying((p) => !p)}
                  onPrev={prev}
                  onNext={next}
                  onVolume={setVolume}
                />
              </>
            )}
            {controlsHidden && (
              <ShowControlsPill
                title={`${nowPlaying.name} · ${year}`}
                playing={playing}
                onPlayPause={() => setPlaying((p) => !p)}
                onNext={next}
                onShow={() => setControlsHidden(false)}
              />
            )}

            {playlistHidden ? (
              <ShowPlaylistTab count={stops.length} onShow={() => setPlaylistHidden(false)} />
            ) : (
              <Mixtape
                meta={meta}
                stops={mixStops}
                onHide={() => setPlaylistHidden(true)}
                onSelect={(n) => playStop(n - 1)}
                onAdd={() => addPlace(hover ?? preview)}
                onShare={toggleShare}
                shareOpen={shareOpen}
              />
            )}
            {shareOpen && !playlistHidden && (
              <SharePopover url="earthjukebox.app/fires-south" copied={copied} onCopy={copyLink} saved={saved} onSave={() => setSaved(true)} />
            )}

            {menuOpen ? (
              <>
                <MenuPanel onClose={() => setMenuOpen(false)} />
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
