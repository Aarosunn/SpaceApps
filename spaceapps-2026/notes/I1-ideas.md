# I1: Independent ideation (10 candidates), 2026-11-14
Tags: [VERIFIED] = I fetched/read it this session; [INFERRED] = my reasoning; [UNKNOWN] = not established.
Inputs read: 02-challenges-2026.md, 01-winners-analysis.md, sources/guide-judging.txt, sources/event-chicago.txt. Not read: 04/00/idea-current/R1 files. I did NOT re-read sources/c-*.txt in full; challenge facts come from 02-challenges-2026.md (which says it was rebuilt from them).
Scoring: Impact / Creativity / Validity / Relevance / Presentation (1-5), feasibility (1-5, 4 devs ~28h), crowding (H/M/L, from the 02 file's GitHub-count proxy [SECONDARY]).

## Existing data folder (notes/ideation/) audit
- data/firms/: 4 CSVs, FIRMS country archives for Argentina, MODIS (Terra) + VIIRS-SNPP, years 2012 and 2023 (47.9k to 190k rows each, 4-15 MB). [VERIFIED] columns: latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight,type. Obtained with no credentials found in scripts [INFERRED]; exact download URL not recorded by prior session [UNKNOWN].
- data/spherex/: two 29x29-px FITS cutouts of Barnard's Star (epochs 2025-08-27 and 2026-03-11; HDUs IMAGE/FLAGS/VARIANCE/ZODI + EPSF + WCS-WAVE tables; BUNIT MJy/sr-style), plus IRSA SIA2 VOTables. [VERIFIED by scripts/fits_peek.py]. The summary script found 0 rows in sia_barnard.xml (VOTable layout mismatch), so the cutouts' download path is [UNKNOWN]; the official IRSA tutorial https://caltech-ipac.github.io/irsa-tutorials/spherex/ is the route.
- data/horizons, data/lola, data/power, data/misc: were EMPTY (previous session never got that far). I filled power/ and horizons/ and checked LOLA (below).
- New this session: data/power/champaign.json (4 KB), data/horizons/sun_pole.txt (6 KB), data/lola/ldem_80s_20m.lbl (5 KB), data/psi/search.html (1 KB), data/nisar/head.bin (27 B, a 401 body).

## Ranking (my overall judgement: score, feasibility, crowding, award fit)
| Rk | Idea | Challenge | Target award | I/C/V/R/P | Feas | Crowd |
|---|---|---|---|---|---|---|
| 1 | A. SPHEREx Blink + Spectra | Planet X and SPHEREx | Best Use of Data | 4/3/5/5/4 | 4 | L-M |
| 2 | B. Fire Rosetta (sensor-agnostic burn calendar) | MODIS/VIIRS Hot Spots | Best Use of Science | 4/3/5/5/3 | 5 | M |
| 3 | C. Slip Calculator (terrain-masked landing planner) | Lunar Landing Site Navigator | Best Mission Concept | 4/3/4/4/4 | 4 | M |
| 4 | E. The Detective That Argues Back | Earth System Trend Detective | Best Use of Science | 3/4/5/4/3 | 5 | M |
| 5 | F. Decodable Jukebox (listening-test sonification) | Earth Information Jukebox | Best Use of Data (accessibility) | 4/3/3/4/5 | 4 | H |
| 6 | I. Moon-Base Flammability Gap Map | Flame in Freefall | Best Use of Science | 4/4/4/4/3 | 3 | M-H |
| 7 | G. Chicago NISAR change map | Dancing with the SARs | Local Impact | 4/4/4/5/4 | 2 | L |
| 8 | J. Cold-trap analogs: Earth sinkholes vs lunar PSR craters | Earth analogs Moon/Mars | Best Use of Science | 3/5/3/4/4 | 2 | M |
| 9 | D. Still Out There (live sun clock for dead hardware) | Abandoned but Not Forgotten | Best Storytelling | 3/4/3/3/5 | 5 | M-H |
| 10 | H. Illinois rotation scorecard | Field Shift | Local Impact | 4/2/3/4/3 | 4 | M-H |
Blunt notes: H is mediocre (crowded, incremental, farm-advice claims hard to validate in 28 h). D is charming but low on science/data; works only as a cheap add-on to C. G is the best story but the data path needs Earthdata login and 7 GB granules, so it is a trap for a 33-hour window. 8 of 10 ideas are for non-Jukebox challenges (requirement: at least 6).

---
## A. SPHEREx Blink + Spectra (Planet X and SPHEREx)
- Award: Best Use of Data ("makes space data accessible or a unique application"). The challenge asks for a public blink-comparator web tool, so the novelty must be in execution.
- Pitch: a citizen scientist or Backyard Worlds volunteer types RA/Dec (or clicks a preset) and sees SPHEREx epochs blinked like a movie, with moving sources auto-flagged and a per-source spectrum drawn on the fly; payoff: they can spot a brown dwarf/comet without knowing FITS.
- Data [all on the official page]: IRSA SPHEREx archive https://irsa.ipac.caltech.edu/Missions/spherex.html ; tutorials https://caltech-ipac.github.io/irsa-tutorials/spherex/ ; Gaia DR3 https://archive.stsci.edu/missions-and-data/gaia ; WiseView http://byw.tools/wiseview. Required test targets: Barnard's Star, Epsilon Indi B, WISE 0855, RW Aur, R Dra.
- Wow in 30 s: type "WISE 0855", the patch blinks across epochs and a circled dot slides while the stars stay put; a click draws its 102-band spectrum with a methane-like dip/rise. URL has coordinates, so judges can paste it.
- MVP (28 h): backend (Python, astropy, astroquery/pyvo) that does IRSA SIA2 lookup, cutout fetch, per-epoch WCS reprojection to a common grid, difference image + moving-source finder, Gaia DR3 proper-motion overlay; frontend (static JS canvas) blink player + spectrum plot + URL state. Pre-cache all 5 targets so the demo cannot fail on a slow archive.
- Validity claim: detected motion in px/yr matches the known proper motion of the targets. Verification: for Barnard's Star (PM about 10.4"/yr, [INFERRED from memory, confirm in Gaia]) compare the measured centroid shift between the two cached epochs with the Gaia value; report agreement within error for all 5 targets. A quick check below: peaks moved (14,14) to (13,15) px between 2025-08-27 and 2026-03-11 (196 days), roughly 1.4 px; at ~6"/px that is ~8", which is the same order as the expected ~5.6" (pixel scale [UNKNOWN] here; cutouts are named "pmcorr", so the centering convention must be checked first).
- Not a copy: no past Space Apps winner built a SPHEREx tool (the mission is new, 2025-26); closest cousin is WiseView (not a Space Apps entry).
- Biggest risk: epoch-to-epoch registration and detector/band variation produce false movers; multiple bands have different PSFs. Mitigation: flag-mask using the FLAGS HDU, restrict to one band per epoch for blinking.
- Access test: see Data Access Tests below.

## B. Fire Rosetta (MODIS/VIIRS Hot Spots)
- Award: Best Use of Science (a stated, testable harmonization method with uncertainty).
- Pitch: a land manager or fire scientist pulls a region and sees one continuous 2000-today burn calendar in "VIIRS-equivalent" units, with uncertainty bands, so the MODIS retirement does not break the trend.
- Data: FIRMS https://www.earthdata.nasa.gov/data/tools/firms (the only listed resource) [VERIFIED page listing in the 02 file]. FIRMS archive files already on disk.
- Wow: slide the year selector across the 2012-2023 gap and the bars stay continuous; toggle "raw" and you see the cliff where VIIRS (375 m) takes over; hover shows CI.
- MVP: (1) grid hotspots to a common cell (e.g. 0.25 deg) by month; (2) fit MODIS-to-VIIRS transfer on the overlap period (2012-present) as a function of cell, season, FRP and day/night, with bootstrapped CI; (3) hold-out validation (fit on odd years, predict even years, and a spatial hold-out of regions); (4) web app: draw/enter region, date range, calendar heatmap, anomaly vs multi-year mean, CSV download.
- Validity: the ratio is not a constant, so a scalar fix is wrong. Evidence from the files on disk [VERIFIED, computed this session]: monthly VIIRS/MODIS(Terra) count ratio, Argentina, 2012: 1.0 (Jan, VIIRS starts Jan 20), 3.7, 3.6, 4.3, 3.5, 3.2, 2.9, 3.1, 3.5, 3.5, 3.5, 2.9; 2023: 5.0, 4.5, 4.5, 3.9, 3.6, 3.3, 3.3, 2.9, 3.4, 3.5, 3.2, 3.0. So ratio ranges 2.9-5 with seasonal/yearly drift: a one-parameter scale would carry a 70% error. Verification: report out-of-sample error of the model vs the naive scalar on held-out years/regions. Caveat: the files hold Terra only for MODIS; Aqua, and Terra drift/orbit change, [UNKNOWN] effect.
- Not a copy: no past winner touched FIRMS harmonization (2026-only challenge).
- Biggest risk: pixel footprint and overpass-time differences mean counts are not physically comparable; a judge asks "what is the ground truth?". Answer: the overlap-period co-detection; admit no independent truth exists.
- Access: see tests.

## C. Slip Calculator (Lunar Landing Site Navigator)
- Award: Best Mission Concept ("most plausible concept and design").
- Pitch: a CLPS mission planner enters a site and a launch date and instantly sees "if we slip N days, minutes of Sun and Earth visibility lost", with the real terrain horizon, in one screen a non-specialist can read.
- Data: JPL Horizons https://ssd.jpl.nasa.gov/horizons/ (official), LOLA topography (named in the page text, no URL listed; PDS Geosciences node https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ [VERIFIED reachable]), Quickmap/Moon Trek as reference.
- Wow: drag a date slider; a polar sky dial shows Sun and Earth tracks above a jagged LOLA horizon; Earth sets behind a ridge and a countdown shows "Earthset in 3 h 12 m; slipping 6 days loses 41 h of comms".
- MVP: precompute Horizons topocentric Sun/Earth Az/El for 5-10 sites (Apollo 11/17, Shackleton rim, Malapert, Intuitive Machines IM-2 site, etc.) over 2026-2028 (API calls, one per site); build horizon mask from LOLA 80S/85S DEM tiles by ray-marching to 20 km radius (numpy); compute visible-Sun/Earth minutes per lunation; side-by-side compare + slip slider; static web front end.
- Validity claim: terrain-masked Sun visibility differs from bare-sphere elevation by a quantified margin, and the geometry reproduces Horizons. Verification: (a) at -89.5 lat the Sun elevation from Horizons stays within +/-1.54 deg (the Moon's 1.54 deg axial tilt) [VERIFIED: my call returned 1.56 and 1.50 deg on 2026-Dec-01, consistent]; (b) compare computed illumination fractions against a published value (e.g. Shackleton rim near 89.9S is illuminated >80% of the year, [INFERRED from the literature, needs a citation]); (c) Horizons vs an independent SPICE/astropy calc at 3 timestamps.
- Not a copy: past navigator-type winners (Landsat Connect 2024) were Earth tools; no past lunar-site planner won. Crowd: other 2026 teams likely do Sun elevation only.
- Biggest risk: LOLA tiles are 115 MB each (80S/85S 40 m-80 m), the horizon ray-march is the one non-trivial algorithm; schedule risk if the front end needs 3D. Keep 2D polar dial.
- Gotcha: Horizons rejects observer-table with the target at the same body ("Observer table for observer=target disallowed"); use COMMAND='10' (Sun) or '399' (Earth) with CENTER='coord@301' and COORD_TYPE=GEODETIC [VERIFIED].

## D. Still Out There (Abandoned but Not Forgotten)
- Award: Best Storytelling. Pitch: a kid or a teacher opens a map of the Moon; each dead lander "speaks" in first person and tells you what its own sky looks like right now (Sun elevation, Earth up or down, time to sunset), computed live. Data: NSSDCA pages on the official list (e.g. https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C), Horizons (as in C). Wow: Surveyor 3 says "I have been in sunlight for 5 days; sunset in 9. My last photo was in 1967." MVP: ~12 artifacts, hand-written narration, Horizons job, map UI, TTS-free audio narration with captions. Validity: facts checked against NSSDCA pages; coordinates from NSSDCA/LROC [UNKNOWN exact]. Not a copy: 2025 storytelling winner was an illustrated book; live-sky framing is new. Risk: judges see it as a nice story with thin science; weak on "NASA data integral". Use as a cheap add-on if C is built.

## E. The Detective That Argues Back (Earth System Trend Detective)
- Award: Best Use of Science (the challenge itself asks for t-test / Mann-Kendall / CI, and judges are told non-significant is fine).
- Pitch: a student picks a region and a variable and gets a verdict like a case file, in which the tool then attacks its own conclusion (autocorrelation-adjusted Mann-Kendall, seasonal removal, shuffled-region null) and tells them how likely a "trend" this strong is by chance.
- Data: Giovanni https://giovanni.gsfc.nasa.gov/ , AppEEARS https://appeears.earthdatacloud.nasa.gov/ (official; both likely need Earthdata login [INFERRED]); no-login route: NASA POWER (https://power.larc.nasa.gov/) point/regional monthly API. POWER is not on this challenge's list, so it is weak for "relevance" unless MERRA-2-derived (POWER is built on MERRA-2/CERES/GEWEX [INFERRED, verify]).
- Wow: the student "finds" a warming trend in Chicago; the tool runs 1000 random-location nulls and shows the observed slope sitting at the 97th percentile with a red banner "only ~3 of 100 random places look this strong".
- MVP: Python/JS: fetch POWER monthly series, deseasonalize, Sen slope + Hamed-Rao modified MK, block-bootstrap CI, field-significance null across ~200 pre-pulled grid points; case-file UI with a question flow; 6 demo cases (urban heat Chicago, Arctic, Amazon precipitation, etc.).
- Validity: our MK implementation reproduces scipy/pymannkendall outputs on the same series; known case (Chicago T2M warming ~0.3 C/decade, [INFERRED]) recovered; null calibration test (random noise gives ~5% false positives at alpha 0.05).
- Not a copy: no past winner is a "trend skeptic" tool; closest is generic dashboards.
- Risk: it looks like a stats lesson, not a product; story and visuals must carry. Medium crowd (110 GitHub hits).

## F. Decodable Jukebox (The Earth Information Jukebox)
- Award: Best Use of Data (accessibility of space data) with Global Connection as secondary. Past winners: 2023 Global Connection "Arcobaleno" (sonification for sight-impaired) and 2018 Most Inspirational "SongSAT" [VERIFIED in 01 file]; to be not-a-copy it must do something they did not: prove that a listener can decode the data.
- Pitch: a blind or low-vision learner picks one of the 11 official EIC visuals and hears a soundscape in which scale degree = value, stereo position = longitude, and time = frame, with a spoken legend; payoff: they can answer "where is it darker/hotter?" by ear.
- Data: all 11 SVS items on the official page (e.g. https://svs.gsfc.nasa.gov/5313/); frames [VERIFIED] via https://svs.gsfc.nasa.gov/api/5313 (JSON) -> MP4 and frame directory.
- Wow: close eyes; a 20-second night-lights piece in which India brightens on the right and Europe stays steady, then a quiz tells the user their decoding score.
- MVP: Python (opencv/numpy) for per-frame feature extraction, quantized musical scales, WebAudio or pre-rendered WAV/Ogg playback, keyboard-only UI with ARIA; a small listening test (10-20 people at the venue, incl. any BLV volunteers via the business teammate) measuring decoding accuracy.
- Validity: listening test accuracy vs chance; mapping legend published. Honest limit: 10-20 sighted people blindfolded do not prove usability for BLV users.
- Crowd H (111 hits; 20+ public repos on day 1 per the 02 file). Biggest risk: it ends up as "image-to-notes" like 20 others; the listening test is the only real differentiator and the demo must show it.
- Wow quality is highest of the set for a 30-second video (audio is inherently demoable), but crowding is the worst.

## I. Moon-Base Flammability Gap Map (Flame in Freefall)
- Award: Best Use of Science. Pitch: a fire-safety engineer sees a map of oxygen fraction x pressure x gravity/flow space, with every combustion investigation as a point, and the planned Moon Base atmosphere (>=30% O2, <=10.2 psi, per challenge text) highlighted, showing which conditions no experiment has covered.
- Data: PSI https://psi.nasa.gov/physci/repo/search?q=combustion (official). [VERIFIED] the URL returns HTTP 200 but only a 954-byte JS shell; the data is behind a JS app, so extraction path is [UNKNOWN]. Also the ISS combustion guide https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/ .
- Wow: the point cloud has a visible empty region exactly where the Moon base atmosphere lives.
- MVP: manually curate ~25-40 investigations (ACME, FLEX, CFI, BASS, SAME, DAFT etc. named in the challenge) from NASA pages into a table (LLM-assisted extraction, human-verified); scatter + filter UI; "coverage" statistic. 
- Validity: every row carries a source URL and quoted passage; inter-rater check of 10 rows. Risk: the gap map shows gaps in OUR extracted table, not in all PSI data; if PSI exposes an API this improves. Crowd M-H (LLM dashboard pattern). Not a copy: 2025 knowledge-engine winner (SpaceGenes+) was bio; this is a gap analysis, not search.

## G. Chicago NISAR change map (Dancing with the SARs)
- Award: Local Impact (hometown study area is explicitly invited). Pitch: a Chicago resident sees how the lake/shoreline wetlands/soil moisture around them changed between NISAR passes, with the radar physics explained.
- Data: NISAR provisional products via NASA CMR/ASF https://search.asf.alaska.edu/ and https://nisar-docs.asf.alaska.edu/ (official). [VERIFIED] 67 GCOV granules cover the Chicago bbox, 2025-10-29 to 2026-10-21 range exists in the collection (this bbox: 2026-06-17 to 2026-10-18), ~7.3 GB per granule.
- Wow: swipe slider flips VV/VH backscatter before/after a Lake Michigan storm surge or a wet/dry soil change.
- MVP: not realistic without a login and multi-GB downloads (see test). Alternatives: L3 soil-moisture product, or CSA RCM/SAOCOM partner data [UNKNOWN access]. 
- Risk: data access. Crowd L (a real asset if it works). Score reflects feasibility 2 only.

## J. Cold-trap analogs (Earth analogs for Moon base / Mars)
- Award: Best Use of Science. Pitch: find Earth places that act like lunar permanently shadowed craters (radiatively cooled, inversion-trapping depressions: karst dolines/cold-air pools), rank them by a similarity score, and say exactly where the analogy breaks (no atmosphere, no gravity match). Beyond Antarctica/Atacama/Iceland/Hawaii per the challenge hint. Data: LRO Diviner via PDS https://pds-geosciences.wustl.edu/missions/lro/diviner.htm , LOLA, Earth LST/DEM via Earthdata (login [INFERRED]). Wow: a map of unexpected analog sites with similarity scores. Risk: building a defensible Earth-side temperature and shape dataset in 28 h; validity of "analog" claim is hard to verify; feasibility 2. Not tested.

## H. Illinois rotation scorecard (Field Shift)
- Award: Local Impact. Compare 3 rotations (existing, corn-soy-wheat, with cover crop) using POWER (verified, below), CDL, SSURGO for an Illinois county. Mediocre: crowded, the validation would be literature citation rather than a test, the creativity is incremental. Include only if a farmer partner exists. Not tested beyond POWER.

---
## DATA ACCESS TESTS (top 4 + two extra)

### A. SPHEREx [VERIFIED, reused]
- Files: notes/ideation/data/spherex/cut_barnard_D4_e1_pmcorr.fits and ..._e2_pmcorr.fits, 3.96 MB each; HDUs: primary, IMAGE 29x29 float32, FLAGS 29x29 int32, VARIANCE, ZODI, EPSF (BINTABLE 441x8752), WCS-WAVE. Epochs 2025-08-27T05:07 and 2026-03-11T02:12 (MJD 60914). Detector 4 ("D4").
- Format FITS multi-extension; size small because of cutout; license: NASA/IRSA public data [license text UNKNOWN, treat as public domain per NASA media policy, cite IRSA].
- Gotchas: SIA2 VOTable parse returned 0 rows with my script, so confirm the table layout; WCS CRPIX values are large negative (-524, -911): cutout WCS is the full-detector WCS, so use astropy.wcs, don't assume the centre; each exposure sees one wavelength per pixel (spectral image), so blinking mixes wavelengths across epochs unless you pick the band by wavelength.
- Anonymous access [INFERRED] since no credentials appear in scripts; exact URL [UNKNOWN].

### B. FIRMS [VERIFIED, reused]
- Files: viirs-snpp_2012/2023_Argentina.csv (190k/172k rows, 14-15 MB), modis_2012/2023_Argentina.csv (62k/48k rows, 4-5 MB). Computed monthly VIIRS/MODIS ratios above.
- License: FIRMS data are open (NASA open data; cite FIRMS) [INFERRED, not re-read]. Gotchas: MODIS confidence is 0-100 numeric, VIIRS confidence is n/l/h letters (harmonize first); VIIRS column bright_ti5 vs MODIS brightness (different bands, 4 um vs 375 m I4/I5); VIIRS-SNPP starts 2012-01-20; acq_time UTC; only Terra in the MODIS files (Aqua separate); country-wide files for 20 years would be large, so pre-aggregate to a grid. Official MAP_KEY API [UNKNOWN whether needed; the earlier files came without credentials in scripts].

### C. Horizons + LOLA [VERIFIED, new]
- Horizons API call (no login): https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND='10'&CENTER='coord@301'&COORD_TYPE=GEODETIC&SITE_COORD='0,-89.5,0'&START_TIME='2026-12-01'&STOP_TIME='2026-12-03'&STEP_SIZE='12h'&QUANTITIES='4'&EPHEM_TYPE=OBSERVER. Returned HTTP 200, 6 KB, e.g. "2026-Dec-01 00:00 280.05 1.557" (azimuth, elevation deg). Saved data/horizons/sun_pole.txt. Elevation 1.56 deg matches the expected polar tilt of 1.54 deg.
- LOLA: public, no login: .../lola_gdr/polar/img/ldem_80s_80m.img = 115,520,000 bytes; ldem_85s_40m.img = 115,034,112 bytes; also ldem_85s_10m, 20m, 80s_20m/40m (PDS .lbl/.xml labels). Label fetched (ldem_80s_20m.lbl, 5 KB): 30400x30400, 16-bit, scale 0.5 m/DN, 1516 px/deg. I did NOT download a full image (115 MB+); range requests [UNKNOWN] whether supported.
- Gotchas: Horizons observer-from-target error above; Horizons rate limits [UNKNOWN]; polar stereographic projection of LOLA needs reprojection; Horizons gives ephemerides at site on a sphere reference unless you pass elevation, which is zero by default.

### E. POWER (for the Trend Detective no-login route) [VERIFIED, new]
- https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,PRECTOTCORR&community=AG&longitude=-88.2&latitude=40.1&start=2015&end=2024&format=JSON -> HTTP 200, 4.3 KB JSON; monthly keys like "201501", with a 13th "annual" key (201513) per year (gotcha: strip month 13 before time-series work). No login. License: NASA POWER open data, cite POWER. [License text UNKNOWN]. Giovanni/AppEEARS (official) likely require Earthdata login [INFERRED, not tested].

### G. NISAR (extra test) [VERIFIED, new]
- CMR search is open: https://cmr.earthdata.nasa.gov/search/granules.json?short_name=NISAR_L2_GCOV_PROVISIONAL_V1&bounding_box=-88.5,41.5,-87.3,42.4 returned 67 granules for Chicago between 2026-06-17 and 2026-10-18; collections also exist for GSLC, GUNW, GOFF, RSLC, L3 SME2 soil moisture (PROVISIONAL V1), found by keyword NISAR in CMR.
- Download: HEAD on nisar.asf.earthdatacloud.nasa.gov gives 303 -> a CloudFront URL; the next request returned HTTP 401 ("HTTP Basic: ..."), i.e. Earthdata login required (not created). Granule ~7.35 GB. Verdict: RISK, no no-login route found. Provisional data is "provisional", so scientific claims need a caveat.

### F. SVS [VERIFIED, new]
- https://svs.gsfc.nasa.gov/api/5313 returns JSON (title, description, media_groups); media has http://svs.gsfc.nasa.gov/vis/a000000/a005300/a005313/... an MP4 (2160p h265) and a frames/ directory (HTTP directory listing returned 0 hrefs to my grep, so the frame filenames [UNKNOWN]; the JSON gives the path). No login. License: NASA media, generally public domain unless credited otherwise [INFERRED].

### I. PSI [VERIFIED, new] returned a 954 byte JS shell: no usable HTML; API path UNKNOWN. Risk recorded.

## What I would pick (my blunt view)
1. A (SPHEREx) or B (Fire Rosetta): the two ideas where the data is in hand, validation is quantitative and crowding is lower. A has the better demo; B has the more defensible science claim and the lowest build risk. 2. C if the team wants Mission Concept. 3. Do not pick G unless someone already has an Earthdata login AND a way to pull 7 GB tiles. 4. F is the highest-demo-value but the worst crowding.
