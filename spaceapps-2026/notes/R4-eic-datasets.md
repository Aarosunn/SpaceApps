# R4: EIC-linked datasets for rounds 2 and 3 (Sat Nov 14 2026)

Tags: [V] verified/measured this session; [I] inferred; [U] unknown. Scripts: feasibility/scripts/r4_gistemp.py, r4_gistemp_bands.py, r4_fire.py. Data: feasibility/data/r4/ (API json, frames, 60 MB GISTEMP mp4).

## 0. Key finding: the EIC gallery is a hub of sub-galleries
https://svs.gsfc.nasa.gov/gallery/earth-information-center/ lists ~15 items directly (4950, 4960, 4993, 5011, 5313, 5196, 5425, 5533, 14xxx videos, 14371 b-roll) [V], but ALSO 10 DASHBOARD sub-galleries (/gallery/climate-vital-signs-dashboard, greenhouse-gases-dashboard, earth-now-dashboard, wildland-fires, carbon-dioxide-sources-sinks, air-quality-dashboard, nasaand-agriculture, nasaand-hurricanes, main-dashboard, daily-visualizations) [V]. The page text says the gallery is "content used in the hyperwall display in the EIC at NASA HQ" and the official challenge says resource #1 is "a set of visuals... used in the EIC dashboards" [V]. So items below are in-scope EIC content, though only the directly-listed ones are individually named on the challenge page. eic.nasa.gov itself: curl returned no response (000) [V]; not investigated further. Search API (/api/search?...) did not work for me; galleries were scraped from the HTML instead.
Dashboard items found [V titles]: Climate Vital Signs: 5099 daily polar sea ice, 5111 ocean heat since 1957, 5119 OCO-2+Keeling curve, 5190 climate spiral, 5191 global temp graph, 5207 GISTEMP map 1880-2023, 5209 zonal anomalies, 5382 Arctic sea ice minimum 2024, 5235 sea level porthole. Greenhouse: 5115/5116 CO2/CH4 volumetric 2021, 5117 N2O trends, 5118 CH4 trends, 5126 AGGI, 5047 NEE. Wildland fires: 5453 US annual burned area 1983-2025, 5113 active fires VIIRS, 5315 fire weather. Agriculture: 5087 water cycle extremes, 5098 root zone vs groundwater, 4968 Iowa cropland, 10721 Las Vegas 1972-2021.

## 1. Measured candidates

### A. Sea Level Through a Porthole, SVS 5235 (https://svs.gsfc.nasa.gov/5235/)  [TOP]
- EIC: yes, Climate Vital Signs dashboard (EIC sub-gallery) [V]. Not individually on the challenge list.
- Takeaway: global mean sea level rose about 11 cm between 1993 and 2023 and the rise is accelerating; it floods coasts. Public domain.
- Format: 2160x2160 mp4, 50 s, 1500 frames (https://svs.gsfc.nasa.gov/vis/a000000/a005200/a005235/seaLevelWaveTankComp_noWW_3-5-5-2024a_2160p30.mp4, 64 MB); also frame dir. Chart-like (waterline vs ruler), not a map. Ruler in cm, blue bar from "1993 sea level" to "<year> sea level", year label burned in (2008 seen at t=25 s) [V].
- Timeline [V/I]: t=0-10 s holds 1993; 1 s of video = 1 year (t=25 -> 2008 confirmed visually; t=40 -> 2023 by the label in the still); then holds.
- MEASURED (blue-bar height vs ruler, 9.72 px/cm in 1024 px frame; error ~ +-0.3 cm [I]): 1998 (t=15) +1.9 cm; 2003 (t=20) +3.0; 2008 (t=25) +4.5; 2013 (t=30) +6.5; 2018 (t=35) +9.1; 2023 (t=40) +11.3 (t=49: 11.4).
- Trend in data: strong, monotonic, no noise (it is a smoothed global mean). Takeaway is 100% the trend.
- Guessability: very high (higher water = higher pitch; reference 1993 = 0 cm = flat/low tone). Four labelled options far apart.
- Risks: global mean only (no place); only one trajectory (reusable by picking different years: 5 distinct years max, 30 if interpolating every frame, so pool for daily rounds is small but fine for 1-2 rounds). Wave texture irrelevant: sonify bar height, not pixels.

### B. GISTEMP Global Temperature Anomalies 1880-2023, SVS 5207 (https://svs.gsfc.nasa.gov/5207/)  [TOP]
- EIC: yes, Climate Vital Signs dashboard [V]. Also 5209 zonal anomalies (same data, chart), 5190/5191 spiral/graph.
- Takeaway: Earth has warmed ~1+ C since the 1951-80 baseline, fastest in the Arctic/land; 2023 was the warmest year on record. 
- Format: 1920x1080 mp4 (60 MB, 900 frames, 30 fps; 4K frames dir exists), Robinson FLAT map, 24-month running mean, colour bar -2..+2 C (blue-white-yellow-red; saturates at +-2) and a 1880-2024 progress bar [V]. Frame f -> year via progress bar (frame 450 = 1956, 899 = 2023).
- MEASURED with Robinson-projection pixel lookups + colour-bar decode (script r4_gistemp_bands.py). Latitude-band means [V decode, +-0.3 C [I]; decode has an apparent cold bias around 1951-80 where truth is ~0, so label from official GISTEMP table, not from pixels]:
  - Arctic 65-80N: 1881 -0.95; 1926 +0.27; 1956 -0.59; 1986 +0.16; 2001 +1.31; 2016 +1.85 (colour bar saturates at +2: true Arctic anomaly is higher [I]).
  - Global 60S-75N: 1881 -0.49; 1911 -0.70; 1986 +0.04; 2001 +0.80; 2016 +1.25.
  - Single places 2023 frame (r=6 px): Arctic Svalbard +2.0 (sat.), Siberia +2.0 (sat.), Paris +2.0, Sahara +1.9, Amazon +1.7, India +1.0, Southern Ocean +0.8. Single-point decode flips sign in noisy spots (ENSO region) so use band means/regional windows.
- Trend: strong (global +1.7 C swing 1911->2016) but with decadal noise (Arctic 1926 > 1956).
- Guessability: high with "time as option" (e.g. same place, four eras) or "which region". Reference = 1951-80 baseline = 0 (white). Note a novice hears "temperature" abstractly; need pitch up = warmer.
- Risks: colour saturation at +2 caps the top; decoded numbers should be replaced by GISTEMP regional numbers in labels [U: we did not download the GISTEMP table]; hue decode ambiguity at white/yellow.

### C. Annual Wildfire Burned Area in the US 1983-2025, SVS 5453 (https://svs.gsfc.nasa.gov/5453/)
- EIC: yes, Wildland Fires EIC dashboard gallery [V]. Source: National Interagency Fire Center (credit in image).
- Takeaway: US wildfires burn ~3x more land than in the 1980s as the West gets hotter and drier.
- Format: still/graph (2048x1024 jpg, 3840x2160 mp4 also), bar chart with 0/5/10 M acre gridlines [V].
- MEASURED bar heights (M acres, +-0.1): 1983 1.3, 1984 1.1, 1988 5.0, 1996 6.1, 2000 7.4, 2004 8.1, 2006 9.9, 2010 3.4, 2015 10.1, 2017 10.0, 2020 10.1, 2023 2.7, 2024 8.9, 2025 5.1. Decade means: 1983-92 2.7; 1993-2002 4.2; 2003-12 7.3; 2013-22 7.2 (+170%).
- Trend: strong long-term, noisy year to year (2020 10.1 then 2023 2.7). Chart, not a map.
- Guessability: high (taller bar = louder), but any single year is a "which year" lookup so the player is matching magnitude only; fine for the format.
- Risks: noise makes a "trend" sonification ambiguous; use decade means or a year-pair. 2025 bar is probably partial/preliminary [I].

### D. Dixie Fire 2021, SVS 4993 (https://svs.gsfc.nasa.gov/4993/)
- EIC: YES, directly in the EIC gallery [V]. 12-hourly frames Jul 14-Oct 22 2021 (4K frames, tifs); inset bar graph of cumulative area (km2, 0-3700, x-axis 101 days) [V from still; final ~3,650 km2 read visually].
- Takeaway: single extreme fire; a vivid story but one event, not a climate trend per se.
- Trend: monotone growth curve within the event; easy to decode inset bars. Guessability high, takeaway weaker. Not measured numerically beyond the still. Good as a fallback / reveal story paired with C.

### E. Arctic Sea Ice Minimum 2024, SVS 5382 (https://svs.gsfc.nasa.gov/5382/); 5099 Daily Polar Sea Ice
- EIC: yes (Climate Vital Signs) [V]. Frames Mar 14 -> Sep 11 2024, yellow contour = 1981-2010 average minimum [V].
- Takeaway: Arctic summer minimum ice is well inside the 1981-2010 average line (decline ~12-13% per decade per the SVS main-dashboard text, via search summary [I]).
- MEASURED: crude bright-pixel count in a fixed crop: Mar 14 182k, mid 215k, Sep 11 92k (-49%) [V] but the camera is a moving globe view, snow-covered land is also white, so NOT a reliable area. A trend ACROSS years is not in the data (one year, seasonal cycle). Only the fraction of the yellow contour covered is a "vs average" signal; needs manual masking. Verdict: strong message, poor data decodability. Use as reveal imagery only.

### F. OCO-2 + Keeling Curve 5119 (https://svs.gsfc.nasa.gov/5119/), CH4 5118, N2O 5117
- EIC: yes (Greenhouse Gases / Climate Vital Signs) [V]. Chart 2014-2023 with ppm axis 300-450; values 399 -> 421 ppm (+5%) [V by eye]. Axis wastes the range (300-450), seasonal wiggle (~6 ppm) is as big as the half-decade trend; poor for novice discrimination. Same lesson as R2 (CO2 hard). Keep out.

### G. Not measured / rejected
- 5111 ocean heat (single static Spilhaus + graph), 5126 AGGI donut, 5087 drought spheres, 5115/16 volumetric (350-800 MB), 5190/5191 spiral/graph (same GISTEMP data as B, polar/line chart), 5209 zonal (chart of B).

## 2. Ranked table
| rank | dataset | EIC status | takeaway | trend in data? | measured option values | guessability | verdict |
|---|---|---|---|---|---|---|---|
| 1 | 5235 Sea level porthole | EIC Climate Vital Signs gallery [V] | sea level +11 cm since 1993, accelerating | yes, clean monotone | 0 (1993 ref), +3.0, +6.5, +9.1, +11.3 cm (also +1.9, +4.5) | very high | USE round 2 |
| 2 | 5207 GISTEMP map | EIC Climate Vital Signs [V] | planet warmed, Arctic/land most | yes, noisy decadal | Arctic band: -1.0, +0.2, +1.3, >=+2 C (labels to be re-checked vs GISTEMP) | high | USE round 3 |
| 3 | 5453 US burned area | EIC Wildland Fires gallery [V] | US fire area ~3x since 1980s | yes, noisy | 1.3 (ref), 1.8, 4.6, 7.4, 10.1 M acres | high | backup / alt round 3 |
| 4 | 4993 Dixie Fire | EIC main gallery [V] | one megafire growth, 0->3,650 km2 | event growth only | not measured | high | story fallback |
| 5 | 5382/5099 sea ice | EIC Climate Vital Signs [V] | Arctic minimum below 1981-2010 avg | seasonal, no multi-year | -49% Mar->Sep crude, unreliable | medium | reveal imagery only |
| 6 | 5119 Keeling | EIC Greenhouse [V] | CO2 up ~5% in 9 yrs | yes but small | 399 -> 421 ppm | low | drop |

## 3. Recommended round designs (using the fixed format)
### Round 2: Sea level (5235), "How high is the ocean?"
Reference sound: 1993 = 0 cm (flat low tone). Mystery: 2018 (+9.1 cm). Options (labelled): "+3.0 cm / +6.5 cm / +9.1 cm / +11.3 cm" (gaps 3.5/2.6/2.2 on an 8.3 range, i.e. 27-42% each). Reveal: the porthole animation rising from 1993 to 2018 with the ruler, then the takeaway "Oceans rose 11 cm by 2023 and the rise is speeding up: every cm is more coastal flooding." Pool variants: mystery 2003/2013/2023 with the other labelled values.
### Round 3: Warming (5207), "How much hotter is the Arctic now?"
Reference: 1951-80 average = 0 C (flat tone; white on the map). Mystery: Arctic 65-80N in 2016 (decoded +1.9, saturated). Options (labelled as deg C vs 1951-80): "-1.0 (1880s) / +0.2 (1986) / +1.3 (2001) / >= +2 (2016-2023)" (gaps >=1.0 on a 3 range = 33%). Reveal: the Robinson map animating 1880 -> 2023 with the Arctic turning dark red, plus "The Arctic warms about 3-4x faster than the planet" [I, widely reported ~4x; verify before shipping].
Fallback round: 5453 wildfire bars, ref 1983 = 1.3 M acres, mystery 2000 (7.4), options "1.8 / 4.6 / 7.4 / 10.1 M acres".

## 4. Caveats
- Decoded GISTEMP values are pixel-decoded (+-0.3 C, saturated at +-2); replace labels with GISTEMP table values or state "approx".
- Sea level year mapping (1 s = 1 yr, starts t=10 s) inferred from the 2008@25 s label and the 1993/2023 captions; check labels at each used frame.
- Numbers not independently validated against external data (NIFC, AVISO/NASA sea level) [U].
- Wildfire 2025 partial-year possible [I].
