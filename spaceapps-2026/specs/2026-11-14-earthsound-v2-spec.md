# Earthsound v2 — Spec

Status: approved direction (Phase 3, `05-ideas-ranked.md`). Written Sat Nov 14 2026, ~3 PM ET.
Challenge: **The Earth Information Jukebox** (https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/).
Deadline: **Sun Nov 15, 11:59 PM CT** (official Judging & Awards Guide). Feature freeze: **Sun 3:00 PM CT**.
Target award: **Art & Technology**, then Best Use of Data. Global Connection only if the blind-tester result is strong.

## 1. One-liner
A jukebox of NASA Earth visualizations you can hear, with a daily 5-round ear-training challenge ("did this city get brighter?", "which ocean is warmer?"). Every answer is checked against NASA data, and the game works fully without sight.

## 2. Users
- **Primary:** blind and low-vision people on phones. WebAIM Survey #10 found 91.3% of screen-reader users use one on mobile, 70.6% use VoiceOver (https://webaim.org/projects/screenreadersurvey10/).
- **Secondary:** sighted students and the general public, and the judges.

## 3. Data (all public domain per https://svs.gsfc.nasa.gov/help/; no login)
| Layer | Official source | File used | Geometry | Decoded value |
|---|---|---|---|---|
| Night lights 2012 / 2023 / change | SVS 5313 | 3 frames from `nightlights_flat_series_and_change_wZooms_13_EIC_2160p30_h265.mp4` (7680×2160) | Left world copy is 3840×2160; left edge at **lon −168.8**; 360°×180° stretched (R2 calibration) | Relative light sum; p99 brightness 0–255; change-map sign |
| Sea surface temperature (March 2007 frame) | SVS 3912 | `f23000.tif` 2048×1024 + `sst_ecco2_cbar.png` | Equirectangular, −180..180 | °C via colorbar hue (±1–2 °C) |
| ISS lightning | SVS 5011 | 40 frames from `iss_lightning_sos_yearly_07312023_2048p60.mp4` (2048×1024) | Equirectangular, −180..180 | Yellow-dot counts per hemisphere/cell |
| CO2 (match round thumbnail only) | SVS 5196 | one frame | globe render | none (image features only) |

Raw files already exist in `spaceapps-2026/notes/feasibility/data/` (downloaded and measured in R2/R3).

## 4. Product

### 4.1 Jukebox (Explore) — the landing tab, the literal challenge ask
- Pick one of 3 visualizations (night lights 2023, sea surface temperature, lightning).
- The image is shown with a listening cursor; a continuous tone plays the value under the cursor.
- **Move:** arrow keys (2° steps), on-screen arrow buttons, optional phone tilt (DeviceOrientation; iOS permission on tap).
- **V key / "Say value" button:** announces lat/lon plus the value in words via the aria-live region (and speech if narration is on).

### 4.2 Daily challenge — 5 rounds, the same for everyone (date-seeded)
| # | Round type | Sound | Question | Options | Chance |
|---|---|---|---|---|---|
| 1 | **match** | Chord from the image's features (hue → root, brightness → register, saturation → voices, edge density → pulse rate) | Which visualization made this sound? | 4 thumbnails | 25% |
| 2 | **thenNow** | One glide from 2012 to 2023; the glide's size = 12·log2(l2023/l2012) semitones, clamped ±12 | Did this city get brighter or dimmer? | 2 | 50% |
| 3 | **whichMore** | Two tones, left then right; pitch = value | Which has more light / warmer water? | 2 | 50% |
| 4 | **season** | High clicks = northern-hemisphere lightning rate, low clicks = southern | Northern or southern summer? | 2 | 50% |
| 5 | **rank3** | Three glides, left / centre / right | Which city's lights grew the most? | 3 | 33% |

- thenNow picks brighter/dimmer 50/50 from the seed, because the natural pool is 82% brighter (R3).
- Pools are pre-filtered so differences are audible:
  - thenNow: |change| ≥ 30% and change-map sign agrees.
  - whichMore light: p99 gap ≥ 60.
  - whichMore SST: gap ≥ 5 °C.
  - season: hemisphere ratio > 2 or < 0.5.
  - rank3: pairwise growth gap ≥ 25 points.
- **Reveal after each answer:** correct/incorrect plus the measured number and source, e.g. "Dhaka: lights grew 116% between 2012 and 2023 (NASA SVS 5313)". An optional story line comes from `stories.json`.
- **End:** score, best streak, a copyable share line. No leaderboard, no timer.

### 4.3 Tutorial (45 s)
- Four demo buttons, one per sound type ("rising glide = more light", etc.).
- Plain text, read by screen readers; optional spoken narration.

### 4.4 Listening-test mode (the validity evidence)
- URL params `?tester=ID&phase=pre|post&seed=N`.
- Every answer is logged to localStorage: tester, phase, seed, round, type, answer, correct, ms.
- "Download results (CSV)" exports the log. No server.

## 5. Accessibility requirements
- Native `<button>`/`<select>` only.
- Every prompt and reveal goes to `aria-live="polite"`.
- Keyboard: 1–4 answer, Space replays, V says value, arrow keys move.
- Visible focus, high contrast, `prefers-reduced-motion` respected (no animation used anyway).
- Narration via speechSynthesis is **off by default** (it talks over VoiceOver).
- Captions: every sound has a text description in the reveal.
- **Test on a real iPhone with VoiceOver before Sun 10 AM CT.**

## 6. Validity evidence (what goes in the submission)
1. **Calibration:** pytest checks known cities land on lit pixels and known values reproduce (Dhaka > +50%, Kyiv < −15%, Mid-Pacific warmer than the Kuroshio in March by > 5 °C).
2. **Ground truth:** every round's answer is computed from NASA pixels by the pipeline; the method is published in the README.
3. **Listening test:** 8–10 people.
   - pre phase: seeds 101 and 102, 10 answers, no tutorial.
   - post phase: seeds 201 and 202, after the tutorial.
   - Report accuracy per round type against chance.
4. **Blind tester:** one screen-reader user does the post phase; their quotes go in the submission.

## 7. Non-goals (cut)
- Guess-the-place.
- GEDI, aerosols and air quality as data layers.
- AirPods, ambient watch, globe, leaderboard, native app, free-form voice commands.

## 8. Risks and gates
- **Gate G1 (Sat ~9 PM ET):** 2 naive listeners take 5 thenNow + 5 whichMore rounds. If either type is under 70%, fix the mapping. If still failing by Sun 1 AM ET, switch to Fire Rosetta (`05-ideas-ranked.md`).
- **Night-lights calibration off:** the pytest calibration tests fail loudly.
- **Tilt plus VoiceOver doesn't work:** tilt stays optional; buttons and keys are the main path.
- **No blind tester found:** submit with the sighted listening test only; lead with Art & Technology.

## 9. Stack
- Python 3 + numpy + Pillow (offline pipeline), pytest.
- Static HTML + vanilla JS ES modules + Web Audio API (no framework, no audio library). `node --test` for the pure logic.
- GitHub Pages via Actions.
