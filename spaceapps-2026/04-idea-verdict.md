# 04: Verdict on "Earthsound" (Earth Information Jukebox)

Written Sat Nov 14 2026, ~12:50 ET. Deadline is Sun Nov 15, 11:59 PM CT (00:59 Mon ET), which leaves about **35 hours**.
Tags: [V] verified, [I] inferred, [U] unknown. Sources: `sources/jukebox.txt` (https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/), `sources/guide-judging.txt` (https://www.spaceappschallenge.org/resources/judging-awards-guide/), 01-winners-analysis.md.

## Fit to the challenge
- The challenge asks for "an interface, script, or application that pairs EIC visual frames with dynamic sonifications generated in real time" and "individuals can select or experience a specific EIC visualization alongside its corresponding soundscape" [V].
- A game is allowed (the "deliverable can take many forms") [V]. But a game alone does not hit the literal ask. **It also needs an Explore/Jukebox mode** where you pick one visualization and hear it.
- The challenge says "Accessibility is a core theme", citing screen readers, tactile feedback and descriptive text [V]. The pitch's audio-first, blind/low-vision framing fits exactly.
- The official data is 11 SVS visualizations [V]. "Live/recent EIC data" (Ambient Watch) and "guess the time period" are **not supported** by that data:
  - The frames are fixed renders.
  - Only night lights 2012→2023 has a real time dimension [V, SVS 5313 title].

## Data access test (run 12:45 ET)
| SVS id | Visual | Flat lat/lon map? | Usable for "where" | Notes |
|---|---|---|---|---|
| 5313 | Night lights 2012–2023 | yes, `nightlights_flat_series...` [V] | yes | 63 KB jpg print |
| 3912 | Sea surface currents + temp | yes, `flat_global_ecco2_2028x1024` [V] | yes | 1 MB jpg |
| 4950 | GEDI forest height | `GEDI_global_w_colorbar` [V]; flat projection [I] | probably | has colorbar → can decode meters |
| 5669 | GEOS aerosols | unknown projection [U] | check | 2.7 MB png |
| 5011 | ISS lightning | preview only seen [U] | check | |
| 5196 / 5533 / 4960 / 5425 | CO2 globe / AQ sphere / 3D AR / ocean close-up | no (globe or 3D renders) [V, filenames] | no (Explore mode only) | |

- All endpoints answered HTTP 200 from `https://svs.gsfc.nasa.gov/api/<id>` [V].
- **CORS is locked** to another origin (`access-control-allow-origin: https://tempo.multiverse.music`) [V]. The browser can't read pixels from svs.gsfc.nasa.gov directly. **Fix:** pre-process the frames offline with Python into small value grids (JSON or PNG) and host them with the app. That's easy and makes the app faster too.
- License: SVS content is NASA-produced and generally free to use with credit to "NASA's Scientific Visualization Studio" [I]. Confirm on an SVS page before submitting.

## Scores (1–5): as pitched → with the changes below
| Criterion | Pitched | Changed | Why |
|---|---|---|---|
| Impact | 3 | 4 | Real accessibility audience; a game alone looks niche, but it's framed as a way to learn Earth science |
| Creativity | 4 | 4 | The guessing-game twist is rare in a crowd of "colors → chords" jukeboxes [I]; the daily-guess format itself is familiar |
| Validity | 2 | 4 | As pitched, it's just "temperature → pitch". With changes, the **game is the listening test**: accuracy vs. chance is measurable, plus a 5-person blindfold test |
| Relevance | 3 | 5 | Needs the Explore/Jukebox mode and official EIC frames only; drop the time-guess and live-data features |
| Presentation | 3 | 4 | The 30-second demo is natural: hear → guess → reveal. The current pitch tries to show 8 features in 30 seconds |

## Award fit (the official definitions are [V] from the guide)
- **Global Connection: "best connects people around the world through technology". Primary target.** The 2023 sonification winner Arcobaleno won this with a blind/low-vision framing [V, NASA.gov].
- **Art & Technology: "most effectively combines technical and creative skills". Secondary.** The challenge explicitly asks for a balance of data and music [V].
- Most Inspirational: possible.
- Best Use of Data ("makes space data accessible"): plausible but long. Science/Data/Tech awards have never gone to sonification [V, 01].
- Local Impact and Galactic Impact: weak fit. Drop.

## Red team: strongest reasons it loses
1. **Scope explosion.** It has 6 modes and features across 5 people. AirPods, Ambient Watch, voice control, motion and a globe are each multi-hour risks. An unfinished, broad app loses to a narrow working one (lesson #10, 01).
2. **The accessibility contradiction.** The game is audio-first, but the guess is made by clicking a map, and a blind player can't click a map. Judges who take the stated "core theme" seriously will spot this. **Fix:** a 4-option guess, spoken and keyboard-navigable; the map is optional.
3. **Sounds may be indistinguishable.** If Amazon and Congo sound the same, the game is unplayable and the validity claim dies. **This is the #1 technical risk; test it by hour 3.** Fix: use a multi-layer sound fingerprint (forest height + night lights + sea temp + lightning/aerosol), each layer with its own instrument (Maysen's sound-per-element idea).
4. **Raw-hue sonification is scientifically weak.** Fix: decode colorbars into physical values (forest height in m, SST in °C) and sonify those, then publish the mapping table.
5. **Crowding.** There are ~111+ Jukebox repos [I, 02]. To stand out we need a game and measured accessibility, not prettier audio.
6. **Prior art.**
   - SongSAT (2018, land cover → music) and Arcobaleno (2023, images → sound for blind users) [V].
   - No past winner used a guess-the-place game [I; search not exhaustive].
   - Avoid "Wordle"/"Worldle" in the name or copy (trademark).
7. **Demo risk.**
   - Audio in a 30-second video needs subtitles plus a visible waveform or caption so judges understand what they're hearing.
   - Phone motion (DeviceOrientation) needs HTTPS and an iOS permission prompt; it's fine on GitHub Pages [I] but adds little in the video.
   - Don't use "Siri" branding; use the Web Speech API.

## Probability bands (base: ~10% become nominees; ~45 finalists of ~11.5k ≈ 0.4%; winner ≈ 0.09%)
| Stage | As pitched | With changes, executed well |
|---|---|---|
| Chicago nominee (1–3 advance [V, 2022 guide]) | 10–15% | 25–35% |
| Global Finalist / HM | ~1% | 3–6% |
| Global Winner | ~0.2% | 0.7–1.5% |
These are judgment calls [I]. Field size at Chicago is [U].

## VERDICT: **GO-WITH-CHANGES**
1. **The game format is the validity proof.** "Players identified the hidden place X% of the time vs 25% chance" is a benchmark that almost no other Jukebox entry will have. That turns the weakest criterion into the strongest.
2. **Data is confirmed reachable.** At least 3 flat, geo-mappable EIC frames (night lights, SST, GEDI). A static web app plus offline preprocessing removes CORS and backend risk.
3. **Scope must shrink about 70%, and the accessible-input contradiction must be fixed,** or this becomes a pretty, unfinished build that loses at Chicago.

## Required changes
- **MUST:**
  - One engine: sample frame → decode colorbar → value → Web Audio.
  - **Explore mode:** pick an EIC visual; arrow keys/drag move a "listening cursor" and the sound changes. This is the "Move" step, accessible via keyboard.
  - **Guess mode:** 5 hand-picked rounds, 4 spoken choices, hint layers, score, reveal card with data and why it matters.
  - Screen-reader labels and captions.
  - A mapping table on the page.
- **MUST (promoted):** Phone tilt as the cursor (DeviceOrientation API: iOS Safari needs `requestPermission()` on a tap, plus HTTPS). With VoiceOver on, screen touches go to VoiceOver, so tilt is the main non-visual way to move on a phone [I]. WebAIM SR Survey #10: 91.3% of screen-reader users use one on mobile; 70.6% use VoiceOver (https://webaim.org/projects/screenreadersurvey10/) [V via search summary].
- **SHOULD:**
  - Voice answers (Web Speech API).
  - In-app accuracy logging.
  - A 5-person blindfold test.
- **CUT:**
  - AirPods head tracking.
  - Ambient Watch.
  - Guessing the time period (except as an optional night-lights 2012 vs 2023 bonus).
  - Globe, leaderboard, celestial objects.
  - Spotify-style hierarchy: becomes a simple list of the 5–10 visuals.

## Correction (13:30 ET): the EIC items are animations, not static images
Checked via `https://svs.gsfc.nasa.gov/api/<id>` [V]:
- Most entries have MP4s and numbered frame sequences.
- Time spans, from the SVS descriptions [V]:
  - Night lights: annual averages 2012→2023.
  - ISS lightning: Jan 2017–Jul 2023, 10-day rolling window.
  - DYAMOND CO2: Jan–Mar 2020.
  - GEDI: global with camera moves.
  - Sea surface currents + temp: animated flow.
- What this changes:
  - The sound can evolve over time (frame by frame), not just by place.
  - Night lights supports a "which year/decade" bonus.
  - Still no live feed: these are finished, pre-rendered datasets, so Ambient Watch is still cut.
