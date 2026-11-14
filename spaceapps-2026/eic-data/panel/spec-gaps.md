# Missing information for the Earthsound v2 build

> 2026-11-14, 17:15-20:50 UTC. Produced by AI agents (Claude Sonnet) working from the saved NASA evidence and the team's files. Each item cites its evidence; nothing here has been checked by a person.

Most severe first. Line numbers refer to `specs/2026-11-14-earthsound-v2-spec.md` and `plans/2026-11-14-earthsound-v2.md`.

## 1. Jukebox night-lights layer spans only about 4 semitones, so the headline demo sounds nearly flat  (blocker)

The Jukebox night-lights grid stores the MEAN brightness of each 2 degree cell divided by 255 and the layer is scaled 0..1. Cities occupy a few pixels of the cell, so values are tiny: grid max 0.429, median 0.004, 99th percentile 0.13. explore.js maps u=(v-min)/(max-min) through freqFromUnit (24 semitones over 0..1, quantised to pentatonic). Result: Chicago 0.173 -> 277 Hz, Tokyo 0.132 -> 247 Hz, Dhaka 0.07 -> 247 Hz, Cairo 0.175 -> 277 Hz, mid-Atlantic 0.004 -> 220 Hz. Only 5 distinct pitch steps are used and 99.9% of cells sit in the lowest 3 steps (220-277 Hz, under a major third). Dark ocean is a steady 220 Hz tone rather than silence. Plan Task 8 step 2 only checks 'Tokyo is high', which passes by ear on a 247 vs 220 Hz difference nobody has heard yet. The Jukebox is the literal challenge ask and the landing tab.

- **Evidence:** plan lines 522-524 (nl(): window(...).mean()/255), line 533 (layer 'nl', min 0, max 1), line 1088 (u = (v-layer.min)/(layer.max-layer.min)), sound.js line 632 (freqFromUnit, x24). Measured by running the plan's own code (sliced verbatim from the plan) on notes/feasibility/data/frames/nlfull_8.png, script spaceapps-eic-evidence/tmp/critic_gaps_run2.py: NL grid shape (90,180) max 0.429 p50 0.004 p90 0.125 p99 0.13; distinct pitch steps 5; share of cells in lowest 3 steps 0.999; Chicago freq 277.2; Mid-Atl freq 220.0.
- **Fix:** In build.py write_grids take the max (or 90th percentile) of the cell window instead of the mean, then map sqrt or log of it onto 0..1 with hi about the 99th percentile (about 0.13), e.g. min(1, sqrt(v/0.15)). Treat values below a floor as silence (gain 0) so ocean is quiet. Then listen: Chicago, Tokyo, Dhaka and the Atlantic must be at least an octave apart. About 20 minutes.
- **Who:** Dev A (pipeline) for the grid scaling, Dev D (explore) to listen and confirm

## 2. Jukebox sea-temperature layer reports open ocean as 'land, no ocean data' in about 41% of ocean cells  (high)

write_grids calls sst_at(T, lat, lon, r=1) but sst_at returns None unless more than 20 pixels in the window carry decoded colour. Only about 12-43% of ocean pixels in the SST frame carry colour (flow-line texture, black gaps, dark cold water fails the saturation gate). A r=1 window at 2048 px is about 12x12=144 px; a sample window at the equator/prime meridian held only 39 valid pixels and sparser windows fall below 20. words() then says 'land, no ocean data' and the tone goes silent. The daily rounds use r=3 and are fine, which is why the plan's tests (they only probe the rounds' points) cannot see it.

- **Evidence:** plan lines 299-303 (sst_at, >20 valid), line 527 (r=1 in the grid), line 1069 (words(): 'land, no ocean data'). Measured with the plan's code on sst/f23000.tif (tmp/critic_gaps_run3.py): share of None cells 0.602 at r=1 vs 0.329 at r=3; 4429 of 10875 cells valid at r=3 become None at r=1. R3 note line 28 already warned that window means need at least 20 valid pixels.
- **Fix:** Use r=3 (or nearest-valid fill within 3 cells) for the grid and keep a separate land mask from the r=3 result so only real land is silent. Re-run the count: the None share should fall to about 0.33. Add a pytest that ocean cells reading None stay below 40% of cells. About 15 minutes.
- **Who:** Dev A (pipeline)

## 3. The listening test and Gate G1 cannot reach the numbers the spec promises  (high)

Pre phase = seeds 101 and 102 = 2 answers per round type per tester, so 8-10 testers give 16-20 trials per type. A one-sided p<=0.05 against 50% chance needs 12/16 or 15/20, i.e. 75%. A listener whose true accuracy is 70% passes that bar only about 42-45% of the time. With 10 trials the 70% line is indistinguishable from chance (P(>=7/10 by guessing)=17%; 9/10 needed). Gate G1 is worse: 2 listeners x seeds 101,102 = 4 thenNow and 4 whichMore answers, not the 5 the plan says; P(>=3/4 by guessing)=31%, and only 4/4 (6%) beats chance. G1 cannot tell a working mapping from a broken one, yet it triggers a pivot to Fire Rosetta at 1 AM. Each tester also sees only 2 distinct items per type, so a type's result is really the result of 2 specific items.

- **Evidence:** spec lines 74-77 (pre seeds 101/102, post 201/202, 8-10 people) and line 85 (G1: under 70% -> fix, then pivot); plan line 28 and line 1167 (G1 text), lines 1236-1241. Binomial arithmetic (Python math.comb): n=4 P(>=3)=0.312, P(4/4)=0.062; n=10 P(>=7)=0.172, need 9/10; n=16 need 12/16=75%; n=20 need 15/20=75%; power at true 70% = 0.45 (n=16), 0.42 (n=20). rank3 (chance 1/3) needs 9/16 or 11/20; match (chance 0.25) needs 8/16 or 9/20.
- **Fix:** Decide now, in writing: (1) G1 becomes a sanity check with 3+ listeners and 6 seeds each, or a check that mapping beats a fixed guess, with 5/6 = go; drop '70% of 4'. (2) Raise per-type trials: 6 seeds pre and 6 post (30 answers per type), or report exact binomial intervals instead of a pass line. (3) In the README report counts and a Clopper-Pearson interval, not a pass/fail claim. 10 minutes to decide; code is only extra seeds.
- **Who:** Business lead with Dev C (game/UI)

## 4. Round prompts name the cities, so the listening test measures world knowledge, not hearing; test seeds are also unbalanced  (high)

thenNow says 'Listen to Kyiv at night', whichMore says 'Left: Chicago. Right: Lagos', rank3 names all three cities. Dhaka brighter, Kyiv dimmer and Chicago brighter than Lagos are guessable from general knowledge. The Dimmer pool is 6 cities (Damascus, Kyiv, Paris, Kharkiv, Odesa, Donetsk; 4 are Ukraine/Syria), so 'war-zone city means dimmer' is learnable without hearing anything. Porting game.js mulberry32 shows the four test seeds are unbalanced: 101 -> Brighter, 102 -> Dimmer, 201 -> Brighter, 202 -> Brighter. The post phase has no Dimmer thenNow round, so 'always say brighter' scores 100% on post and 50% on pre, and the pre-to-post gain is partly a base-rate artefact. Pre and post also use different seeds (different items), so learning cannot be separated from item difficulty.

- **Evidence:** plan lines 463, 474, 486, 509 (prompts contain the names); line 778 and R3 lines 8, 17 (82% brighter base rate). Pool from the plan's own code: thenNow 34 rounds = 28 up, 6 down (Damascus -0.47, Kyiv -0.51, Paris -0.39, Kharkiv -0.41, Odesa -0.44, Donetsk -0.51). The mulberry32 port in tmp/critic_gaps_run2.py gives thenNow wants Brighter/Dimmer/Brighter/Brighter for seeds 101/102/201/202. Spec lines 74-77.
- **Fix:** In test mode (tester param present) hide place names: 'Place A / Place B' for whichMore and 'first / second / third' for rank3, with names only in the reveal. Choose the four test seeds so each phase has one Brighter and one Dimmer thenNow, and counterbalance (half the testers get 101/102 as pre, half as post). About 20 minutes of code plus a 5-line seed search.
- **Who:** Dev C (game/UI) for test-mode wording, Dev A for the seed search

## 5. Match round: night lights, lightning and CO2 produce almost the same chord, and the plan's own calibration test fails for two pairs  (high)

The chord is built only from hue (root), brightness (octave), saturation (voices) and edge density (pulse rate). Using the plan's features() on the plan's frames: night lights root 1, octave 0, 3 voices, 1.38 pulses/s; lightning root 1, octave 0, 3 voices, 1.57/s; CO2 root 0, octave 0, 3 voices, 1.31/s. Night lights and lightning differ only by a 0.1 s change in pulse period; CO2 is one semitone below. Only SST (root 2, octave 1, 4 voices, 7.4/s) is distinct. So the round is nearer 1-in-3 than 1-in-4 for three of four options, and test_features_differ_between_layers (needs at least 2 of 4 features differing by more than 0.05) FAILS for night lights vs lightning and night lights vs CO2 (only 1 feature differs). The plan's remedy (Task 2 step 4: loosen the 0.05 threshold or scale) would turn the test green without making the sounds distinct. R3's 0.98-1.00 simulation used other features (dark fraction, centroid) than the sound uses.

- **Evidence:** plan lines 236-243 (test), 313-323 (features), 449-455 (sound spec: root int(hue*12), register bright, voices 2+round(sat*2), rate 1+edges*7), 673-678 (chord synthesis). Plan code on notes/feasibility/data: nlfull_8 {bright .039, sat .276, hue .137, edges .054}; f_63.5 {.079,.58,.157,.081}; c20 {.046,.307,.074,.044}; f23000 {.19,.89,.171,.913}; pair difference counts (NL,lightning)=1 and (NL,CO2)=1 (script tmp/critic_gaps_plan_run.py). R3 lines 46-48.
- **Fix:** Give each layer a fixed designed signature (distinct timbre, register and pulse pattern, e.g. pluck / pad / clicks / noise swell) with feature-derived variation on top. Change the test to assert the synthesised parameter sets differ in at least 2 audible dimensions (timbre, octave, rate by at least 2x), then let two listeners tell the four apart in 5 minutes. About 30 minutes.
- **Who:** Dev B (sound) with Dev A for the test

## 6. No mitigation for the iPhone silent switch, and nobody has checked audio on a phone speaker or through VoiceOver  (high)

The primary users are screen-reader users on iPhones (spec section 2). WebKit mutes Web Audio when the ringer/silent switch is on unless the page opts into playback audio; sound.js only calls ctx.resume(). A blind tester, judge or participant with the switch on hears nothing and may conclude the app is broken. R2 listed this as UNKNOWN needing a device test, but the plan's only device test (Task 8 step 3) covers tilt, not audio. Also unchecked: low sounds on a phone speaker (season low clicks are 220 Hz square pulses of 40 ms; thenNow glides start at 262 Hz and fall toward 131 Hz), VoiceOver speech ducking or cutting the tone, and the aria-live readout (updated on every cursor move) talking over the tone.

- **Evidence:** plan lines 619-623 (audio(): resume only), 651 and 661 (220 Hz clicks, C4 base glide), 1151-1154 (only tilt tested), spec line 68; R2 note lines 61 and 64 (silent switch and speech/audio-route conflicts marked unknown, with WebKit bug links). Grep of spec and plan finds no 'audioSession', 'silent' or 'mute' mitigation.
- **Fix:** Add navigator.audioSession.type = 'playback' where available (Safari 16.4+; inferred, confirm on device) and, as a fallback, loop a 1-second silent <audio> element started in the same tap. On one real iPhone test ringer on/off x speaker / headphones x VoiceOver on/off and record results in the README. Raise the lowest click and glide frequencies to at least 300 Hz or add a harmonic. 30 minutes; find out now who on the team owns an iPhone.
- **Who:** Dev D (explore/a11y) with Dev B (sound)

## 7. On a phone with VoiceOver the Jukebox needs about 100 double-taps to cross the map, and there is no jump control  (high)

The accessible path on a phone is four buttons (North/West/East/South) moving 2 degrees per activation. Arrow keys do not exist on an iPhone and tilt is unproven under VoiceOver. Chicago to Tokyo is (139+87)/2 = 113 activations east, each followed by an aria-live readout that VoiceOver speaks. Sighted phone users fare no better: the canvas has no touch or drag handler in the plan. The spec's claim that the game 'works fully without sight' holds for the daily challenge, but the Jukebox, the literal challenge ask, is not practically usable by the stated primary user.

- **Evidence:** plan lines 862-865 (pad buttons), 1109-1118 (move by data-move and arrow keys, step from grids.json = 2), 871 (aria-live readout), 1120-1134 (tilt), and no pointer/touch handler anywhere in explore.js; spec lines 5-9 and 30.
- **Fix:** Add (a) a 'Jump to' select with the named places already in build.py (about 15 cities, 8 oceans) that sets lat/lon and reads the value, (b) a step-size select (2, 10, 30 degrees), (c) pointer drag/tap on the canvas, (d) a debounced readout that announces after the last press. 30-40 minutes, mostly explore.js.
- **Who:** Dev D (explore/a11y)

## 8. Glide clamp at +-12 semitones makes 8 cities sound identical; 721 rank3 triples have a winner within 1 semitone of the runner-up  (medium)

The glide size is 12*log2((l2023+1)/(l2012+1)) clamped to +-12, so any growth of +100% or more (and any loss of -50% or more) sounds the same. Eight lit cities saturate: Baghdad +273%, Hanoi +265%, Accra +182%, Dhaka +116%, Bangalore +116%, Ho Chi Minh City +108%, and Kyiv and Donetsk at -51%. The rank3 filter uses percentage points (gap >= 25), not semitones, so triples like Baghdad / Hanoi / Dhaka pass with all three glides at +12. Of 11,235 qualifying triples, 721 (6.4%) have the winner less than 1 semitone above the runner-up and 1,225 (11%) less than 2 semitones, below reliable discrimination for a glide. R3 also warned growth above +150% at small windows is partly a new-lights artefact (use the sign, not the magnitude), while the reveal prints 'grew 273%'.

- **Evidence:** plan lines 412-413 (semis clamp), 505-512 (rank3 filter in percent points), 661 (glide playback). Measured with plan code: saturated cities as listed; triples 11235, min adjacent glide gap under 1 semitone 721, under 2 semitones 1225 (tmp/critic_gaps_run2.py). R3 line 17.
- **Fix:** In build.py require for rank3 a gap of at least 2.5 semitones between all three post-clamp glide values, and widen the clamp (log-scaled +-18) or compress growth with sqrt. Show '+100% or more' (or just the sign) in reveals above 100%. 15 minutes.
- **Who:** Dev A (pipeline)

## 9. Listening-test data lives only in each device's localStorage and fails silently  (medium)

Every answer is saved to localStorage and writeLog swallows errors ('private mode: ignore'). In a private tab, with blocked site data, after Safari storage clearing, or in an in-app browser, nothing is saved, the end screen looks normal and the CSV export is empty or lacks that tester. The export is a Blob download via a synthetic anchor click, which behaves differently in iOS Safari and in-app browsers and is an unrehearsed flow for a VoiceOver user. The whole validity section depends on this CSV and there is no server fallback.

- **Evidence:** spec lines 56-59 (no server); plan lines 947-948 (readLog/writeLog try/catch), 996-1004 (end() logging), 1009-1012 (export), 1241 (export from each device and merge).
- **Fix:** In test mode show the results on the end screen as a visible text block (the CSV rows) with a Copy button and a visible 'could not save' warning if localStorage threw, so the facilitator can paste rows into a shared sheet. Do one dry run on an iPhone and an Android phone. 20 minutes.
- **Who:** Dev C (game/UI)

## 10. Lightning values are labelled 'flashes' but are pixel counts of an undated, accumulated 10-day layer  (medium)

The Jukebox lightning layer reads 'N flashes' where N is the number of yellow pixels in a 2 degree cell of one arbitrary frame (f_63.5), and the season reveal prints 'north 9629, south 425' flashes. Each frame shows a 10-day roving window, a dot is not one strike, dot size is a rendering choice, and the earlier analyst warns not to treat the yellow-pixel count as an absolute rate: total dots swing from 24 to 14,713 across the movie and the window may be filling or emptying at the ends. The frames carry no date (07 section 4 item 2 covers the season round; the Jukebox label and reveal wording are separate). The grid comes from a single frame, so 'where is lightning' depends on which of 40 frames was picked, and the label 'one 10-day window' gives no date.

- **Evidence:** plan line 1071 (words(): `${v} flashes`), line 502 (reveal 'Flashes in this 10-day window: north {n}, south {s}'), line 535 (layer label and unit 'flashes'), line 516 (grid from f_63.5.png). analysis/pages/off-5011.json gotchas ('Every frame is a 10-day accumulation, so consecutive frames share almost all their dots') and open_questions (yellow-pixel count is not an absolute rate; flat movie has no date). Measured: lightning grid max 94 pixels per cell, 9.7% of cells above 0; first frames' counts (0,0), (9,15), (85,191) (tmp/critic_gaps_run3.py, run output).
- **Fix:** Relabel as 'lightning activity (relative)' with high / medium / low in the readout and 'dots in the NASA map' in reveals. Build the Jukebox layer from the average of the 6-8 busiest frames, or state 'one undated 10-day window' in the README. 10 minutes.
- **Who:** Dev A (pipeline) and Dev D (explore) for wording

## 11. Final-link readiness is untested: no repo or Pages site exists yet, FortiGuard filtering is a stated risk, and the demo plan has zero slack  (medium)

No earthsound repository exists yet at <clone>/earthsound, and the plan's Task 0 uses a path from another machine (/home/aaron/Dev/...). GitHub Pages must be enabled (Source: GitHub Actions) in a public repo and the first deploy approved before the Sat 9 PM gate and the iPhone tests (Task 8 step 3 needs the HTTPS URL). The official guide says both links must open with no login and suggests requesting a FortiGuard web-filter classification for a newly created website; nothing in the plan checks that the github.io URL opens on the venue network or in a judge's private window. The demo is capped at 30 seconds or 7 slides and cannot be uploaded to the Space Apps site, so it needs an external public host. The plan edits the video 4-11 PM ET and submits at 10 PM CT (= 11 PM ET), so there is no slack. A 30-second demo of an audio product must also carry the sound itself.

- **Evidence:** plan lines 74-77 (Task 0 mkdir path), line 101 (Pages source), lines 28-32 (video recorded Sun 1-3 PM, edited 4-11 PM ET, submit Sun 10 PM CT), lines 1224-1227. eic-data/doc-review/rules.md line 69 (links public; FortiGuard classification recommended; demo cannot be uploaded to the site) and lines 17-18 (30 s / 7 slides disqualifier for Global Judging). Directory listing of <clone> shows only README.md and spaceapps-2026.
- **Fix:** Today: create the public repo, push a hello-world site/, enable Pages, and open the URL in a private window on a phone on mobile data and on the event wifi. If blocked, submit the FortiGuard classification request. Record a rough 30-second video with the real sound on Saturday night and host it on a public link, so Sunday is only a re-record. Move the video edit earlier than the submit window. 20 minutes.
- **Who:** Dev D (deploy) and Business lead (video, links)

## 12. NASA Data and References fields need the underlying datasets and per-page credits, not just 'NASA SVS, public domain'  (low)

The site footer and fetch.sh credit only 'NASA Scientific Visualization Studio ... Public domain'. The pages name the real data and third-party layers: 5313 credits Black Marble (Suomi NPP VIIRS) but its dataset link points to the 2016 colour maps, not the annual composites, and the page does not say which product made the 2012-2023 maps; 3912 is the ECCO2 ocean MODEL (Menemenlis NASA/JPL, Zhang UCLA) with GTOPO30 topography; 5011 draws on the ISS LIS Science Data V1 (Blakeslee 2020, GHRC DAAC) plus a Natural Earth Gray Earth basemap and MODIS land cover visible in the frames; 5196 is the DYAMOND model (Ott, Weir, Putman, Oda). The NASA Data field must describe the data specifically, and the Space Apps legal text requires non-NASA third-party material (the Natural Earth basemap) to be identified. The unknown 5313 processing also limits what 'brightness grew 116%' can claim.

- **Evidence:** plan line 900 (footer) and lines 111-120 (fetch.sh header). spaceapps-eic-evidence/bundles/5313.md lines 14-20, 3912.md lines 14-22, 5011.md lines 14-26, 5196.md lines 14-20 (datasets and credits); analysis/pages/off-5313.json open_questions (which Black Marble product is not stated). eic-data/doc-review/rules.md lines 20-23 and 37.
- **Fix:** Paste the Credits and 'Datasets credited by NASA on this page' blocks of the four bundles into the README References and the NASA Data field now (15 minutes), name Natural Earth as the 5011 basemap, and word night-lights results as 'brightness in NASA's night-lights map'. No code.
- **Who:** Business lead

## 13. The thenNow Dimmer pool is only 6 cities, five East/Central African cities are silently dropped, and stories.json names a city that can never appear  (low)

The l2012 > 1500 'lit' threshold removes Kinshasa, Addis Ababa, Nairobi, Dar es Salaam and Kampala from every round (5 of 64 cities), although R2 measured Nairobi +170%, and the plan's stories.json has a Nairobi story that will never show. After the sign-agreement and 30% filters 28 cities are Brighter and 6 Dimmer, so the Dimmer round comes from 6 cities (repeats within a week, 3 are Ukrainian). The plan's own test accepts 3 Dimmer rounds. This does not threaten the weekend but shapes what judges see if they try several seeds.

- **Evidence:** plan lines 442-443 (lit threshold l2012 > 1500), 831-832 (stories.json Nairobi, Kyiv, Dhaka), 363 (test needs only 3 Dimmer). Computed with the plan's code: lit 59 of 64; dropped Kinshasa, Addis Ababa, Nairobi, Dar es Salaam, Kampala; thenNow pool 34 = 28 up + 6 down; near misses London -0.17 (change map -0.318, fails the 30% rule), Caracas -0.14, Kabul -0.12 (tmp/critic_gaps_plan_run.py output). R3 lines 8, 17.
- **Fix:** Lower the Dimmer threshold to 15% where the NASA change map agrees (adds London -17%, Caracas) and note it in the README. Move the Nairobi story to an included city or lower the lit floor for African cities, and add 2-3 more dimming regions after checking them against the change map. 20 minutes, optional.
- **Who:** Dev A (pipeline) and Business lead (stories)

## Notes added by hand after the run (Sat 14 Nov 2026, about 20:50 UTC)

- **Item 7 (Jukebox on a phone):** "113 activations" from Chicago to Tokyo is the long way round. The plan's cursor wraps at the date line (plan line 1094), so the short way is about 66.
- **Item 10 (lightning):** "the frames carry no date" is out of date. NASA's `labels.txt` dates every frame of the flat lightning movie; the Jukebox layer's frame `f_63.5` is dated 1 Aug 2021. See `../pages/5011.md` and `../data/lightning-40-frames-dated.csv`. The point about "flashes" being pixel counts stands.
- **Item 11 (no repo yet):** checked on GitHub at about 20:40 UTC: the account that hosts the team's `SpaceApps` repo had no public repository with "earth", "sound" or "jukebox" in its name. It may be private or under another account.
- Items 1 to 5 and 8 were reproduced by running the scripts again; see the notes at the end of `judge.md`.
- **Item 4 (seeds):** the seed order given there (101 Brighter, 102 Dimmer, 201 Brighter, 202 Brighter) is wrong; it came from a faulty Python port. The plan's actual `game.js` gives Dimmer, Dimmer, Brighter, Dimmer. The point that the test seeds are unbalanced stands (the gate seeds have no Brighter city). See the notes at the end of `judge.md`.
