/* Small remembered choices (voice on/off, mono audio), shared by the globe and the game.
   Storage can be blocked (private windows): then nothing is remembered and the defaults apply. */
export function getPref(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setPref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}
