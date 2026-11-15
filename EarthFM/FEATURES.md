# Final-stretch features: how to switch them off

Each feature below has a switch in `lib/flags.ts` (set it to `false`) and its own commit (`git revert <hash>`).
The switch is the safe way: later commits touch some of the same files, so a revert can conflict.

| Feature | Flag | Commit | What it adds |
|---|---|---|---|
| Instruments | `instruments` | `4630f5c` | A different instrument, key and scale per data type: sea = soft mallets + surf (C major pentatonic), wildfires = dry plucks + crackle + roar (A minor pentatonic), global heat = brassy swell (D dorian), night lights = bells. `lib/sonify/instruments.ts` |
| Visual effects | `visualFx` | `d06324e` | On the map: the reading window, a burst per note (ripples / sparks / glow), a loudness aura; live waveform bars; route and dot entrances. `components/fx/MapFx.tsx` |
| Keyboard map | `mapKeyboard` | `b3068d6` | Tab to the map, arrow keys move a listening pin, pause to hear the place name, Enter adds it. |
| Voice control | `voiceControl` | `b3068d6` | Microphone button and V key ("add Amazon", "next", "wildfires", "what is playing"). The same commands can be typed in the search box. `lib/voice.ts` |
| Game upgrades | `gameJuice` | `e4aa0a3` | Fire Season round, spinning-record mystery, points and streaks, confetti, voice answers, "play my Earth mix". |

| No reference sound | none | `fbe8be7` | The game plays the "how it sounds" examples and then the mystery; the separate reference sound is gone. Revert the commit to bring it back. |

Checks: open `/selfcheck` in the running app (all parsers and mappings), `npx tsc --noEmit`, `npx eslint .`.

Not verified by a person yet: how the instruments sound, speech recognition with a real microphone, and a real
screen reader (VoiceOver / NVDA). The headless test browser has no speakers, microphone or voices.
