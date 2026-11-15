/* Voice commands: speech to text with the browser's built-in recogniser (Web Speech API; Chrome, Edge, Safari),
   then a small, forgiving parser. The same parser reads commands typed into the search box, so every command
   also works without a microphone. No audio leaves the page through our code; the browser handles recognition. */
import { findArea } from "@/lib/geo";
import type { LayerId, SonMode } from "@/lib/sonify/layers";

export type Command =
  | { type: "play" | "pause" | "next" | "prev" | "status" | "help" | "game" | "clear" | "how" }
  | { type: "add"; place: string }
  | { type: "remove"; place: string | null } // null = the last one
  | { type: "layer"; layer: LayerId }
  | { type: "mode"; mode: SonMode }
  | { type: "volume"; delta: number }
  | { type: "menu"; open: boolean }
  | { type: "unknown"; text: string };

export const VOICE_HELP = 'You can say: add Amazon. Play. Pause. Next. Wildfires, sea heat, or global heat. Louder. Remove last. What is playing.';

const GO = /^(?:add|go to|take me to|fly to|play|listen to|show me|open|visit|hear)\s+(?:the\s+)?(.+)$/;

/* Pure: text in, command out. Checked in selfCheck. */
export function parseCommand(raw: string): Command {
  const t = raw.toLowerCase().replace(/[.,!?"']/g, "").replace(/\s+/g, " ").trim();
  if (!t) return { type: "unknown", text: raw };
  if (/^(play|resume|start|continue|go)( the)?( music| song| it)?$/.test(t)) return { type: "play" };
  if (/(play|start|open)( the)? (game|quiz)|^game( mode)?$|^quiz$/.test(t)) return { type: "game" };
  if (/^(pause|stop|quiet|silence|hold on)( the)?( music| song| it)?$/.test(t)) return { type: "pause" };
  if (/^(next|skip)( one| place| song| stop)?$|^(next|skip) /.test(t)) return { type: "next" };
  if (/^(previous|back|go back|last one|before)( one| place| song)?$/.test(t)) return { type: "prev" };
  if (/louder|volume up|turn (it )?up/.test(t)) return { type: "volume", delta: 0.2 };
  if (/quieter|softer|volume down|turn (it )?down/.test(t)) return { type: "volume", delta: -0.2 };
  if (/wild ?fires?|^fires?$|burning/.test(t)) return { type: "layer", layer: "fires" };
  if (/sea heat|sea temp|ocean (heat|temp)|^(sea|ocean|water)$/.test(t)) return { type: "layer", layer: "sst" };
  if (/global heat|warming|^(heat|temperature|climate)$/.test(t)) return { type: "layer", layer: "heat" };
  if (/^(by |over )?area$/.test(t)) return { type: "mode", mode: "area" };
  if (/^(by |over )?time$/.test(t)) return { type: "mode", mode: "time" };
  if (/what(s| is)( this| that)?( playing| it)?$|where am i|^status$|what am i (hearing|listening to)/.test(t)) return { type: "status" };
  if (/^help$|what can i say|^commands$/.test(t)) return { type: "help" };
  if (/how (is )?(this|it|the sound)( sound)?( is)? made|explain/.test(t)) return { type: "how" };
  if (/^(clear|remove all|delete all|start over|reset)( everything| the mixtape)?$/.test(t)) return { type: "clear" };
  const rm = t.match(/^(?:remove|delete|drop|undo)\s*(?:the\s+)?(.*)$/);
  if (rm) return { type: "remove", place: !rm[1] || /^(last|it|that|last one|last place)$/.test(rm[1]) ? null : rm[1] };
  if (/^(open )?(menu|settings)$/.test(t)) return { type: "menu", open: true };
  if (/^close( menu| settings)?$/.test(t)) return { type: "menu", open: false };
  const go = t.match(GO);
  if (go && findArea(go[1])) return { type: "add", place: go[1] };
  if (findArea(t)) return { type: "add", place: t };
  return { type: "unknown", text: raw };
}

type Rec = {
  lang: string; interimResults: boolean; maxAlternatives: number; continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; abort: () => void;
};
const ctor = () => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
export const canListen = () => ctor() !== null;

/* Listen for one utterance. onText gets what was heard so far; onDone gets the final alternatives (best first),
   or an error code ("not-allowed" = microphone blocked, "no-speech" = silence). Returns a function that cancels. */
export function listenOnce(onText: (text: string) => void, onDone: (alternatives: string[], error?: string) => void): () => void {
  const C = ctor();
  if (!C) {
    onDone([], "unsupported");
    return () => {};
  }
  const rec = new C();
  let finals: string[] = [], error: string | undefined, done = false;
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.maxAlternatives = 3;
  rec.continuous = false;
  rec.onresult = (e) => {
    const last = e.results[e.results.length - 1];
    onText(last[0].transcript);
    if (last.isFinal) finals = Array.from({ length: last.length }, (_, i) => last[i].transcript);
  };
  rec.onerror = (e) => (error = e.error);
  rec.onend = () => {
    if (done) return;
    done = true;
    onDone(finals, finals.length ? undefined : error ?? "no-speech");
  };
  try {
    rec.start();
  } catch {
    onDone([], "busy");
  }
  return () => {
    done = true;
    rec.abort();
  };
}

export function selfCheck() {
  const is = (text: string, type: string) => console.assert(parseCommand(text).type === type, `"${text}" should be ${type}`, parseCommand(text));
  is("Play.", "play"); is("pause", "pause"); is("stop the music", "pause"); is("next", "next"); is("skip", "next"); is("go back", "prev");
  is("louder", "volume"); is("turn it down", "volume"); is("wildfires", "layer"); is("sea heat", "layer"); is("global heat", "layer");
  is("what is playing", "status"); is("what's playing?", "status"); is("help", "help"); is("play the game", "game");
  is("remove last", "remove"); is("clear", "clear"); is("open menu", "menu"); is("blah blah", "unknown");
  const add = parseCommand("Take me to the Amazon");
  console.assert(add.type === "add" && add.place === "amazon", "go to a place", add);
  console.assert(parseCommand("sahara").type === "add" && parseCommand("play pacific").type === "add", "bare place and play <place>");
  const l = parseCommand("fires");
  console.assert(l.type === "layer" && l.layer === "fires", "layer id");
}
