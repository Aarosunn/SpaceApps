# Issues in the Earthsound v2 spec and plan

> 2026-11-14, 17:15-20:50 UTC. Produced by AI agents (Claude Sonnet) working from the saved NASA evidence and the team's files. Each item cites its evidence; nothing here has been checked by a person.

Most severe first. Line numbers refer to `specs/2026-11-14-earthsound-v2-spec.md` and `plans/2026-11-14-earthsound-v2.md`.

## 1. Gate G1 and the listening test cannot measure what the spec says (2 items per type, not 5)  (blocker)

dailyRounds returns exactly ONE round per type per seed. Spec section 8 says G1 = 5 thenNow + 5 whichMore per listener, but plan Task 9 step 1 runs only seeds 101 and 102, so each listener hears 2 thenNow and 2 whichMore; two listeners give 4 items per type. 'At least 70%' on 4 items means 3 of 4, which a coin-flipper reaches 31% of the time (5/16); a true 80% listener misses 41% of the time. The go/no-go pivot to Fire Rosetta rides on this. The same arithmetic hits the Sunday test: 2 answers per type per tester per phase, so 8-10 testers give 16-20 answers per type per phase (95% interval about +-22 points), which cannot support 'accuracy per round type against chance' or a pre/post effect. Pre uses seeds 101/102 and post 201/202, so item difficulty is confounded with the tutorial (the match pool has only 4 fixed items, so it is also memorisable), and there is no practice control. 05-ideas-ranked.md line 89 asked for five then-and-now pairs; the plan silently dropped to two.

- **Evidence:** plans/2026-11-14-earthsound-v2.md lines 774-784 (dailyRounds maps ORDER to one round each), 1167 (seeds 101 then 102), 1237-1240 (pre 101/102, post 201/202); specs/2026-11-14-earthsound-v2-spec.md lines 74-76 and 85 ('5 thenNow + 5 whichMore'); 05-ideas-ranked.md line 89. Binomial: P(X>=3 | n=4, p=.5) = 5/16.
- **Fix:** Add a drill mode (`?drill=thenNow&n=5` or `?seeds=101..105`) that serves 5 items of one type from fixed, pre-listed item sets. For Sunday use two fixed 10-item sets A and B, counterbalanced (half the testers get A pre and B post), and report counts with Wilson intervals, not significance claims. Rewrite the G1 rule as 'at least 8 of 10 per type, pooled over 2 listeners (20 answers)'.
- **Who:** Dev C (drill mode); business lead (test protocol, README wording)

## 2. Round 1 (match): night-lights, lightning and CO2 chords are indistinguishable; the plan's own test fails; blind users get no usable cue  (blocker)

I ran the plan's geo.py, layers.py and build.py code on the real frames. Chord parameters in rounds.json: Night lights {root 1, register 0.039, voices 3, rate 1.38}; Lightning {root 1, register 0.079, voices 3, rate 1.57}; CO2 {root 0, register 0.046, voices 3, rate 1.31}; Ocean {root 2, register 0.19, voices 4, rate 7.39}. sound.js uses Math.round(register*3), which is 0 for all three dark layers, so night lights and lightning play the same notes (same root, register, voices) and differ only in a pulse of 1.4 vs 1.6 per second. A listener cannot answer. R3's 0.98-1.00 separability was an 8-feature nearest-neighbour simulation, not this 4-parameter synthesis (R3 line 100: mapping not yet synthesised). Task 2's test_features_differ_between_layers FAILS on first run: night lights vs lightning and night lights vs CO2 differ on only 1 of 4 features (> 0.05) but the test needs 2, so 'Expected: 7 passed' is false. Also: the pool is only 4 rounds (4 fixed sounds, options always in the same order), the tutorial has no chord demo (spec says 4 demos, one per sound type, but there are 3 types covered), and for a blind player images carry alt text equal to the option label only while the cue is 'colour sets the chord', so the round tests visual knowledge, contradicting 'works fully without sight' (spec line 9).

- **Evidence:** Plan code run on notes/feasibility/data frames (scratch: spaceapps-eic-evidence/tmp/specsim/probe.py; rounds.json 'match'). Printed feature diffs: NL vs lightning = 1, NL vs CO2 = 1. Plan lines 236-244 (test), 449-455 (match sound), 673-679 (chord), 879-882 (tutorial), 972 (alt = option label); spec lines 36, 53.
- **Fix:** Drop round 1, or make it separable and teachable: one fixed signature timbre/tempo per layer (e.g. night lights = slow plucks, lightning = clicks, SST = sustained pad, CO2 = pulsing noise), a demo button per layer in the tutorial, and non-colour alt text ('dark map with city lights'). Check with one teammate that night lights vs lightning can be told apart before the 9 PM gate.
- **Who:** Dev B (sound), Dev A (features test), Dev D (alt text)

## 3. Jukebox night-lights layer: almost the whole map lands on 2-3 notes; Tokyo sounds the same as the Sahara  (high)

write_grids averages mean(RGB)/255 over a 2-degree cell of a mostly black map and keeps min 0, max 1. Real grid statistics: p50 0.004, p90 0.125, p99 0.13, max 0.43. The land basemap (about 20/255 grey) is not subtracted (R2 corruption (a)). freqFromUnit rounds u*24 to a semitone and snaps to the pentatonic scale: Sahara 0.08 -> 2, Siberia 0.096 -> 2, Tokyo 0.132 -> 3 -> 2, Chicago 0.173 -> 4, Mid-Atlantic 0.004 -> 0, Congo 0.007 -> 0. Tokyo and the empty Sahara give the same note; empty Siberia is nearly as high as Chicago. Task 8's expected result 'Tokyo is high' (line 1147) is only half true, and the readout would say '13 percent brightness' for Tokyo. This is the landing tab and the literal challenge ask.

- **Evidence:** Plan lines 519-525 (nl grid), 532-535 (min 0, max 1), 632 (freqFromUnit), 1146-1147. Computed from grids.json built by the plan code: Chicago 0.173, Tokyo 0.132, Sahara 0.08, Siberia 0.096, MidAtl 0.004, Congo 0.007; layer percentiles above.
- **Fix:** In write_grids subtract the floor (as city_lights does with bg-3), use a log or sqrt scale and normalise to the layer's own p99 (clamped). Speak 'very bright / bright / dim / dark' rather than a percent of 255. Re-listen at Chicago, Tokyo, Sahara and Atlantic before G1.
- **Who:** Dev A (pipeline) with Dev D (explore)

## 4. Jukebox sea-temperature layer says 'land, no ocean data' over about 40% of the open ocean  (high)

sst_at needs more than 20 finite pixels in its window, and the SST TIFF decodes on only about 15% of pixels (streamline texture; dark cold water fails the saturation gate). The default r=3 window is fine (about 1,200 px) but write_grids calls sst_at(..., r=1), a window of about 12x12 = 144 px, which often has fewer than 20 valid pixels. Result: 9,754 of 16,200 grid cells are None (60%). Among cells that are ocean at r=3, 490 of 1,220 sampled (40%) are None at r=1. Examples: Bering Sea (58N, 175W) r=1 None, r=3 3.4 C; North Atlantic south of Iceland (60N, 30W) r=1 None, r=3 6.7 C. The readout then speaks 'land, no ocean data' and the tone goes silent, which is false and breaks the 'silence = land' convention.

- **Evidence:** Plan lines 525-527 (r=1), 303 (> 20 finite pixels), 1068-1073 (words), 1148. Computed: finite fraction of SST TIFF 0.1505; grid None fraction 0.602.
- **Fix:** Use r=3 (or a 2-D fill / nearest-valid interpolation) for the grid and a separate land mask (the NL basemap floor or a static mask) so None means land only; say 'no data here' for gaps.
- **Who:** Dev A

## 5. Rules not planned or not met: 30-second demo (disqualifier), SI disclosure placement, and 'SI must not originate the idea'  (high)

(1) The spec has no demo section; plan line 1287 defers the 30-second video to '06-execution-plan.md (to be written)', which does not exist. A demo over 30 s or 7 slides makes the project ineligible for Global Judging. The 05 demo idea ('two sounds of one city 11 years apart') no longer matches the spec, where thenNow is one glide; the clip must carry audio and English captions that describe the sound. (2) SI disclosure sits only in the README (plan line 1262) and the form field. Per the guide the form answer is not shown to judges; judges see SI indicators inside the project (descriptive text, metadata), and AI-written code and AI-synthesised audio must be acknowledged there. The site footer (index.html 899-901) has none. (3) Rules say SI may accelerate work but not originate the solution idea. The spec's origin is 05-ideas-ranked.md, built from three AI sessions including I1-ideas.md ('10 fresh ideas'). 07's issue 6 covers the SI field but not this clause.

- **Evidence:** plans/...v2.md lines 899-901, 1262, 1287; spec line 3; 05-ideas-ranked.md lines 5-8; eic-data/doc-review/rules.md L17 (demo disqualifier), L25 and L41 (SI audio/code acknowledged; SI not to originate the idea), L73 (form text not shown to judges). Repo root listing has no 06-execution-plan.md.
- **Fix:** Write the 30 s storyboard now (0:00 names, 0:05 title, 0:10 play the Dhaka glide, 0:20 reveal number and source, 0:27 URL) with captions describing the sound. Put an SI statement in the site footer, README, project description and credits (AI-assisted code and text; all audio synthesised at runtime by code). In the SI field state truthfully who chose the challenge and idea and what AI did; ask the Local Lead whether the AI idea-ranking is a problem.
- **Who:** Business lead (storyboard, disclosure text); team lead (provenance statement)

## 6. rank3 'pairwise gap >= 25 points' is in percent but the sound clamps at +-12 semitones, so some answers cannot be heard  (high)

semis() = 12*log2((b+1)/(a+1)) clamped to +-12, so every city above +100% (or below -50%) plays the same glide. build.py filters triples by percent gap only. In the pool built from the real frames, 12 of 120 rank3 rounds have two or more identical clamped glides and 6 of 120 have the winner within 1 semitone of the runner-up (median winner-minus-second gap 5.2 semitones). Example: Hanoi +265% [12.0], Miami +5% [0.79], Ho Chi Minh City +108% [12.0]; answer Hanoi, but two glides are identical, a coin flip. Near zero, 25 points is about 3 semitones, and three 1.8 s glides are hard to rank from memory. Dhaka (+116%) itself already clamps.

- **Evidence:** Plan lines 412-413 (clamp), 505-512 (filter), 661 (glide). Computed rounds.json: rank3 n=120, clamped>=2: 12, best-second < 1 semitone: 6; options ['Hanoi','Miami','Ho Chi Minh City'] glides [12.0, 0.79, 12.0].
- **Fix:** Filter rank3 (and thenNow) on the semitone gap after clamping (for example best minus second >= 3 semitones and the top value unclamped), or compress with 8*tanh(log2(ratio)). Re-run the counts and report the pool size.
- **Who:** Dev A

## 7. Lightning 'flashes' are yellow pixels, not flashes  (medium)

hemis() and write_grids() count pixels of the yellow mask, and the reveal prints them as 'Flashes in this 10-day window: north N, south S' (the Jukebox unit is also 'flashes'). In frame f_63.5 there are 10,054 yellow pixels forming 2,437 8-connected blobs (median 2 px per blob, mean 4.1), so the quoted figure is about 4x the number of dots, and neither is a flash count (each dot is a LIS event; overlapping dots merge). A false number in the reveal undermines 'every answer checked against NASA data'.

- **Evidence:** Plan lines 305-311, 502 (reveal), 528-530 and 535 (unit). Computed on raw/lit/f_63.5.png (2048x1024): mask px 10,054; components 2,437; north 9,629 px, south 425 px.
- **Fix:** Reveal: 'More lightning dots on NASA's map north of the equator than south in this 10-day window'; rename the unit 'lightning density'; optionally count blobs.
- **Who:** Dev A and business lead (reveal text)

## 8. Dimmer pool is six cities, five of them war zones, with causal story text; season pool is 61% 'Northern'  (medium)

Built from the real frames, thenNow = 28 Brighter and 6 Dimmer (Damascus, Kyiv, Paris, Kharkiv, Odesa, Donetsk). dailyRounds picks Brighter/Dimmer 50/50, so half of all days draw from six cities (each repeats within about two weeks) and 5 of 6 are conflict zones, one occupied. stories.json line 830 asserts a cause ('after the 2022 invasion and strikes') that no pixel here shows. Paris -39% is a brightness change in a satellite product; I infer (not verified here) that LED conversion can look like dimming. The only independent check, NASA's change map, agrees by tiny margins: net purple-minus-orange share +0.04 for Dhaka and -0.04 for Kyiv. Separately, season rounds are 19 Northern : 12 Southern (61%), and dailyRounds balances only thenNow (line 778), so 'always Northern' beats chance by 11 points.

- **Evidence:** Plan lines 457-466, 774-784, 829-831; computed rounds.json (thenNow and season Counters) and city_lights output (Dhaka changemap 0.04, Kyiv -0.04); R3 lines 77 and 93.
- **Fix:** Drop causal wording unless sourced; add 'image brightness' plus a lighting-change caveat to Paris/London-type reveals; add regional windows or non-conflict dimmers to reach 12+ Dimmer items; balance season 50/50 in dailyRounds as for thenNow.
- **Who:** Business lead (stories); Dev A (pool); Dev C (balance)

## 9. Jukebox is hard to operate with a screen reader: 2-degree buttons, document-level arrow keys, no jump or slider  (medium)

Movement is 2 degrees per button press or arrow key: Chicago to Tokyo is about 113 taps. On NVDA/JAWS/desktop VoiceOver, arrow keys are consumed by browse mode unless focus is in a role=application widget, so the document-level keydown will not fire; on a phone there are no arrow keys, only four buttons. The map is a canvas with role=img and a fixed label, the tone starts only after a separate 'Play / stop' press, and each step rewrites a polite live region, flooding a screen reader. This contradicts spec section 5 and the 'blind phone users first' claim; Task 8 step 3 only checks that buttons work.

- **Evidence:** Plan lines 861-871, 1109-1118, 1151-1154; spec lines 12, 30, 61-68.
- **Fix:** Add a `<select>` of about 40 named places (CITIES/OCEANS exist in build.py) and two native range inputs (lat, lon) with aria-valuetext holding the spoken value; pad buttons step 10 degrees with a 2-degree option; announce on 'Say value' or after 600 ms idle; start the tone on first move. Treat arrow keys as a bonus.
- **Who:** Dev D (explore/a11y)

## 10. Challenge flow: focus jump can silence the reveal; Space answers instead of replaying  (medium)

answer() disables every option button (including the focused one), writes the reveal into a polite live region, then immediately calls next.focus(). VoiceOver and TalkBack announce the new focus target and usually interrupt or drop a pending polite announcement, so the measured number and source (the validity payoff) may never be spoken; narration is off by default. In the key handler Space is ignored when the target is a BUTTON, so a keyboard or switch user who tabbed to an answer button and presses Space answers rather than replays. Digits 1-4 answer immediately with no 'sound played' guard, so a stray key logs a wrong answer in the test CSV.

- **Evidence:** Plan lines 984-994, 1013-1018; spec lines 62-64.
- **Fix:** Make the reveal a role=status element with tabindex=-1 and move focus there (Next is the next Tab stop), or keep focus on the answer group; ignore digits until the sound has played once; Space = replay, Enter = activate. Test with VoiceOver that the reveal is spoken before G1.
- **Who:** Dev C and Dev D

## 11. The 'more light' round ranks by peak display brightness (p99), not light  (medium)

Spec round 3 asks 'Which has more light', but build.py ranks cities by p99 of the 2023 display frame (8-bit, tone-mapped), prompts 'Which is brighter?' and reveals 'Peak brightness (0-255)'. p99 saturates for big cities (Chicago 240, Tokyo 233 in my run) and measures the brightest 1% of pixels in a 3-degree window, so a dense small core can beat a sprawling megacity. R3 recommended light-sum above a floor (937 of 1,711 pairs differ by 2x or more), which the plan computes for thenNow but not here. Pitch = unit(p99, 0, 255) squeezes 90-235 into about 8-22 semitones.

- **Evidence:** Plan lines 468-477; R3 lines 19 and 75; city_lights output p99 Chicago 240, Tokyo 232.9, Dhaka 107, Kyiv 73.
- **Fix:** Rank on l2023 (light sum above floor) with ratio >= 2x, pitch on log2 of the ratio, prompt 'Which city shows more light on NASA's map?'
- **Who:** Dev A

## 12. 'Every answer is checked against NASA data' and the calibration tests are circular  (medium)

The sound, the answer key and the reveal number all come from the same pixel decode, so a round proves pipeline consistency, not that the decode matches reality. The pytest expected values (Dhaka > +50%, Kyiv < -15%, Pacific 24-30 C, Kuroshio 13-20 C) were produced by the same r3_*.py methods the plan copies, so they cannot catch a shared error. R3 itself marks the SST decode 'not independently validated' (+-1-2 C, inferred). Spec section 6 items 1-2 present these as validity evidence for judges who score Validity 1-5.

- **Evidence:** Spec lines 70-72; plan lines 206-226 and 254; R3 line 24; eic-data/data-test-sst-anomaly.md concerns a different SVS product.
- **Fix:** State the claim as 'consistent with NASA's own change map (92% sign agreement, R3)' and 'decoded from NASA's colour bar, +-1-2 C'. Add one external check doable in under an hour: 5 SST points against a published March climatology or NOAA OISST, and 5 city trends against a published VIIRS city trend.
- **Who:** Dev A and business lead (README wording)

## 13. Every `node --test site/js/` step fails on Node 21+; plan paths point at another user's machine  (low)

The plan prescribes `node --test site/js/` (lines 612, 753, 808, CI line 1216) with 'Expected: pass 2 / pass 8'. On this machine (Node v24.15.0) the same command against a folder with one a.test.mjs and an app.js printed pass 0, fail 1 ('test failed' for the directory). CI pins Node 20, where directories are scanned, so only local runs fail, but every teammate on a current Node loses time at the first test. Task 0 commands use /home/aaron/Dev/Hackathons/... (lines 74-76, 137) while the repo is under <home>/...; fetch.sh also assumes earthsound sits beside spaceapps-2026.

- **Evidence:** Plan lines 74-77, 122, 137, 612-613, 753, 808, 1216; local run `node --test js/` with Node v24.15.0 printed 'pass 0, fail 1'.
- **Fix:** Use `node --test site/js/*.test.mjs` everywhere (works on Node 20-24) and relative paths from the repo root.
- **Who:** Dev D

## 14. Schedule and robustness: unlabeled ET/CT, VoiceOver test ordering, local-time seed, Jukebox blocked by rounds.json  (low)

(a) The plan header says ET, but rows 'Sun 9 AM-1 PM' and 'Sun 1-3 PM' are clearly CT (Task 11 says 'Sun 9 AM-3 PM CT'), then 'Sun 4-11 PM ET' follows; read as ET, listener sessions start at 8 AM CT. (b) Spec line 68 requires the iPhone VoiceOver test 'before Sun 10 AM CT', but the plan puts it Sat 7-9 PM, before the G1 gate, and Task 8 step 3 needs the Pages deploy, while Dev D also owns T0, T10, T8 and the a11y work in the same window, so the accessibility findings above will not be fixed before 9 PM. (c) seedFromDate uses the browser's local date, so 'the same for everyone' (spec line 33) is false across time zones. (d) app.js awaits rounds.json (959-962) before initExplore (1021), so a fetch or JSON error also kills the landing Jukebox.

- **Evidence:** Plan lines 18-32, 772, 959-962, 1021, 1151, 1231; spec lines 33 and 68.
- **Fix:** Label every row ET or CT (use CT for the whole table); schedule the VoiceOver test after the first deploy plus a11y fixes and make it a gate input; compute the seed from UTC or America/Chicago; call initExplore first or wrap the rounds fetch in try/catch.
- **Who:** Business lead (schedule); Dev C (seed, init order)

## Notes added by hand after the run (Sat 14 Nov 2026, about 20:50 UTC)

- **Issue 6 (rank3 clamp):** re-running the script gives 12 rounds with two or more glides *at the clamp limit* (not necessarily identical: one can be +12 and another −12) and 6 rounds with the winner within a semitone of the runner-up. The 6 are the rounds that cannot be answered by ear.
- **Issue 7 (flashes):** the 10,054 yellow pixels in `f_63.5` were recounted (north 9,629, south 425). The 2,437 separate dots were not recounted.
- **Issue 9 (Jukebox with a screen reader):** "about 113 taps" from Chicago to Tokyo is the long way round. The plan's cursor wraps at the date line (plan line 1094), so the short way is about 66.
- **Lightning dates:** since this was written, NASA's `labels.txt` was found to date every frame of the flat lightning movie. See `../pages/5011.md` and `../data/lightning-40-frames-dated.csv`. Of the 31 season rounds the plan would build, 17 fall in the summer the key names and 14 do not.
- Issues 1 to 4, 6, 8 (pool sizes) and 13 were reproduced by running the scripts again; see the notes at the end of `judge.md`.
