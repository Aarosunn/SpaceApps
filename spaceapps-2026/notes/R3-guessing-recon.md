# R3: What guessing questions are feasible by ear from the official NASA data (Sat Nov 14 2026, ~3 PM ET)

Tags: [V] measured by me this session from files in notes/feasibility/data; [I] inferred; [U] unknown.
Scripts (run from notes/feasibility with `python3 -I`): scripts/r3_sst.py, r3_nl.py, r3_lit_aer_co2.py, r3_match.py. New data: data/sst/{f23024,f23168,f25000,f29000}.tif (4 x 6 MB), data/co2/ (7 MB mp4 + 40 frames), data/lit/ (41 frames pulled by ffmpeg HTTP range-seek from the 350 MB SOS flat mp4, ~4 s each, no full download). Reused: data/frames/nlfull_{0,8,12}.png (night lights), data/sst/f23000,f27000.tif.

## 0. Bottom line
1. The strongest NEW finding: the time dimension is rich in the ISS-lightning and SST animations, and it supports a "which season / which hemisphere" family that R2 never tested. Lightning NH/SH dot ratio swings 0.17 to 22.6 across the video (annual cycle, ~12 s per year of video) [V]. SST NH-minus-SH band temperature swings -0.8 / +6.9 / +11.9 / +4.1 C in Mar / Jun / Sep / Dec 2007 [V].
2. Night-lights "then vs now" has a hidden base-rate trap: only 7 of 59 lit cities dimmed (>=15%); 31 brightened >=25% [V]. Always answering "brighter" is right about 82% of the time on the 34 clean rounds (28 up, 6 down). The daily pool must be balanced by construction, which caps balanced rounds at about 12-14 distinct cities unless sub-city/regional windows are added.
3. "Match the sound to the image" is trivially separable between different NASA products (upper-bound simulation 0.98-1.00 vs chance 0.25, 3 simple features suffice) [V], so it is a good easy/teaching round, not a hard one. The hard version is same-animation frames (CO2 globe frames are the most variable, SST the least).
4. Frame-to-frame motion inside SST is NOT a signal at day scale: 10-degree-block mean |dT| is 0.03 C (1 day) and 0.13 C (7 days) median; pixel flicker is streamline texture only [V]. Time signal in SST is only seasonal.
5. Aerosols (one still), AQ (one mosaic still), atmospheric river, GEDI, Perpetual Ocean 2 and Caldwell 73 support only the image-match / phenomenon families; no ground truth beyond the colour legend.

## 1. Measurements
### 1a. Night lights 5313 (59 lit cities of 64 tried, +-1.5 deg windows, frames 2012/2023 + NASA change map) [V]
- Sign of my 2012->2023 relative change vs sign of change-map (purple minus orange share): agree 92% (R2 got 79% on a different 29-place set with +-2 deg windows; the two are not directly comparable).
- 37 of 59 have |change| >= 25%. Up >= +25%: 31. Down <= -15%: 7 (Kyiv -51, Donetsk -51, Damascus -47, Odesa -44, Kharkiv -41, Paris -39, London -17).
- Then-vs-now clean rounds (|change| >= 30% and change-map sign agrees): 34 (28 up, 6 down). Biggest up: Baghdad +273%, Hanoi +265%, Accra +182%, Dhaka +116%, Bangalore +116%, Ho Chi Minh +108%. [V, but extreme values >+150% at small windows are probably partly new-lights artefacts; use as sign not magnitude.]
- Pair pool for "which grew more": 1711 pairs, 1121 with change gap >= 30 points, 783 >= 50 points.
- Static "which is brighter in 2023" (light-sum above floor): 937 of 1711 pairs differ by >= 2x, 467 by >= 4x.
- Rank-3 triples with all pairwise gaps >= 25 points: 11,235 of 32,509. Odd-one-out (2 up + 1 down or reverse): 3,906 triples but only built from 7 distinct "down" places, so repetition is high.
- Region type (p99 of 2023 luminance in +-2 deg): cities 90-235; open ocean 1.3 (all five ocean points); deserts/forests 2.7-64 and overlap (Congo 2.7, Borneo 7.3, Outback 11.7, Sahara 23, Taiga 61, Atacama 64). So city vs ocean vs unlit land is separable; desert vs forest is NOT separable from night lights [V]. Ocean vs land only works because the NASA basemap is dim-grey on land (about 20/255) and black on sea (about 1/255): a basemap artefact, not data.
- Gotcha: change-map pixel vs year frames differ (interpolated year frames; R2). Use NASA's change map as key; geometry needs the lon0 = -168.8 calibration (R2).

### 1b. SST 3912 (ECCO2 model, 2007-03-25 to 2008-03-03, frame step about 4.1 h; 6 TIFFs decoded via colour bar) [V; decode good to roughly +-1-2 C, [I] not independently validated]
- Band means (30-60N, 30-60S, tropics): Mar 12.17/12.94/27.88, Jun 16.86/9.93/27.79, Sep 20.54/8.62/27.02, Dec 15.05/10.99/27.09 C. NH minus SH asymmetry: -0.77, +6.93, +11.92, +4.06. Mar+1d -0.65, Mar+7d -0.24 (stable within a week).
- Seasonal swing at 19 points (Mar/Jun/Sep/Dec): Kuroshio 11.1 C, Mediterranean 10.5, Gulf Stream 9.1, S Atlantic 8.1, Peru upwelling 8.0 vs Indian eq 0.4, Caribbean 1.3, MidPacific 1.9. 14 of 19 points differ by >= 3 C between Mar and Sep.
- "Which is warmer" with a pinned frame: 4-frame-mean pair gap median 8.2 C over 171 pairs; 74% >= 4 C, 62% >= 6 C. With one frame the winner flips by season for mid-latitude vs tropics (R2).
- Data gotchas: only about 12% of pixels carry decoded colour in both frames (streamline texture); window means need >= 20 valid pixels (Baltic in June returned NaN).

### 1c. ISS lightning 5011 (SOS flat 4096x2048 mp4, 100 s, 60 fps, 40 frames sampled every 2.5 s; yellow dots = events) [V]
- Total dots per frame: median 7,617, range 24 to 14,713 (ramps up from empty in first ~8 s, so skip first 10 s; last frame 2,521).
- NH/SH dot ratio over the 35 frames with > 3,000 dots: min 0.17, max 22.6; 19 frames NH-dominant (>2), 12 SH-dominant (<0.5), 4 ambiguous. Peaks every about 12.5 s of video (annual cycle). Date is not burned into the flat frames, [U] exact date mapping; the question can be keyed on the data itself (NH/SH ratio) without the date.
- Region means (dots per frame, 40 frames): Congo 643, Maritime Continent 390, US Great Plains 268, Amazon 249, N India/Himalaya 157, Argentina 116, Australia 114, Mediterranean 66, N Europe 62, Sahara 14, Tibet 2, Arctic Siberia 0 [V]. Every region except Sahara-adjacent tails hits 0 dots in at least one frame (min column 0 for all 12), so all are strongly seasonal.
- Region-pair questions: 66 pairs of 12 regions; on average in 76% of frames one region has >= 2x + 10 more dots than the other; 22 of 66 pairs flip winner with season (so frame-specific keys are needed, no global "Congo > Amazon").
- Frame-to-frame: median relative change in total dots between samples 2.5 s apart = 29% (the 10-day window slides), so "is it getting stormier" is answerable but noisy.
- Gotcha: the preview jpg in data/img is a globe; the flat map exists only inside the 350-700 MB mp4s (range-seek works).

### 1d. Aerosols 5669 (single 2025-08-19 still, categorical colours) [V]
- Classified pixel share (hue rules, crude): sulfate 4.5%, dust 1.6%, sea salt 1.0%, black carbon 0.5%. Of 210 15-degree tiles only 41 have any class covering >= 15%: sulfate 27 (22 pure >= 70%), dust 9 (7), black carbon 3 (2), sea salt 2 (1). So a "dust or smoke or sulfate?" question has only about 30-40 usable tiles from one snapshot, heavily sulfate-weighted, and sea salt/BC are barely there [V, thresholds crude, sea-salt rule weak].
- No time series on SVS; one timestamp only.

### 1e. CO2 5196 (globe-orbit 1080p mp4, 15 Jan to 3 Mar 2020 by burned-in date, 40 frames) [V]
- Orange CO2-plume pixel fraction per frame: min 0.0000, median 0.0010, max 0.0140; mean luminance 0.021 to 0.042. It tracks which hemisphere/biomass-burning region faces the camera (Africa Feb, SE Asia late Jan), not a clean time trend. Orbit rotation confounds time; the date stamp is burned in only as text.
- Frame-to-frame distance in image-feature space is the largest of the four animations (mean pairwise z-dist 1.38 vs NL 0.94, Lightning 0.60, SST 0.27): good for "match the frame", poor for any numeric key.

### 1f. Match sound to image (simulated listener = nearest neighbour in feature space; sound is a deterministic function of brightness, saturation, hue vector, dark fraction, edge density, centroid) [V as an upper bound, human accuracy [U]]
- Leave-one-out classification among the 4 animated resources (102 frames): 102/102 with 8 features, 100/102 with only 3 features (brightness, dark fraction, hue). Chance 0.25.
- 4-choice simulation over 9 products (NL, SST, Lightning, CO2, Aerosols, AirQuality, AtmRiver, GEDI, PerpOcean): 1.00 (8 features) / 0.99 (3 features). The closest product pair is SST vs Aerosols (centroid z-distance 2.2); everything else >= 3.
- Limitation: Aerosols, AQ, AtmRiver, GEDI, PerpOcean have 1-2 images each, so within-product variation is unmeasured; NL frames come from one video (LOO not fully independent).

### 1g. Resources with no flat map or no numeric key (judged from R2 + images, not decoded) [I]
- GEDI 4950: globe only; no flat lat/lon. Height colour bar exists but unvalidated; usable only in match/phenomenon rounds. 
- Air Quality 5533: 4-species strip mosaic, labels burned in; 1809 frames (huge); only match/phenomenon.
- Perpetual Ocean 2 5425: globe/close-up video (about 950 MB for temperature 1080p); match/phenomenon only; it is the same ECCO2 family as 3912 so SST questions already cover it.
- Atmospheric river 4960: 3D regional; one named event; a "what is moving" phenomenon only; frame-to-frame motion exists [U] not measured.
- Caldwell 73 13786: astronomy, not Earth, conceptual only. [I]

## 2. Resource x family matrix (P = plausible, X = no)
| family | 5313 NL | 3912 SST | 5011 Lightning | 5669 Aerosol | 5196 CO2 | 5533 AQ | 5425 PO2 | 4960 AR | 4950 GEDI |
|---|---|---|---|---|---|---|---|---|---|
| 1 Then vs now | P strong | P (month) | P (year-phase) | X | X | X | X | X | X |
| 2 Which has more | P strong | P strong | P (frame-keyed) | weak (1 still) | X | X | X | X | X |
| 3 Odd one out | P (7 dim cities) | P (3 warm + 1 cold) | P | X | X | X | X | X | X |
| 4 Match sound to image | P | P | P | P | P (frames) | P | P | P | P |
| 5 Guess the layer/phenomenon | P | P | P | P (4 colours) | P | P | P | P | P |
| 6 Season/month | X | P (4-way weak, 2-way ok) | P strong (2-way) | X | X (Jan-Mar only) | X | X | X | X |
| 7 Rank order | P strong | P | P | X | X | X | X | X | X |
| 8 Trend/peak in sequence | X (yearly frames interpolated) | P (peak month by region) | P (when NH peaks) | X | weak | X | X | X | X |
| 9 Region type | P (city/ocean/land) | P (ocean/land) | P (forest/desert weak) | X | X | X | X | X | X |
| 10 Place among choices | weak (R2) | weak | weak | weak | X | X | X | X | X |

## 3. Ranked table
| rank | family | resources | # rounds possible | measured signal | hearability | chance | verdict |
|---|---|---|---|---|---|---|---|
| 1 | 7 Rank-3 + 2 Which has more (change & static) | NL 5313 (+SST, Lightning) | NL 1,121 pairs (gap >= 30 pts), 11,235 triples; SST 171 pairs | 18-37 of 59 cities |change| >= 25%; 55% of pairs >= 2x light, 27% >= 4x; SST pair gap median 8.2 C | easy: loudness/density, pitch for SST | 50% pairs, 33% for rank-3 (16.7% for full order) | KEEP |
| 2 | 6 Season / hemisphere | Lightning 5011 (+SST 3912) | lightning 31 unambiguous of 35 sampled frames (6,002 frames available, unlimited in practice); SST 4 frames (more TIFFs possible) | NH/SH ratio 0.17-22.6; SST asym -0.8 to +11.9 C | good if NH and SH are separate registers (pitch/pan); SST gap Jun-Dec only 2.9 C: hard | 50% (2-way); 25% (4-way SST) | KEEP (2-way lightning), MAYBE (4-way SST) |
| 3 | 1 Then vs now | NL 5313; SST (Mar vs Sep) | 34 clean city rounds but 28 up / 6 down; SST 14 of 19 points >= 3 C | up +30% to +265%, down -17% to -51%; SST up to 11 C | easy, up/down pitch glide | 50% nominal, but 82% by always saying "brighter" on the natural pool; balance to 50/50 gives about 12-14 rounds | KEEP (must balance) |
| 4 | 4 Match sound to image + 5 Guess the layer | all 9 products | unlimited (frames) | simulated LOO 0.98-1.00 (3 features) | easy to hear different layers; fine frame match hard (CO2 most variable, SST least) | 25% | KEEP as easy/teaching round (jukebox link) |
| 5 | 3 Odd one out | NL, SST | 3,906 NL triples (only 7 distinct "dim" places) | same as 1; SST warm/cold | easy if one differs strongly | 33% | MAYBE (low variety) |
| 6 | 9 Region type (city/ocean/land) | NL + SST | about 3 classes x unlimited points | city p99 90-235 vs ocean 1.3 vs unlit land 3-64 | easy for city vs ocean; desert vs forest not separable (Congo 2.7, Atacama 64) | 33% (3-class) | MAYBE (3-class only) |
| 7 | 8 Peak/trend in sequence | Lightning, SST | about 10 per region | peak about every 12.5 s of video, region means swing 0 to 1468 | hearable as a pitch/density arc, key is noisy (29% sample-to-sample) | 25-33% | MAYBE |
| 8 | 5 Phenomenon by colour | Aerosols 5669 | about 30-40 tiles, 22 sulfate | 4 categorical colours, single date | easy via 4 timbres | 25% (but 53% sulfate prior) | MAYBE (lacks balance) |
| 9 | 10 Guess the place | NL, SST, Lightning, Aerosols | 14-place R2 set | 29/91 pairs differ on <= 2 layers (R2) | poor | 25% | DROP |
| 10 | CO2, GEDI, AQ, PO2, AR, Caldwell as numeric keys | - | - | no flat map or no decodable value | - | - | DROP (match/jukebox only) |

## 4. Recommended 5-round daily mix (date-seeded)
Order is easy to hard; each round has a data-derived key; the pool is pre-filtered by the gaps below.
1. Match sound to image (warm-up, 4 thumbnails, NL / SST / Lightning / CO2 frames). Upper-bound feature-space accuracy 0.99 vs chance 0.25.
2. Then vs now (NL; 50/50 by construction): hear Kyiv 2012 vs 2023 (change -51%, dimmer) or Dhaka (+116%, brighter). Rejects cities with |change| < 30% or change-map disagreement.
3. Which has more (alternate NL static / SST / lightning): e.g. NL 2023 Chicago p99 235 vs Lagos p99 90; SST Mar 2007 Kuroshio 16.4 C vs Mid-Pacific 27.0 C (gap 10.6 C; use the pinned frame, in Sep the gap shrinks to 1.3 C); lightning Congo 643 vs Sahara 14 mean dots.
4. Season from lightning (2-way): "northern or southern summer?" key = NH/SH ratio of dots in the frame: e.g. video t = 63.5 s ratio 23.7 (NH) vs t = 68.5 s ratio 0.17 (SH), t = 76 s 14.9; skip 0.5-2 frames.
5. Rank 3 (NL change): e.g. Delhi +79%, Moscow +58%, Paris -39% (all gaps >= 25 points), play three, order them. Variant: odd-one-out (Beijing +71%, Mumbai +70%, Kyiv -51%).
Pool depth for 25+ days: rounds 2 and 5 need >= 25 distinct items; with 34 clean cities, 28 up / 6 down, add regions (sub-city windows, war-affected and Venezuelan/Syrian areas) to balance, or alternate "then vs now" with "which grew more" (783 pairs) instead of up/down.

## 5. Gotchas and unknowns
- Base-rate trap in Then-vs-now (82% always-"brighter"); fix by balancing, or ask which of two grew more.
- Lightning frame dates are not on the flat video (the date mapping is [U]); key rounds on dot ratios, not dates. Keep to frames t >= 10 s (empty at start).
- Lightning "which has more" winners flip with season (22 of 66 region pairs), so the key must be per-frame.
- SST is a 2007-08 ECCO2 model run; 4 sampled frames; decoded T is +-1-2 C [I]; season-guess 4-way has a Jun-Dec gap of only 2.9 C.
- Simulated listener accuracies are ceilings. Human accuracy [U] needs the 8-10 person listening test already planned; the mapping (pitch/density/pan) used in these simulations is not yet synthesized.
- Colour-hue SST decode and thin aerosol class thresholds are crude [I]. Aerosol/AQ stills are single snapshots.
- Not tested: atmospheric-river and Perpetual Ocean motion, GEDI value decode, air-quality species strips.
