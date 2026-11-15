"use client";

import { useEffect, useSyncExternalStore } from "react";

/* Spoken word descriptions (the "Word descriptions (voice)" setting).
   Uses the browser's built-in speechSynthesis, so it needs no API key and works offline.
   The setting is shared by the map and the game and remembered between visits. */

const KEY = "earthfm.voice";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off"; // on by default, matching the menu
  } catch {
    return true;
  }
}

let enabled = typeof window === "undefined" ? true : read();

export function setVoiceEnabled(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {}
  if (!on) stopSpeaking();
  listeners.forEach((l) => l());
}

export function useVoiceEnabled(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => enabled,
    () => true,
  );
}

const supported = () => typeof window !== "undefined" && "speechSynthesis" in window;

// Pick the most natural sounding English voice the system has.
// Best: macOS Siri style "Premium"/"Enhanced" voices, Edge's "Natural" neural voices, then Google's voice in Chrome.
// Novelty and old robotic macOS voices are never picked.
const ROBOTIC = /albert|bad news|bahh|bells|boing|bubbles|cellos|zarvox|whisper|trinoids|jester|organ|superstar|wobble|good news|junior|ralph|fred|kathy|grandma|grandpa|rocko|shelley|flo|eddy|reed|sandy/i;
const RANKED: RegExp[] = [
  /(ava|zoe|evan|nathan|joelle|noelle|allison|susan|tom|serena|jamie|matilda|lee|isha|ava).*\(premium\)/i,
  /\(premium\)/i,
  /natural|neural/i, // Microsoft Edge: "Microsoft Aria Online (Natural)"
  /(ava|zoe|evan|allison|serena|samantha).*\(enhanced\)/i,
  /\(enhanced\)/i,
  /google us english/i,
  /google uk english female/i,
  /^ava\b|^zoe\b|^allison\b|^susan\b|^serena\b/i,
  /samantha|karen|daniel|moira/i,
];
let chosen: SpeechSynthesisVoice | undefined;
function pickVoice(): SpeechSynthesisVoice | undefined {
  if (chosen) return chosen;
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en") && !ROBOTIC.test(v.name));
  if (!voices.length) return undefined;
  const us = (v: SpeechSynthesisVoice) => (v.lang === "en-US" ? 0 : 1);
  for (const re of RANKED) {
    const hits = voices.filter((v) => re.test(v.name)).sort((a, b) => us(a) - us(b));
    if (hits.length) return (chosen = hits[0]);
  }
  return (chosen = voices.find((v) => v.default) ?? voices[0]);
}

export function stopSpeaking() {
  if (supported()) window.speechSynthesis.cancel();
}

/* Speak a line now, interrupting anything still being read. Works even when the setting is off (for "voice off" confirmations). */
let longTalkUntil = 0; // while the intro or help is being read, automatic captions wait their turn

export function isLongTalk() {
  return longTalkUntil > Date.now() && supported() && window.speechSynthesis.speaking;
}

/* Read a long passage (intro, help). Automatic captions and hover lines stay quiet until it finishes;
   any command the user types still interrupts it right away. */
export function speakLong(text: string) {
  longTalkUntil = Date.now() + 120_000;
  const u = speakNow(text, true);
  if (u) u.onend = u.onerror = () => (longTalkUntil = 0);
}

export function speakNow(text: string, long = false): SpeechSynthesisUtterance | undefined {
  if (!supported() || !text) return;
  if (!long) longTalkUntil = 0;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/…/g, "."));
  const v = pickVoice();
  if (v) u.voice = v;
  u.lang = v?.lang ?? "en-US";
  u.rate = 0.98; // a touch slower reads more naturally
  u.pitch = 1;
  u.volume = 1;
  synth.speak(u);
  return u;
}

/* Read `text` aloud whenever it changes, if the voice setting is on.
   A short delay means quick changes (hovering, skipping fast) only read the latest line. */
export function useSpokenCaption(text: string, delayMs = 250) {
  const on = useVoiceEnabled();
  useEffect(() => {
    if (!on || !text || !supported()) return;
    const id = setTimeout(() => !isLongTalk() && speakNow(text), delayMs);
    return () => clearTimeout(id);
  }, [text, on, delayMs]);
  useEffect(() => () => stopSpeaking(), []);
}

/* Chrome loads voices asynchronously; touching getVoices early makes the first line use the right voice. */
if (supported()) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", () => {
    chosen = undefined; // better voices may have just loaded
    window.speechSynthesis.getVoices();
  });
}
