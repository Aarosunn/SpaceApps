/* Saved and shared mixtapes. Saved ones live in this browser (localStorage: no account, no server).
   A share link carries the whole mixtape in its address (?mix=...), so opening it rebuilds the route anywhere. */
import { getPref, setPref } from "@/lib/prefs";
import { LAYER_ORDER, type LayerId } from "@/lib/sonify/layers";

export type MixStop = { name: string; x: number; y: number; surface: "water" | "ice" | "land" };
export type Mix = { name: string; layer: LayerId; stops: MixStop[] };

const KEY = "earthfm-mixtapes";
const MAX_STOPS = 7, MAX_SAVED = 20, W = 1440, H = 900;

/* Anything read back (storage or a link) is untrusted: keep only well-formed mixtapes, clamp the numbers. */
export function cleanMix(raw: unknown): Mix | null {
  const m = raw as Partial<Mix> | null;
  if (!m || typeof m.name !== "string" || !Array.isArray(m.stops) || !m.stops.length) return null;
  const stops: MixStop[] = [];
  for (const st of m.stops.slice(0, MAX_STOPS)) {
    if (!st || typeof st.name !== "string" || !Number.isFinite(st.x) || !Number.isFinite(st.y)) return null;
    stops.push({
      name: st.name.slice(0, 40),
      x: Math.min(W, Math.max(0, st.x)),
      y: Math.min(H, Math.max(0, st.y)),
      surface: st.surface === "water" || st.surface === "ice" ? st.surface : "land",
    });
  }
  return { name: m.name.slice(0, 60) || "Mixtape", layer: LAYER_ORDER.includes(m.layer as LayerId) ? (m.layer as LayerId) : "sst", stops };
}

/* "Indian Ocean to Sahara" (first and last place), or just the place for a single stop. */
export const autoName = (stops: { name: string }[]) => (stops.length > 1 ? `${stops[0].name} to ${stops[stops.length - 1].name}` : stops[0]?.name ?? "Mixtape");

export function loadMixes(): Mix[] {
  try {
    const list = JSON.parse(getPref(KEY) ?? "[]");
    return Array.isArray(list) ? (list.map(cleanMix).filter(Boolean) as Mix[]) : [];
  } catch {
    return [];
  }
}

/* Save (a mixtape with the same name is replaced). Newest first. Returns the new list. */
export function saveMix(mix: Mix): Mix[] {
  const list = [mix, ...loadMixes().filter((m) => m.name !== mix.name)].slice(0, MAX_SAVED);
  setPref(KEY, JSON.stringify(list));
  return list;
}

export function deleteMix(name: string): Mix[] {
  const list = loadMixes().filter((m) => m.name !== name);
  setPref(KEY, JSON.stringify(list));
  return list;
}

/* Link form: compact JSON, base64url. Coordinates are rounded to whole pixels to keep links short. */
export function encodeMix(mix: Mix): string {
  const json = JSON.stringify({ n: mix.name, l: mix.layer, s: mix.stops.map((st) => [st.name, Math.round(st.x), Math.round(st.y), st.surface[0]]) });
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeMix(text: string): Mix | null {
  try {
    const bin = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    const o = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    const SURF: Record<string, MixStop["surface"]> = { w: "water", i: "ice", l: "land" };
    return cleanMix({ name: o.n, layer: o.l, stops: (o.s as unknown[][]).map(([name, x, y, sf]) => ({ name, x, y, surface: SURF[sf as string] ?? "land" })) });
  } catch {
    return null;
  }
}

export function selfCheck() {
  const mix: Mix = { name: "Indian Ocean to Sahara", layer: "fires", stops: [{ name: "Indian Ocean", x: 1010.4, y: 640, surface: "water" }, { name: "Sahara", x: 700, y: 330, surface: "land" }] };
  const back = decodeMix(encodeMix(mix));
  console.assert(back?.name === mix.name && back.layer === "fires" && back.stops.length === 2 && back.stops[0].x === 1010 && back.stops[0].surface === "water", "a mixtape survives the share link", back);
  console.assert(decodeMix("not-a-mixtape") === null && cleanMix({ name: "x", stops: [] }) === null, "bad input is rejected");
  console.assert(cleanMix({ name: "x", layer: "bogus", stops: [{ name: "A", x: 99999, y: -5, surface: "lava" }] })?.stops[0].x === 1440, "numbers are clamped, unknown layer falls back");
  console.assert(autoName([{ name: "A" }, { name: "B" }, { name: "C" }]) === "A to C" && autoName([{ name: "A" }]) === "A", "auto name");
}
