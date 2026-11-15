# EarthFM demo video: voice-over script

Length 29.9 s. 56 words in total, so each line can be read slowly. The times are where each line should **start**.
The spoken lines are the same words as the burned-in captions.

| Time | On screen | Say |
|---|---|---|
| 0:00 | Title card | **What does a warming planet sound like?** |
| 0:03 | A click on the Indian Ocean; the data starts to play | **Most climate data is made to be seen.** |
| 0:06 | The map shows which square is being read | **EarthFM turns NASA Earth data into music.** |
| 0:09.7 | The same map as wildfires, then as global heat | **Sea temperature, wildfires, global heat: each has its own instrument.** |
| 0:14.9 | The game: an answer is picked, then the NASA data behind it | **A listening game trains your ear with real NASA numbers.** |
| 0:20.7 | "Built for everyone" + exploring the map by keyboard | **Built for blind and low-vision users: keyboard, voice, captions.** |
| 0:25.5 | End card | **EarthFM. Climate data everyone can hear.** |

## Recording tips
- One take with a stopwatch is easiest: start it with the video and hit each line at its time.
- Every cut is a 0.3 s dissolve. Start each line just after it.

## Putting the voice in the video
1. Save the recording as `video/public/vo.wav` (30 s or shorter, starting at 0:00).
2. In `video/src/Demo.tsx` set `VOICEOVER = true` (the app's own sound then drops to 30% under the voice).
3. `cd video && npm run render`

## Rules to remember
- The video must have **English subtitles**: they are burned in. If you change a spoken line, change its caption too
  (`CAPTIONS` in `src/Demo.tsx`).
- If the voice is AI-generated, say so in the submission's AI-use field. A teammate's real voice needs no disclosure.

## Fine-tuning the edit
`cd video && npm run studio` opens a live preview; saving `src/Demo.tsx` updates it at once.
- **Shots:** `SHOTS` — `at` (start in the video), `len`, `src` (start inside the clip), `zoom`. Neighbours overlap by 0.3 s.
- **Dissolve length:** `FADE` (frames).
- **Captions:** `CAPTIONS` — start, end, text.
- **Colours:** `PAPER`, `INK`, `LIME` at the top (the app's own palette).
- **Title, accessibility card, end card:** `Hook`, `Access`, `EndCard`.
