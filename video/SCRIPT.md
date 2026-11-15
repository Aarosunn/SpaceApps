# EarthFM demo video: voice-over script

Length 29.9 s. Read at a normal, calm pace (about 2.3 words a second): 62 words in total, so there is room to breathe.
The times are where each line should **start**. Each line fits inside its shot.

| Time | On screen | Say | Words |
|---|---|---|---|
| 0:00 | Title: "What does a warming planet sound like?" | **What does a warming planet sound like?** | 7 |
| 0:03 | Click on the Indian Ocean; notes ripple across the sea | **EarthFM turns NASA Earth data into music. Click anywhere.** | 9 |
| 0:07 | A plane flies along the route to the next place | **Build a route and fly between places.** | 7 |
| 0:09.5 | Same place, switched to wildfires | **Wildfires crackle. Oceans wash in like waves.** | 7 |
| 0:12.5 | Switched to global heat | **Global heat swells like brass.** | 5 |
| 0:15 | The game: the mystery record spins | **Then test your ear.** | 4 |
| 0:17 | An answer is picked; confetti; the NASA data appears | **Guess the mystery sound. Every answer is real NASA data.** | 10 |
| 0:21.5 | "Built for everyone" + keyboard exploring | **Built for everyone: voice, keyboard and captions. No sight needed.** | 10 |
| 0:25.5 | End card: EarthFM, "Hear the Earth." | **EarthFM. Hear the Earth.** | 4 |

## Recording tips
- One take, with a stopwatch, is easiest: start it with the video and hit each line at its time.
- Leave the half second before each cut silent: that is where the whoosh sits.
- Keep the last line slow. The end chord rings under it.

## Putting the voice in the video
1. Save the recording as `video/public/vo.wav` (30 s or shorter, starting at 0:00).
2. In `video/src/Demo.tsx` set `VOICEOVER = true` (the app's own sound then drops to 30% under the voice).
3. `cd video && npm run render`

## Rules to remember
- The video must have **English subtitles**: they are burned in. If you change a spoken line a lot, change its caption
  too (`CAPTIONS` in `src/Demo.tsx`) so the two say the same thing.
- If the voice is AI-generated, say so in the submission's AI-use field. A teammate's real voice needs no disclosure.

## Fine-tuning the edit
`cd video && npm run studio` opens a live preview in the browser; saving `src/Demo.tsx` updates it at once.
- **Cuts and zooms:** `SHOTS` — `at` (start in the video), `len`, `src` (start inside the clip), `zoom` (where it pushes in).
- **Captions:** `CAPTIONS` — time, text, and the word shown in green.
- **Title, end card, colours:** `Hook`, `EndCard`, and the colour constants at the top.
- **Sound effects volume:** the `<Audio ... volume={...}>` lines at the bottom.

The app footage was recorded before the latest changes (no "show as a line" button, "Why it matters" on the cards,
saved mixtapes). To refresh it: run the three `capture/capture.mjs` commands in `README.md`, then check the `src:` times.
