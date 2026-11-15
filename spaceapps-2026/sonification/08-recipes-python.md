# 08 - Python recipes (frames -> features -> sound)

> Status: code written by a research worker; every script below was re-run on 2026-11-14 (Python 3.14, numpy 2.5, Windows) and its built-in checks passed. The worker ran out of credits before writing its own walkthrough, so this page is a short index. Read the docstring at the top of each file for details.

The code is in [recipes-python/](recipes-python/). Only numpy and the standard library are needed, except where noted.

## Run it

```bash
cd recipes-python
```

```bash
python p6_features.py
```

```bash
python p7_render.py
```

Each script runs a self-test on synthetic data, writes its output next to itself, and prints `Pn all checks passed`.

## What each file does

| File | Recipe | What it does | Output |
|---|---|---|---|
| `wavio.py` | P1 | Writes a float numpy array to 16-bit WAV (normalise, fade, soft limiter); rejects silent files | `p1_*.wav` |
| `synth.py` | P2 | Oscillators, ADSR envelope, low-pass filter, equal-power pan, simple reverb | `p2_phrase.wav` |
| `musickit.py` | P3 | MIDI <-> frequency, scales, quantise a 0..1 value to a scale, chords, Euclidean rhythm | printed checks |
| `p4_colscan.py` | P4 | Image column scan (the "inverse spectrogram" baseline), log-spaced and scale-snapped versions | `p4_colscan_*.wav` |
| `p5_colormap.py` | P5 | Colourmap inversion: pixel colour -> data value via the colour bar, then zonal means -> chord | `p5_zonal_chord.wav` |
| `p6_features.py` | P6 | Frame stack -> `timeline.json` (global mean, grid means, motion, flash events) | `timeline.json` |
| `p7_render.py` | P7 | Renders a full piece from `timeline.json`: pad, lead, percussion | `p7_piece.wav`, `p7_sync.wav` |
| `p8_midi.py` | P8 | Pure-Python MIDI file writer, for dropping notes into a DAW | `p8_piece.mid` |
| `score.py` | - | Shared note-scheduling helper used by P7 and P8 | - |
| `s1_svs_fetch.py` | S1 | Lists an SVS page's media through the public API and downloads a few frames | `frames_<id>/` |
| `real_demo.py`, `real_probe.py` | - | The pipeline on a real SVS 3912 movie; needs raw frames cut with ffmpeg first | - |

## Results confirmed on this machine

- P1 to P8 all pass their checks. Example: P7 wrote a 14.0 s stereo WAV, peak -1.00 dBFS.
- Euclidean rhythms match the published patterns: E(3,8) = `x..x..x.`, E(5,8) = `x.xx.xx.`.
- `p6_features.py` recovers the planted trend and flash events from its synthetic frames.

## What the worker found on real data (not re-run by me)

- The SVS API returns `media_groups[].items[].instance.{url, filename, media_type, width, height}`; `media_type` is Image, Movie or Frames.
- On a real SVS 3912 frame, matching pixels to the colour bar in full OKLab matched only 0.3 to 2.1 percent of pixels, because the rendering dims the colours. Matching on hue only is the fix, and `p5_colormap.py` implements it.
- The colour bar for 3912 (`sst_ecco2_cbar.png`) spans 0 to 32 C.
- WSL already has an environment at `~/eicenv` with Pillow and imageio-ffmpeg (which bundles ffmpeg). Windows Python has neither.

## Known gaps

- `real_demo.py`, `real_probe.py` and `s1_svs_fetch.py` were not re-run in the final check.
- No ffmpeg command lines are written up here; see section 11 of [02-frame-analysis-algorithms.md](02-frame-analysis-algorithms.md) and the docstring of `real_demo.py`.
- Nobody has listened to any of the output WAVs.
