"use client";

import { useSyncExternalStore } from "react";

/* Small remembered on/off settings shared by the map and the game (Captions, Mono audio). */

type Name = "captions" | "mono";
const DEFAULTS: Record<Name, boolean> = { captions: true, mono: false };
const values: Partial<Record<Name, boolean>> = {};
const listeners = new Set<() => void>();

function get(name: Name): boolean {
  if (values[name] === undefined) {
    try {
      const v = localStorage.getItem(`earthfm.${name}`);
      values[name] = v === null ? DEFAULTS[name] : v === "on";
    } catch {
      values[name] = DEFAULTS[name];
    }
  }
  return values[name]!;
}

export function setSetting(name: Name, on: boolean) {
  values[name] = on;
  try {
    localStorage.setItem(`earthfm.${name}`, on ? "on" : "off");
  } catch {}
  if (name === "mono") contexts.forEach((c) => applyMono(c, on));
  listeners.forEach((l) => l());
}

export function useSetting(name: Name): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => get(name),
    () => DEFAULTS[name],
  );
}

/* Mono audio: fold left and right into one channel so nothing is lost for people who hear with one ear.
   Every audio context we create registers here so the switch applies to the music and the game alike. */
type Ctx = { destination: AudioDestinationNode };
const contexts = new Set<Ctx>();

function applyMono(c: Ctx, on: boolean) {
  try {
    const d = c.destination;
    d.channelCountMode = "explicit";
    d.channelInterpretation = "speakers";
    d.channelCount = on ? 1 : Math.min(2, d.maxChannelCount || 2);
  } catch {}
}

export function registerAudioContext(c: Ctx | null | undefined) {
  if (!c || contexts.has(c)) return;
  contexts.add(c);
  applyMono(c, get("mono"));
}
