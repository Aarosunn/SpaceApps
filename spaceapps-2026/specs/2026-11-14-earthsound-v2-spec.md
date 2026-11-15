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

### 4.2 Challenge — 3 fixed, hand-curated days × 5 rounds
- `days.json` lists 3 days of 5 round ids. The pipeline picks the most audible and dramatic rounds; the team swaps in better stories by hand.
- **Day 1:** listening-test pre phase. **Day 2:** reserved for the live pitch, so judges get fresh rounds. **Day 3:** listening-test post phase.
- Pitch line: "a new set daily in the full version" (no code for it).
| # | Round type | Sound | Question | Options | Chance |
|---|---|---|---|---|---|
| 1 | **match** | Chord from the image's features (hue → root, brightness → register, saturation → voices, edge density → pulse rate) | Which visualization made this sound? | 4 thumbnails | 25% |
| 2 | **thenNow** | One glide from 2012 to 2023; the glide's size = 12·log2(l2023/l2012) semitones, clamped ±12 | Did this city get brighter or dimmer? | 2 | 50% |
| 3 | **whichMore** | Two tones, left then right; pitch = value | Which has more light / warmer water? | 2 | 50% |
| 4 | **season** | High clicks = northern-hemisphere lightning rate, low clicks = southern | Northern or southern summer? | 2 | 50% |
| 5 | **rank3** | Three glides, left / centre / right | Which city's lights grew the most? | 3 | 33% |

- The days mix brightening and dimming cities, because the natural pool is 82% brighter (R3).
- Pools are pre-filtered so differences are audible:
  - thenNow: |change| ≥ 30% and change-map sign agrees.
  - whichMore light: p99 gap ≥ 60.
  - whichMore SST: gap ≥ 5 °C.
  - season: hemisphere ratio > 2 or < 0.5.
  - rank3: pairwise growth gap ≥ 25 points.
- **Synced reveal (the hero moment):**
  - thenNow: zoom into the city on the original EIC night-lights frame, crossfading 2012 → 2023 while the glide replays.
  - Compare rounds: rings and labels on the original EIC map.
  - Season rounds: the actual lightning frame.
  - Respects `prefers-reduced-motion`.
- **Reveal text after each answer:** correct/incorrect plus the measured number and source, e.g. "Dhaka: lights grew 116% between 2012 and 2023 (NASA SVS 5313)". An optional story line comes from `stories.json`.
- **End:** score, best streak, a copyable share line. No leaderboard, no timer.

### 4.2b Intro
- "Put your headphones on" screen with one Start button. The tap also unlocks audio on iOS.

### 4.2c Visuals
- Always show the original EIC imagery. Never recolor the data.
- Use high-resolution frames (1440 px maps, 720 px city crops), not small thumbnails.
- Our layer goes on top: cursor, rings, labels, the crossfade.
- Story-led rounds and `stories.json` lines make it engaging, alongside the synced reveal.

### 4.2d Data scope
- Challenge rounds use **EIC (SVS) data only**, for Relevance.
- Reveal text may cite other NASA sources for context, each listed in References.

### 4.3 Tutorial (45 s)
- Four demo buttons, one per sound type ("rising glide = more light", etc.).
- Plain text, read by screen readers; optional spoken narration.

### 4.4 Listening-test mode (the validity evidence)
- URL params `?tester=ID&phase=pre|post&day=1|2|3`.
- Every answer is logged to localStorage: tester, phase, day, round, type, answer, correct, ms.
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
   - pre phase: Day 1, no tutorial.
   - post phase: Day 3, after the tutorial.
   - Per person that's 5 answers per phase (one per round type), so ~40–50 answers per phase for 8–10 people.
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

## 8b. Demo formats
- **Chicago live pitch: 5 minutes** (confirmed by the team). A judge plays Day 2 with headphones.
- **Global judging:** 30-second video built around the synced reveal (hear, guess, zoom and crossfade, the number), plus the public project page.

## 9. Stack
- Python 3 + numpy + Pillow (offline pipeline), pytest.
- Static HTML + vanilla JS ES modules + Web Audio API (no framework, no audio library). `node --test` for the pure logic.
- GitHub Pages via Actions.

## 10. Postponed (decide later)
- Sound design beyond the value-to-sound mapping (timbre, drone, levels, phone speakers).
- Visual design (style, typography, overlay look).
- Final name ("Earthsound" is a placeholder).

## 11. Pitch day (1 day, 3 rounds) — supersedes §4.2 round types
Format per round: reference sound → mystery sound → 4 options labelled with values → reveal + takeaway.

| Round | Data (EIC) | Reference | Mystery | Options | Reveal / takeaway |
|---|---|---|---|---|---|
| 1 Lights On | Night lights 2012→2023, SVS 5313 | Johannesburg −2% (flat) | Nairobi | Nairobi +170% · Mumbai +73% · Shanghai +52% · Cairo −3% | Dark map, lights grow year by year in the 4 cities. "Lights show where people and power are growing." |
| 2 Rising Seas | Sea level, SVS 5235 (Climate Vital Signs) | 1993 = 0 cm | 2013 | 2003 +3.0 · 2013 +6.5 · 2018 +9.1 · 2023 +11.3 cm | Porthole waterline rises 1993→2023. "Seas rose ~11 cm in 30 years, and faster each decade." |
| 3 Arctic Heat | GISTEMP map 1880–2023, SVS 5207 (Climate Vital Signs) | 1951–80 avg = 0 °C | Arctic 2016 | 1880s −1.0 · 1986 +0.2 · 2001 +1.3 · 2016 ≥+2 °C | Map turns red decade by decade. "The Arctic warms far faster than the rest of Earth." |

Sources: R3 (round 1), R4 `notes/R4-eic-datasets.md` (rounds 2–3). Verify the round 2–3 labels against NASA's published sea-level and GISTEMP numbers before shipping. Glide cap ±18 semitones.

## 12. Two modes (decided 2026-11-14)
- **Game mode:** the pre-saved, curated rounds (section 11).
- **Globe mode:** replaces the flat Jukebox. One globe per day theme (lights, sea level, Arctic heat). Explore anywhere; the sound is generated procedurally from the data under the cursor (or from the visual where no decodable values exist).
- Flags:
  - The globe adds a 3D rendering dependency (e.g. three.js / globe.gl, pinned version).
  - Sea level (SVS 5235) is a chart, not a map, so its globe theme needs a different layer.
- Designs come from Figma via the Figma MCP.
