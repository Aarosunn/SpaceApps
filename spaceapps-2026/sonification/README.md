# Sonification research for the Earth Information Jukebox

Written 2026-11-14 for Space Apps 2026. Answers: how do we actually get the sounds, and which tools and algorithms turn EIC frames into music?

## Verification status (read this first)

- **Notes 01 to 07** were each researched against live sources by one worker. A second, independent fact-check pass was started and **did not finish** (the workers ran out of usage credits). Only note 01 received fact-checker fixes.
- **Before you rely on a licence, a citation, a version number or a quoted statistic, open the source listed at the bottom of that note.** Each note also has an "Open questions / unverified" section.
- **Python recipes** were re-run and pass. **Browser recipes** pass their 22 Node tests and one muted, scripted smoke test in Chromium; no human has listened to them, and they are untested in Safari, on phones and with screen readers. Serve them with `node serve.js . 8765`, not `python -m http.server` (it ignores byte-range requests, which breaks video seeking).

## The short answer

1. **You generate the sound; you do not download it.** The EIC gallery has no usable audio. The pipeline is frames -> features (numbers) -> mapping rules -> a synth.
2. **Stack.** Python offline turns frames into a small `timeline.json`. A static page plays it with Tone.js 15.1.22, using the muted video as the clock.
3. **Why offline.** `svs.gsfc.nasa.gov` sends a fixed CORS header, so a page on your domain can show an SVS video but cannot read its pixels. Self-host small copies or precompute. Measured with curl, and one worker confirmed it in Chromium.
4. **Sound source.** Synthesize in the browser. Sampled instruments are optional and each needs a licence check. Mute every SVS video: at least 10 EIC pages carry licensed music.
5. **Core algorithm.** Colourmap inversion: match each pixel to the visualization's colour bar to recover a real value. Match on hue; full-colour matching failed on a real frame.
6. **Mapping.** Key variable -> pitch, snapped to a pentatonic scale against a reference drone. Flashes -> percussion. A keyboard probe mode for blind and low-vision users.
7. **Start with SVS 3912** (sea surface temperature). It is a flat map with a published colour bar. Most other listed visuals have a moving camera.
8. **Caldwell 73**, the challenge's own example, is a rotating radar sweep with radius -> pitch, not a left-to-right scan.

## Files

| File | Use it for |
|---|---|
| [01-where-the-sounds-come-from.md](01-where-the-sounds-come-from.md) | Synthesis vs samples vs recordings vs AI; licence table; attribution template |
| [02-frame-analysis-algorithms.md](02-frame-analysis-algorithms.md) | Colourmap inversion, zonal means, motion, events; per-visual table with colour-bar URLs |
| [03-sonification-mapping-and-synthesis.md](03-sonification-mapping-and-synthesis.md) | Mapping maths, seven rule-table designs, which technique for which visual |
| [04-making-it-musical.md](04-making-it-musical.md) | Scales, quantising, Euclidean rhythm, mixing, five presets |
| [05-tools-and-libraries.md](05-tools-and-libraries.md) | Tool landscape, recommended stack, what other teams use |
| [06-web-audio-live-sonification.md](06-web-audio-live-sonification.md) | Web Audio, Tone.js, CORS measurements, video sync, hosting |
| [07-accessibility-and-listening-tests.md](07-accessibility-and-listening-tests.md) | Accessibility checklist, WCAG items, listening-test protocol |
| [08-recipes-python.md](08-recipes-python.md) | Index of the runnable Python code in `recipes-python/` |
| [09-recipes-browser.md](09-recipes-browser.md) | Index of the browser code in `recipes-browser/` |

## Demo songs and visualizers

Made from the real SVS 3912 movie (sea surface temperature). Serve with `node serve.js . 8765` from `recipes-browser/`, then open the page.

| Page | What it is |
|---|---|
| `recipes-browser/songs/index.html` | Two songs. Song 1 is from the whole clip: a melody that scans the picture's columns, a bass that follows the whole-view average, drums, and then-and-now bells, with an overlay showing where each note is read and a whole-clip chart. Song 2 is from a single frame. |
| `recipes-browser/single-frame/visualizer.html` | One frame, three ways to hear it (scan, chord, melody), with a marker on the part being read. |
| `recipes-browser/demo-clip/visualizer.html` | An earlier, simpler version of the clip song. |

Both songs are rendered by `recipes-python/make_songs.py`. The camera moves during the clip, so the rise and fall you hear is a change in what is in view, not the ocean warming. Nobody has listened to these yet; the checks so far are that they render, play, and that the overlays match the note lists.

The notes are long (6,000 to 11,000 words each). Each opens with a TL;DR and a "Decisions for the Jukebox build" section; read those two first.

## Known inconsistencies between notes

- **FluidR3_GM licence.** The author's README says MIT; the gleitz hosting repo says CC BY 3.0. Not resolved. Credit both if you use it.
- **Music-credit page count.** Note 01 now says at least 10 EIC pages; other notes may still say 6.
- The notes were written in parallel and were not cross-checked against each other.
