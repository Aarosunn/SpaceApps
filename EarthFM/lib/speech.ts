/* Text to speech with the browser's built-in voice (Web Speech API): no samples, no network, no dependency.
   It reads the same sentence the caption shows, so the picture, the caption and the voice never disagree. */

/* Make a caption speakable: speech engines stumble over symbols ("·", "–", "°C", "…"). Pure, checked in selfCheck. */
export function forSpeech(text: string): string {
  return text
    .replace(/°C vs 1951[–-]80/g, "degrees Celsius compared with the 1951 to 1980 average")
    .replace(/°C/g, "degrees Celsius")
    .replace(/(^|[\s(])[-−](\d)/g, "$1minus $2")
    .replace(/(^|[\s(])\+(\d)/g, "$1plus $2")
    .replace(/(\d) cm/g, "$1 centimetres")
    .replace(/\s*·\s*/g, ", ")
    .replace(/\s*–\s*/g, " to ")
    .replace(/…/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

let current: SpeechSynthesisUtterance | null = null;
let retry: (() => void) | null = null;

const synth = () => (typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null);

export const canSpeak = () => synth() !== null;

/* Say `text`, replacing whatever was being said. `onStart` / `onEnd` let the caller turn the music down meanwhile.
   Returns false when the browser has no speech. */
export function speak(text: string, onStart?: () => void, onEnd?: () => void): boolean {
  const s = synth();
  if (!s) return false;
  if (retry) {
    window.removeEventListener("pointerdown", retry);
    window.removeEventListener("keydown", retry);
    retry = null;
  }
  s.cancel();
  const u = new SpeechSynthesisUtterance(forSpeech(text));
  u.lang = "en-US";
  current = u; // the cancelled utterance's end event arrives later: only the newest one may report
  u.onstart = () => current === u && onStart?.();
  u.onend = () => current === u && onEnd?.();
  u.onerror = (e) => {
    if (current !== u) return;
    onEnd?.();
    // Browsers refuse speech before the first click or key press: say it on that first gesture instead.
    if (e.error === "not-allowed") {
      retry = () => speak(text, onStart, onEnd);
      window.addEventListener("pointerdown", retry, { once: true });
      window.addEventListener("keydown", retry, { once: true });
    }
  };
  s.speak(u);
  return true;
}

export function stopSpeaking() {
  if (retry) {
    window.removeEventListener("pointerdown", retry);
    window.removeEventListener("keydown", retry);
    retry = null;
  }
  synth()?.cancel(); // fires the current utterance's end/error, so the caller's onEnd still runs
}

export function selfCheck() {
  console.assert(forSpeech("Mostly high notes: warm water, 20 to 29 °C.") === "Mostly high notes: warm water, 20 to 29 degrees Celsius.", "degrees");
  console.assert(forSpeech("Notes rise: near normal to hotter than normal, -0.1 to 1.5 °C vs 1951–80.") === "Notes rise: near normal to hotter than normal, minus 0.1 to 1.5 degrees Celsius compared with the 1951 to 1980 average.", "anomaly");
  console.assert(forSpeech("North Atlantic · Sea heat · 25 Mar 2007 – 3 Mar 2008") === "North Atlantic, Sea heat, 25 Mar 2007 to 3 Mar 2008", "separators");
  console.assert(forSpeech("Flying to Sahara…") === "Flying to Sahara", "ellipsis");
  console.assert(forSpeech("1: 2003, +3.0 cm. 2: 1880s, −1.0 °C") === "1: 2003, plus 3.0 centimetres. 2: 1880s, minus 1.0 degrees Celsius", "game values");
}
