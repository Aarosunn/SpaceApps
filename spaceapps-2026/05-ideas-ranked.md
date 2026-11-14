# 05: Phase 3 — red team results and the final three

Written Sat Nov 14 2026, ~2:20 PM ET. About 33 hours to the deadline (Sun 11:59 PM CT).
Built from three independent sessions that did not see the earlier verdict (04):
- `notes/R1-judge-redteam.md`: skeptical judge.
- `notes/R2-technical-redteam.md`: measurements on the real NASA frames.
- `notes/I1-ideas.md`: 10 fresh ideas across all challenges, with data tests.

Tags: [V] verified/measured in those reports, [I] inferred, [U] unknown.

## What the red team changed about Earthsound

| Finding | Source | Consequence |
|---|---|---|
| "Guess the place" mostly fails on this data. Of 91 place pairs, 29 differ on two or fewer of five layers. Amazon = Borneo; Gulf Stream = mid-Pacific. About 60% of places are near-silent in most layers. | R2 [V] | Drop "guess the place" as the core question. |
| "Guess the place" tests geography and instrument memory, not data listening. Beating 25% proves little. | R1 [I] | The validity claim in 04 was wrong as designed. |
| Night-lights change 2012→2023 is strong and measurable. Brightened: Nairobi +170%, Dhaka +116%, Delhi +80%, Jakarta +80%, Beijing +75%. Dimmed: Kyiv −43%, Paris −40%, Damascus −24%, London −19%. Two independent measures agree (Spearman 0.72). | R2 [V] | Make "what changed / which has more" the core question. |
| GEDI forest height has no flat map; every render is a globe. | R2 [V] | 04 was wrong to count it. Drop GEDI. |
| Usable flat layers: night lights (2012, 2023, change), sea surface temperature (decodable to °C, roughly ±1–2 °C), ISS lightning (dot counts). Aerosols, CO2 and air quality are not decodable to values. | R2 [V] | Three layers only. |
| Sea surface temperature swings 9–11 °C by season at one place, more than the gap between places. | R2 [V] | Pin one frame or use a mean. |
| The night-lights frame holds two stretched world copies, left edge at lon −168.8. A naive lookup put Tokyo in the ocean. | R2 [V] | Map calibration is a real task; check against known cities. |
| Listeners track about 2–3 sound streams at once. | R2 [V, secondary sources] | Max 3 voices; the pitch's 6 layers is too many. |
| A 2025 study of 106 screen-reader users: sonification helps with trends and overview, not geographic detail. | R1 [V per report] | Supports change/compare questions. |
| The accessibility claim is performative unless a blind person tests it. | R1 [I] | Get one blind screen-reader tester by Sunday noon. |
| iPhone tilt with VoiceOver on is unproven. | R2 [U] | Tilt becomes optional; buttons and keyboard are the main path. Test on a real iPhone first. |
| Reduced scope is ~78 developer-hours against ~80–88 available; the original scope is 130+. | R2 [I] | No slack. Freeze features Sunday 3 PM CT. |
| SVS content is public domain (https://svs.gsfc.nasa.gov/help/). | R2 [V] | License risk closed. |

Prior art (R1): Face The Music (2019) and Aria EarthMOOG (2018) were similar Space Apps projects that stopped at Global Nominee. Arcobaleno (2023) won Global Connection with the blind-accessibility angle.

## The final three

### 1. Earthsound v2 — "hear what changed" (The Earth Information Jukebox)
- **Pitch:** A jukebox of NASA Earth visualizations you can listen to, with a daily ear-training challenge: hear a city's lights in 2012 and 2023 and say whether it brightened or dimmed, or hear two places and say which has more. Built so a blind player gets the same answer a sighted one sees.
- **Target award:** Art & Technology first. Best Use of Data ("best makes space data accessible") second. Global Connection only if the blind tester result is strong.
- **Data:** SVS 5313 night lights (hero), SVS 3912 sea surface temperature (one pinned frame), SVS 5011 ISS lightning. All public domain, no login, pre-processed offline into small grids.
- **Landing page = the jukebox:** pick one of three visualizations, see it, hear it, move a listening cursor (keys, buttons; tilt optional). This is the literal challenge ask.
- **Challenge inside it (5 rounds a day, date-seeded):**
  - "Then and now": hear one city in 2012, then 2023. Brighter or dimmer?
  - "Which has more": hear two places. Which has more light / warmer water / more lightning?
  - Pairs are pre-filtered so the data gap is large enough to hear.
- **Reveal card:** the measured number ("Nairobi: +170% since 2012") and the story behind it.
- **Teaching:** a 45-second spoken tutorial, and a "say the value" key that speaks the number under the cursor.
- **Demo wow (30 s):** two sounds of one city, 11 years apart; the viewer guesses with the player; the reveal shows the map and the number.
- **Validity evidence:**
  1. Every answer has ground truth from NASA data.
  2. Listening test with 8–10 people, before and after the tutorial, reported against 50% chance.
  3. Calibration check: known cities land on the right pixels.
  4. One blind screen-reader user's session, with their feedback quoted.
- **Kept from the team's ideas:** daily challenge, reveal and learning (core loop); sound-per-element (three distinct voices); browse list (the jukebox); spoken help; phone tilt (optional).
- **Cut:** guess-the-place, difficulty ramp by similar places, six layers, GEDI/CO2/aerosol/air-quality as data layers (they can appear as watch-only jukebox items if time allows), leaderboard, AirPods, ambient watch, globe.
- **Simplify:** scoring becomes correct/incorrect with a streak; one hint (replay slower, or isolate one voice).
- **Biggest risks:** most crowded challenge (~100+ repos [I]); no schedule slack; blind tester not found in time.
- **Odds [I]:** Chicago nominee 30–35%; global finalist 2–3%; global winner 0.5–0.8% (R1's estimate with edits).

### 2. Fire Rosetta (Harmonization of MODIS and VIIRS Hot Spots)
- **Pitch:** One consistent fire record across NASA's old (MODIS) and new (VIIRS) satellites, so a fire scientist can compare 2012 with 2023 without the sensor change faking a trend.
- **Target award:** Best Use of Science.
- **Data:** NASA FIRMS, the only resource the challenge lists. No login. Four real CSV files already pulled (MODIS Terra and VIIRS-SNPP, Argentina, 2012 and 2023) [V].
- **Finding already in hand:** VIIRS reports 2.9× to 5× as many detections as MODIS depending on the month, so a single correction factor is wrong [V]. MODIS confidence is numeric; VIIRS uses letters [V].
- **MVP:** a month- and region-aware conversion model fitted on the years both sensors overlap, a held-out test showing error against the naive single-factor method, and a "burn calendar" page showing the harmonized record.
- **Demo wow:** the raw chart shows fires "tripling" when the sensor changes; one click applies the correction and the fake jump disappears.
- **Validity:** held-out overlap years, error bars, comparison to the naive baseline. This is the strongest validity story of the three.
- **Risks:** less emotional pull in a room of generalist judges; needs someone comfortable with statistics; medium crowding.
- **Odds [I]:** Chicago nominee 25–30%; global finalist 3–5%; global winner ~1%. My estimate, same uncertainty as above.

### 3. SPHEREx Blink + Spectra (Planet X and SPHEREx)
- **Pitch:** A blink comparator for NASA's newest sky survey: flip between two epochs to spot what moved, then pull up its spectrum.
- **Target award:** Best Use of Data.
- **Data:** SPHEREx via IRSA. Two real cutouts of Barnard's Star (2025-08-27 and 2026-03-11) read fine and the star shifts ~1.4 px [V].
- **Not proven:** the download URL and pixel scale are unknown and a catalogue query returned 0 rows [U]. The data path must be re-established before committing.
- **Fit:** low–medium crowding; Chicago's partner is Northwestern's astrophysics center [V], which may help with local judges [I].
- **Risks:** FITS handling, unproven data path, astronomy knowledge needed.
- **Odds [I]:** highest ceiling if the data works, highest chance of an unfinished build.

## Ranking

| | Impact | Creativity | Validity | Relevance | Presentation | Feasible in 33 h | Crowding |
|---|---|---|---|---|---|---|---|
| Earthsound v2 | 4 | 4 | 4 | 5 | 4 | 3 | High |
| Fire Rosetta | 3 | 3 | 5 | 5 | 3 | 4 | Medium |
| SPHEREx Blink | 3 | 4 | 3 | 4 | 4 | 2 | Low–medium |

Scores are mine [I], on the official 1–5 scale. R1 scored the original Earthsound 15/25; v2 is scored assuming the edits above are actually built.

## Recommendation: Earthsound v2, with a hard gate
- Earthsound v2 and Fire Rosetta are within my margin of error on odds. Execution decides it.
- Earthsound v2 wins the tie because the team already owns it, it shows best in a 30-second video, and the red team's edits fix its two real flaws (wrong question, unproven accessibility).
- **Gate, 3 hours after go:** two people who haven't seen the data listen to five "then and now" pairs. If they can't beat chance clearly, switch to Fire Rosetta, whose data is already on disk.
- Fire Rosetta is the better choice if the team would sooner do rigorous statistics than sound design, or if no one can find a blind tester.

## Head-to-head: original Earthsound vs v2
| | Original | v2 |
|---|---|---|
| Question | Which place is this? | What changed? Which has more? |
| Answerable from the data | For ~40% of places | Yes, pairs pre-filtered |
| Layers | 6 | 3 |
| Validity proof | Accuracy vs 25% (weak) | Ground-truth answers + before/after listening test |
| Accessibility | Claimed | Tested with a blind user |
| Developer-hours | 130+ | ~78 |
