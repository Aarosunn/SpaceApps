# 06: EIC data — what it is, what one frame means, when dates arrive, what we can build

Written Sat Nov 14 2026, ~2:45pm ET (19:45 UTC). Corrected ~3:40pm ET after five agents fact-checked it; `eic-data/fact-check.md` lists every problem they raised and what was changed.
Tags: **[V]** verified directly today (a folder listing, an HTTP header, or a date read off a frame),
**[A]** worked out by an AI agent from the files and frames, with its evidence in the page sheet. The sheets for all ten named pages and all 23 daily products were then attacked by a second agent ("re-checked"); the other 50 analysed pages had one agent only (`eic-data/README.md`),
**[I]** inferred, **[U]** unknown.
The evidence, one sheet per page, and copy-paste commands to re-check any number are in `eic-data/` (start at `eic-data/README.md`).

## The answer in one screen

1. **"EIC data" is pictures, not data.** [V] It is NASA's SVS gallery 40467: 84 pages holding 561 movie files, 187 folders of numbered frame images and 876 stills. Every pixel has already been through a colour scale and a map or globe view, and often a moving camera and burned-in text. We sonify pictures.
2. **"One frame = one day" is true for seven products and for none of the pages the challenge names.** [V] Each visualization has its own clock. One frame is 10 minutes (GOES), 30 minutes (rain), 1 hour (weather, air quality, CO2), about 4 hours (ocean currents), about 19.5 hours (fires), 1 day (sea surface temperature, sea ice, vegetation, seasonal rain), 1 year (night lights, hurricane plots), or nothing at all (GEDI is a camera flying over one static map; GEOS Aerosols is a single still).
3. **A frame's date comes from one of four places**: the file name (70 frame folders), a label burned into the picture, a date table NASA publishes beside the movie (ocean currents, and the flat lightning movie our spec uses), or arithmetic on the frame number. Section 3 gives the rule for each product.
4. **New dates arrive once a day, one to four days behind real time**, at a different hour for each product. Fires are five to six days behind. Rain is the exception: about 5 hours behind, topped up through the day. Section 4 has the timetable.
5. **Four of the 23 daily products are not really daily today.** [V] Arctic sea ice stops at 30 Oct 2026 and vegetation (NDVI) stops at 13 Jun 2026, although both files were rewritten today. The satellite-fleet movie and the landslide map were not rewritten today at all.
6. **A web page cannot read NASA's pixels directly.** [V] SVS blocks cross-origin reads. We must copy the few files we use into our own site and work from those. This is easy: in a test today a 363 MB NASA movie became a 21.7 MB web file in about two minutes (section 6).
7. **The challenge resource list has two broken pointers.** [A] "GEOS Aerosols" links to a single still (the animation is on SVS 5572), and "Global Sea Surface Currents" links to a still image inside a page whose animations are elsewhere on the same page.

## 1. What the EIC content is

The Earth Information Center is a NASA exhibit: a wall of screens (a "hyperwall") at NASA Headquarters. A second display is at the Smithsonian's National Museum of Natural History (SVS 14696 says it is "Optimized for Earth Information Center display at the National Museum of Natural History (Smithsonian)"). The SVS gallery says of itself: "This gallery consists of content used in the hyperwall display in the Earth Information Center at NASA Headquarters." [V]

The challenge's first resource is this whole gallery ("EIC Content Database ... Participants can use the videos and images as data"). So **any page in the gallery is on-brief**, not only the ten pages named after it. That includes SVS 5176 (sea surface temperature anomaly), which our summary lists as a data source: it sits in the gallery's Daily Visualizations section. [V]

| Gallery section | What is in it | Pages |
|---|---|---|
| EIC Dashboards | Six sub-galleries: Earth Now, Climate Vital Signs, Greenhouse Gases, Carbon Dioxide Sources and Sinks, Air Quality, Wildland Fires. Each is a wall layout made of several visualizations plus screenshots of live tools (Worldview, FIRMS). | 35 |
| EIC Videos | Narrated films made for the EIC (hurricanes, agriculture, fire, methane, biodiversity, coastal resilience) and the visualizations they feature. | 27 |
| EIC Beauty Pieces | Nine showpiece animations. Eight of them are in the challenge's named list. | 9 |
| Daily Visualizations | "Data visualizations that are updated daily" (NASA's words). 23 pages. | 23 |
| Media Resources | Press b-roll of the exhibit itself. | 1 |

Thirteen pages sit in two sections (mostly daily products that also appear on a dashboard), so the gallery holds 82 distinct pages. Adding the two named pages that are outside the gallery gives the 84 we analysed. Totals [V]: 94 pages crawled (10 galleries, 64 visualizations, 15 produced videos, 2 animations, 2 hyperwall visuals, 1 b-roll).

What the files are [V]:

- **Movies: 561 files, 339 GB.** Half are under 48 MB; 51 are over 1 GB. Codecs: 372 H.264 and 135 VP8 (both play in any browser), 36 ProRes and 6 HEVC (do not play reliably in browsers). 155 have an audio track; those are the narrated films.
- **Frame folders: 187 (200 counting sub-folders).** The 187 hold 491,570 files: 70% EXR, 16% PNG, 12% TIFF, 1.7% JPEG, plus a few TGA and MP4. The 13 sub-folders add about 21,000 PNGs. A browser can only show the PNG and JPEG ones.
- **Six pages have no movie at all**, including the named resource GEOS Aerosols (5669).
- **Two of the ten named pages are not in the gallery tree**: 13786 (NASA's deep-space sonification example) and 5669 (GEOS Aerosols).

Full tree: `eic-data/gallery-tree.md`. Every movie: `eic-data/movies.md`. Every frame folder: `eic-data/frame-sets.md`.

## 2. What one frame equals

"Frame" has two meanings here. A movie frame is 1/30 s of video. A frame-folder file is one numbered image. They normally match one to one, but the real-world time they stand for differs for every product.

File sizes below are the real byte counts from NASA's server. The size printed on an SVS page is often a few percent smaller.

### 2a. The ten pages the challenge names

| SVS | Name in the challenge | One frame equals | Period shown | Geography fixed under a pixel? | Smallest useful file |
|---|---|---|---|---|---|
| 13786 | Data Sonification: Caldwell 73 | No time. A line sweeps once around a still Hubble image: 0.4° per frame, 30 s per turn. [A, re-checked] | None (deep space, not Earth) | n/a | 5.9 MB WebM with NASA's soundtrack |
| 5313 | Change in Night Lights 2012–2023, EIC version | Not a time-lapse: **13 pictures** (12 annual maps, then one change map), shown twice in 43 s. During the sweep each year is on screen about 0.6 s; the 2012 map and the change map are held for 6 to 10 s; the second pass adds four zoom boxes. [A, re-checked] | 2012–2023, one picture per year | Yes. Flat map, and the world is drawn twice side by side in every frame. | 34.3 MB, but HEVC at 7680×2160. Sibling page 5276 has an H.264 4K movie and 12 per-year TIFFs with the year in the file name (7680×4320, 16-bit: convert before use). |
| 3912 | Global Sea Surface Currents and Temperature | **4.128 hours** of model time. [A, re-checked] | 25 Mar 2007 → 3 Mar 2008 (344 days), 2,001 frames | Yes. Flat map, no text. | 15.7 MB WebM, 1080×540 |
| 5669 | GEOS Aerosols | **There is one frame**: a still for 19 Aug 2025 20:00 UTC. [V] | One instant | Yes. Flat map. | 2.8 MB PNG. The animation is on SVS 5572 and 5552: about 30 minutes per frame [I], 1 Aug → 14 or 15 Sep 2024 (NASA's own fields disagree). [A] |
| 5533 | Air Quality Model Runs | **1 hour** in the flat-map version (1,800 frames; 24 frames per day, seen in the day–night cycle). The 32:9 EIC version has 4,502 frames, about 24 minutes each. [A, re-checked] | 1 Jul → 14 Sep 2024 (75 days) per NASA's dataset field; its captions say "July–August". **No date appears on any frame.** | The map is fixed in the flat-map version, **but the variable is not**: four pollutants (CO, PM2.5, NOx, ozone) are drawn as vertical strips that scroll left across the one map, and there is no colour bar or unit. A pixel cannot be read as one variable. The globe versions rotate. | 300 MB H.264 at 5760×3240 (large: re-encode) |
| 5425 | Perpetual Ocean 2: Western Boundary Currents | **1 h 21 min** per file in the 19,001-file frame folders and per frame of the 60 fps movies; 2 h 43 min per frame of the 30 fps movies. [A, re-checked] | 15 Jan 2021 → 25 Dec 2023 | **No.** The camera moves in all but 12 of its 317 seconds. | 947.7 MB H.264 (the temperature layer). A 33 s excerpt of a different layer is 120.9 MB. |
| 5196 | DYAMOND Global Carbon Dioxide | **1 hour** of model time. [A, re-checked] | 14 Jan 2020 22:00 → 3 Mar 2020 21:00, 1,176 frames. NASA's text says "January–March". | **No.** Every version is a globe with a moving camera. Only the orbit version shows the date on screen. | 7.2 MB HEVC 1080p, or 71.8 MB H.264 4K |
| 5011 | Lightning Events Detected from the ISS 2017–2023 | **Variable.** Globe movie: the first 69 s stay inside a single day (1 Mar 2017, about 21 seconds of real time per frame), then it races through six years at up to 0.8 days per frame. Flat movie (the one our spec uses): the speed eases from 0 up to 0.55 days per frame and back, 0.4 on average. Every frame shows a 10-day window of flashes, so a dot is not one strike. [A, re-checked] | 1 Mar 2017 → Aug 2023 | No on the globe version (it rotates). **Yes on the flat-map version.** It shows no date on screen, but NASA publishes the date of every one of its frames in `labels.txt` (section 3c). | 350 MB H.264 flat map; 133 MB globe |
| 4960 | A 3D View of an Atmospheric River | **Variable, and it runs backwards in places.** About 85 minutes per frame at first, slowing to 9 minutes per frame for the storm. The clock then freezes for over 20 s and jumps back at least six times to replay 6–14 Dec from new camera angles. Rates are per frame of the 59.94 fps movie. [A, re-checked] | 1 Oct → 14 Dec 2010 (the story is 6–14 Dec 2010). No formula works: read each frame's time from the separate date-only movie. | No (3D camera fly-through) | 72.9 MB WebM, silent version |
| 4950 | GEDI Forest Height | **No time.** One static map; a frame is 0.12° of globe rotation or a step of a camera fly-through. [A, re-checked] | One year of data shown at once. NASA's own captions disagree on which year (Apr 2019–Apr 2020 or Apr 2018–Apr 2019). | No (rotating globe and fly-throughs) | 6.3 MB WebM |

Detail for each, including exact formulas and files: `eic-data/official-resources.md`.

### 2b. The 23 "Daily Visualizations"

"Updated daily" means NASA re-renders the file every day. It does not mean one frame per day. All rows [V] unless marked.

| SVS | Product | One frame equals | What the current file covers | Newest data in it |
|---|---|---|---|---|
| 5176 | Sea surface temperature anomaly | **1 day** | 901 days, rolling | 11 Nov 2026 |
| 5101 | Sea surface temperature | **1 day** | 901 days, rolling | 13 Nov 2026 |
| 5099 | Polar sea ice, two-year history (Arctic and Antarctic side by side) | **1 day** | 730 files for 734 days: four days are missing (22 Sep, 14 Oct, 6 and 7 Nov 2026) | 12 Nov 2026 |
| 5064 | Antarctic sea ice, by year | **1 day** | Rolling two years (the same four days missing), plus complete calendar years 2021–2024 | 12 Nov 2026 |
| 5046 | Arctic sea ice, by year | **1 day** | Rolling two years (27 Jul 2026 missing), plus complete calendar years 2021–2024 | **30 Oct 2026 (stale)** |
| 4897 | Seasonal precipitation variation (IMERG) | **1 day** | 1 Jul 2024 → 12 Nov 2026, 863 frames (26 and 27 Nov 2024 are missing) | 12 Nov 2026 |
| 5544 | Near-real-time vegetation index (NDVI) | **1 day** | 900 days | **13 Jun 2026 (stale)** |
| 5584 | Global landslide exposure map | One still, refreshed irregularly | One current still, last written Thu 12 Nov 05:00 UTC and not rewritten on 13 or 14 Nov. Plus an archive of 229 PNGs spread over 299 days (70 days missing). | Not read from the picture. The archive runs to 2 Sep 2026, plus one stray file dated 16 Sep. |
| 4285 | Near-real-time precipitation (IMERG) | **30 minutes** | About 7.6 days, rolling | 14 Nov 2026 13:30 UTC (at 17:21 UTC) |
| 5120 | GOES-East and GOES-West true colour | **10 minutes** | 5.5 days, 795 JPEGs per satellite. The two satellites are offset by 20 minutes, so their files cannot be paired by the minute in the name. | 14 Nov 2026 03:20 UTC (East), 03:40 (West) |
| 5147–5150 | GEOS-FP weather: temperature, wind, precipitation and clouds, humidity | **1 hour** (labels read on 5147) | 372 frames = 15.5 days. The last 13 hours fall after the render time, so they are presumably forecast [I]. | 14 Nov 2026 15:00 EST |
| 5151–5154 | GEOS-CF air quality: PM2.5, ozone, CO, NOx | **1 hour** (labels read on 5151) [A, re-checked] | 372 frames = 15.5 days. The last 13 hours fall after the render time [I]. | 14 Nov 2026 15:00 EST |
| 5113 | Active fires seen by VIIRS | **About 19.5 hours.** Two years are squeezed into exactly 900 frames. | 13 Nov 2024 → 13 Nov 2026 by the labels | **8 Nov 2026.** The frame labelled 8 Nov shows fires; the frames labelled 11, 12 and 13 Nov show none (9 and 10 Nov were not looked at). |
| 5072 | Atlantic hurricane wind-speed plots | **1 year.** It is a chart, not a map. | 1950 → 2026, 77 frames | 2026 season |
| 5315 | Experimental fire weather forecast | Stills only | Today's forecast map | 14 Nov 2026 |
| 5067 | Earth Observing Fleet – Now | 6 seconds of simulated time. Satellites moving along their orbits; not Earth-change data. [A, re-checked] | A 3-hour window | None. The label reads `Nov 13 2026 19:48` with no time zone, and it is a simulated orbit time: the file was written 18 hours earlier (Fri 13 Nov 01:52 UTC) and has not been rewritten since. |
| 5577 | SDO Sun This Week | 108 seconds. It is the Sun, not Earth. [A, re-checked] | One week | 13 Nov 2026 23:58 UTC |

So the "one image per day" picture is right for the first seven rows and wrong for the rest.

### 2c. Everything else

The dashboard pages are mostly charts and long climate records (monthly or yearly steps: temperature since 1880, the Keeling curve, sea level). The EIC Videos are narrated films with music and people in them. One row per page: `eic-data/catalog.md`.

## 3. Where the date of a frame comes from

**a) The file name.** [V] 70 frame folders carry a date in their file names (59 top-level folders and 11 archive sub-folders), so no image reading is needed. Patterns:

| Product | File name | Reads as |
|---|---|---|
| SST anomaly 5176 | `sst_mur_anomaly_20261111.exr` | 11 Nov 2026 |
| SST 5101 | `sst_mur_20261113.exr` | 13 Nov 2026 |
| Polar sea ice 5099 | `polar_sea_ice_sxs_w_date.2026316.exr` | year 2026, day 316 = 12 Nov |
| Antarctic sea ice 5064 | `antarctic_sea_ice_w_dates.2026316.exr` | year 2026, day 316 = 12 Nov |
| Arctic sea ice 5046 | `arctic_sea_ice_w_dates.2026303.exr` | year 2026, day 303 = 30 Oct (stale) |
| Rain 4285 | `imergert_1080p.2026-11-14T13:30:00Z.png` | 14 Nov 2026 13:30 UTC |
| Seasonal rain 4897 | `imergvar_composite.2026.11.12.png` | 12 Nov 2026 |
| GOES 5120 | `GOES19_20263180320_2160x2160.jpg` | year 2026, day 318, 03:20 UTC |
| NDVI 5544 | `SNPP_VIIRS.20260613.ndvi_w_snow.oceanblue.png` | 13 Jun 2026 |

The full decoded list with first date, newest date and gaps: `eic-data/dated-frame-sets.md`.

**b) A label burned into the picture.** [V] Examples read off frames today: `11 Nov 2026` bottom-left on SST anomaly; `12 Nov 2026` top-centre on polar sea ice; `2026/11/14 13:30:00` on rain; `14 Nov 2026 15:00:00 EST` on the GEOS movies; `13 Nov 2026` plus a colour bar on fires; a four-digit year on night lights. Many products also ship a **no-dates variant**, which is the one to feed to pixel analysis.

**c) Arithmetic on the frame number.** Use this when the movie is all we have. With k the frame number counting from 0, and a 30 fps movie showing frame k at k/30 seconds:

- Fixed, one-off animations: the formula never changes.
  - Ocean currents 3912: time = 25 Mar 2007 12:00 UTC + k × 4.128 h. NASA also publishes the whole table: `https://svs.gsfc.nasa.gov/vis/a000000/a003900/a003912/flat_ecco2_dates.txt` [A]
  - DYAMOND CO2 5196: time = 14 Jan 2020 22:00 + k hours. [A]
  - Lightning 5011, flat movie: no formula, because the speed is eased. NASA publishes one date per frame instead: `https://svs.gsfc.nasa.gov/vis/a000000/a005000/a005011/labels.txt` (6,001 lines for about 6,002 frames, so line k is frame k to within one frame). From line 4927 on the year is misprinted `2003`; it means 2023. [V for the file; A, re-checked, for the line-to-frame match, which the yearly north–south swing of the dots confirms in all seven years]
- **Rolling daily products: the start date moves forward every day.** [V] Never hard-code it. Take the newest date from the newest file name, then count backwards: date of frame k = newest date − (last frame number − k) × step. Checked on SST anomaly: frame 861 of today's movie reads 3 Oct 2026, which is 11 Nov minus 39 days.
  - **This only works where no day is missing**, which today means the two sea-temperature products (5101, 5176). Sea ice has gaps (5099 and 5064 four days, 5046 one day) and seasonal rain has two, and the movies do not pad them, so counting back drifts by up to four days for early frames. For those, take each date from the file list in `eic-data/dated-frame-sets.md`.
  - **Two movies have extra frames.** The rain movie has about 392 frames for 364 files (the last data frame is held for about a second), and the NDVI no-dates movie has about 930 for 900 (why is not known). Trim before counting.

**d) Separate date layers.** Some products publish the date as its own image sequence, to be laid over the clean frames: the `flatdates` folder for rain (4285, 4897), `dates/<year>/` for sea ice (5046, 5064; calendar years 2021–2023 only), a dates-only movie for Perpetual Ocean (5425).

**Time zones.** File-name timestamps are UTC. The labels on the GEOS weather and air-quality movies are US Eastern, and the window crosses the 1 November clock change: the first frame reads `EDT`, the last reads `EST`. [V]

## 4. When new frames arrive

Times are when NASA's file was last rewritten, from its HTTP `Last-Modified` header on Sat 14 Nov. Central time = UTC − 6.

| Product | Rewritten (UTC) | Central | Newest data in it | Behind real time |
|---|---|---|---|---|
| Rain 4285 | Movie re-stamped every 30 minutes (seen at 17:21, 18:50, 19:20, 19:50 and 20:20) | :20 and :50 past each hour | 14 Nov 13:30 UTC (at 17:21) | About 5 hours. New frames reach the folder about once an hour, two at a time. [A] |
| GOES 5120 frames | 04:14 | 22:14 Fri | 14 Nov 03:20 UTC (East), 03:40 (West) | About 1 hour at refresh. The folder was unchanged 16 hours later, so it appears to refresh once a day. [I] |
| GEOS weather and air quality 5147–5154 | 07:00 | 01:00 | Runs to 14 Nov 20:00 UTC | Ahead: the last 13 hours are after the render time [I] |
| Fire weather forecast 5315 | 07:10 | 01:10 | 14 Nov | Same day |
| Seasonal rain 4897 | 06:05 | 00:05 | 12 Nov | 2 days |
| SDO Sun 5577 | 06:29 | 00:29 | 13 Nov 23:58 UTC | 6.5 hours |
| Antarctic sea ice 5064 | 08:49 | 02:49 | 12 Nov | 2 days |
| Polar sea ice 5099 | 10:51 | 04:51 | 12 Nov | 2 days |
| Fires 5113 | 10:26 and 11:29 | 04:26, 05:29 | Labelled to 13 Nov; last fires shown 8 Nov | **5–6 days** |
| Hurricane plots 5072 | 11:01 | 05:01 | 2026 season | Not applicable (a yearly chart) |
| SST 5101 | 13:17 to 13:53 | 07:17 to 07:53 | 13 Nov | 1 day |
| **SST anomaly 5176** | **21:16 to 21:59 (Fri 13 Nov)** | 15:16 to 15:59 | 11 Nov | 2 days at render; nearly 4 by the next one |
| Arctic sea ice 5046 | 06:20 | 00:20 | 30 Oct | **Stale: 15 days** |
| NDVI 5544 | 10:31 to 11:01 | 04:31 to 05:01 | 13 Jun | **Stale: 5 months** |
| Earth Observing Fleet 5067 | Fri 13 Nov 01:52; not rewritten on 14 Nov | 19:52 Thu | Simulated orbit time | Not refreshed daily |
| Landslide map 5584 | Thu 12 Nov 05:00; not rewritten on 13 or 14 Nov | 23:00 Wed | Not read | Not refreshed daily |

**What we get if we look again Sunday morning** [I, assuming the same schedule]: SST will reach 14 Nov; SST anomaly will reach 12 Nov (13 Nov only arrives around 3:15pm Central on Sunday); sea ice will reach 13 Nov; rain will be current to within a few hours. One more day of data changes nothing we would build. **Freeze a copy today and build on that.** The schedule is not guaranteed: at 21:23 UTC on Sat 14 Nov, seven minutes past the time of Friday's render, the SST anomaly movie had not been re-rendered and its newest frame was still 11 Nov. [V]

Three ways a "daily" product misleads [V]:

1. **The page's "updated" date is not the file's date.** SVS 5176's page record says 24 Oct; its files were rewritten 13 Nov.
2. **A file rewritten today can hold old data.** Arctic sea ice (5046) was re-encoded today at 06:20 UTC and its last frame reads 30 Oct 2026. NDVI (5544) was re-encoded today and ends 13 Jun 2026.
3. **Sibling files go stale separately.** On polar sea ice (5099) the `.mp4` is today's and the `.webm` is from May 2023 and shows February 2023. On the GEOS pages the movie is today's and the PNG frame folder is from November 2025. On GOES (5120) the frame folder is current and both movie links return 404.

## 5. Constraints that decide what is buildable

[V] unless marked.

- **Cross-origin block.** Every SVS response carries `Access-Control-Allow-Origin: https://tempo.multiverse.music`, a fixed value that ignores who is asking. A page on our own site can *play* an SVS video (only if the `<video>` or `<img>` tag has no `crossorigin` attribute), but cannot read its pixels through a canvas and cannot `fetch()` the SVS API, a frame listing or a date table. Anything we analyse must be served from our own site.
- **Frame folders are mostly EXR.** EXR is a film-industry format at 20–35 MB per frame (SST anomaly: 901 files, about 19 GB). It needs conversion and is not worth downloading. The movies carry the same pictures.
- **One named resource has an unlistable frame folder.** Night Lights (5313) returns HTTP 403 for the folder. Single files do download if the exact name is known, and only odd frame numbers (00001 to 02599) exist. [A, from 17 hits and 5 misses]
- **Sizes.** The daily 4096×2048 movies are about 360 MB each. Hot-linking them into a demo is slow and fragile.
- **Codecs.** The Night Lights movie on the named page (5313) is HEVC at 7680×2160, and the smallest DYAMOND file is HEVC. Neither is safe in a browser; re-encode to H.264. Sibling page 5276 has an H.264 4K version of the night-lights movie. [A]
- **NASA's movies seek badly.** The GEOS daily MP4s have only two keyframes (frames 0 and 250) and their index at the end of the file, so jumping to a moment in a browser is slow. [A, re-checked] Re-encoding with a keyframe every second, as in section 6, fixes it.
- **Burned-in text and logos.** The GEOS daily movies carry a NASA insignia and "GMAO" in the top-left corner and a time stamp bottom-left. Fires carry a date and a colour bar. Mask these regions or use the clean variant before turning pixels into sound, or the label becomes part of the music.
- **Camera motion.** On DYAMOND, Perpetual Ocean, GEDI and the atmospheric river, most pixel change is the camera, not the planet. A pixel has no fixed place. Flat-map products do not have this problem.
- **Usage limits.** Eight EIC video pages (14367, 14369, 14507, 14568, 14606, 14696, 14700, 14713) allow sharing the whole video but forbid extracting or remixing their third-party footage. Do not pull frames from those, and do not reuse any SVS music. [A, re-checked] See `eic-data/licensing-and-rules.md`.
- **The official Space Apps site refuses scripted requests** (no TLS connection for `curl`). Read it in a browser.

## 6. What we can realistically do with it

### The pipeline that works

Do the heavy work once, offline, and ship small files:

1. Pick three to five visualizations.
2. For each, re-encode NASA's movie to a small H.264 file and, if wanted, dump its frames as JPEG. `ffmpeg` reads straight from the NASA URL.
3. In Python, compute a small table per visualization: one row per frame, holding the date and the numbers that will drive the sound (for example the mean colour in each of a dozen regions).
4. Host the small movie and the table on our own site. The browser plays the movie, looks up the row for the frame on screen, and synthesizes the sound live. Because the files are ours, the browser may also read pixels directly for an "explore by pointing" mode.

This answers the challenge's "generated in real time" wording (the sound is synthesized in the browser as the frame plays) while avoiding every constraint in section 5.

```bash
# 363 MB NASA movie -> small web file (clean variant: no date label)
ffmpeg -i "https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005176/sst_anomaly_nodates_30_sec_4096x2048_2x1_30p.mp4" \
       -vf scale=1024:512 -c:v libx264 -crf 24 -g 30 -pix_fmt yuv420p -an sst_anom_1024.mp4

# one JPEG per frame; file 0001.jpg is frame 0
ffmpeg -i sst_anom_1024.mp4 -vf scale=512:256 -q:v 5 frames/%04d.jpg
```

Measured on this laptop today with exactly these two commands [V for the outputs; the timings were read off the terminal and no log was kept]:

- First command: **128 seconds**, reading the 363 MB source straight from NASA. Result: a **21.7 MB** H.264 file, 1024×512, 30.03 s, 901 frames. (Sea-temperature texture is noisy, so it compresses less than most. `-crf 28` or 768×384 should roughly halve it; not tried.)
- Second command: **7 seconds**. Result: 901 JPEGs, 27.4 MB in total (about 30 KB each).

Both outputs are far below GitHub's 100 MB per-file limit. Only this one movie was timed. Time grows with the size of the source, and other candidates are larger (flat lightning 350 MB at 60 fps, Perpetual Ocean 948 MB), so budget several minutes each. [I]

### Proof that the pixels carry real numbers

We ran the whole chain once, today, on SST anomaly (5176): frames → dates → a map region → degrees Celsius (using NASA's published colour bar, −4 to +4 °C) → a daily series. [V]

- For the El Niño region of the Pacific (Niño 3.4), the monthly means read off the frames sit between −0.7 and +0.5 °C through 2025, then climb every month of 2026 to **+3.3 °C in October**.
- Compared with NOAA's official weekly Niño 3.4 index over 128 weeks: **correlation 0.984**, average difference 0.24 °C. The decoded values run about 0.2 °C warm.

So a sound driven by these frames is driven by something real, and we can say how we know. A fact-checking agent re-ran the script and got the same numbers. The result covers one product (SVS 5176) and one region; it does not validate the colour decoding of any other page, including the spec's ocean layer (SVS 3912), which uses a different colour scale. NOAA's index is not NASA data, so it belongs in the References field if we quote it. Method, limits and the data: `eic-data/data-test-sst-anomaly.md`.

### Which visualizations are worth using (data side only)

Ranked by how honestly a pixel can be turned into a dated, located value. The team's spec (Earthsound v2) uses SVS 5313, 3912, 5011 and 5196; how it holds up against this evidence is in `07-earthsound-spec-check.md`.

| Rank | SVS | Why | Watch out for |
|---|---|---|---|
| 1 | **5176** SST anomaly | Flat map, fixed geography, exactly 1 frame = 1 day, date in the file name, a no-dates variant, 2.5 years. The 2026 El Niño is plainly visible as a dark red tongue in the Pacific, so there is a real event to hear. | In the gallery but not one of the ten named pages. Say so in the write-up. It is a rolling 901-day window that runs about three days behind: freeze a copy. |
| 2 | **3912** Ocean currents and temperature | Named in the challenge. Flat map, no text, NASA publishes the date of every frame, hue maps to 0–32 °C, 15.7 MB. | A model year (2007–08), not current. One frame is 4.1 hours: step 6 frames for a day. The colour-to-°C decoding has not been tested against any outside source. |
| 3 | **5011** Lightning, flat movie | Named in the challenge. Flat map, fixed geography, no text, one saturated colour on dark, NASA's date for every frame (`labels.txt`), six years, and a clear yearly swing of the dots from one hemisphere to the other. | Each frame is a 10-day window, so neighbours share most of their dots. The speed is eased. Coverage is only 55°N to 54°S. The first 6 s and last 1.5 s are nearly empty. 350 MB at 4096×2048 and 60 fps: transcode. |
| 4 | **4285** Rain (IMERG) | PNG frames named by timestamp, a transparent rain-only layer (`flatalpha`), half-hourly, nearly live. Storms give natural rhythmic events. | Only the last week exists; nothing to compare it with. |
| 5 | **5099** Polar sea ice | 1 frame = 1 day, both poles in one frame, a slow seasonal "breathing" that is easy to hear. Complete calendar years 2021–2024 on 5046/5064. | Two globes, not a flat map. Four missing days. Use the `.mp4`, never the `.webm`. |
| 6 | **5196** DYAMOND CO2 | Named in the challenge. Exactly 1 frame = 1 hour, a visible day–night pulse every 24 frames. | Moving camera; colour is not exact ppm. |
| 7 | **5313** Night lights | Named in the challenge. High contrast, clear meaning. | Only 13 pictures. The whole map brightens by only about 3% from 2012 to 2023, although single cities change by 50–270%. A spatial piece, not a time piece. Page 5276 has per-year stills, but they are 16-bit TIFFs in a different geometry and have no evidence sheet here: fetch `svs.gsfc.nasa.gov/api/5276` and check before building on them. |
| 8 | **5147–5154** GEOS weather and air quality | Hourly, global, flat, eight variables that could be eight voices. | NASA logo and Eastern-time label burned in; the last 13 hours are probably forecast. |

Not worth the time: the EIC Videos (narrated films, some with reuse limits), GEDI and Perpetual Ocean (camera motion), Air Quality Model Runs 5533 (scrolling pollutant strips, no colour bar), anything that needs the EXR folders, and the stale products (Arctic sea ice by year, NDVI, and fires for its last five days) if "latest" matters.

## 7. What we assumed, and what is true

| We assumed | What the evidence says |
|---|---|
| EIC data is one image per day. *(Never written down, but implied by naming daily products as the data.)* | True for 7 daily products. False for all ten named pages. The challenge text never mentions any cadence. [V] |
| There is a ready-made set of "EIC frames" to fetch. | A frame is whatever we extract from a movie, or a file in a frame folder. Most frame folders are EXR. [V] |
| "There may be no stable EIC image endpoint." (00-SUMMARY) | SVS has a stable public API (`https://svs.gsfc.nasa.gov/api/<id>`) and static file URLs, with no login. [V] |
| The data is easy; the work is computer vision and audio. | Mostly true once we work from movies. Not true for a web page reading NASA directly. [V] |
| The Jukebox data is SVS 5176, GIBS and NASA POWER. (00-SUMMARY) | The official list is 11 SVS links. GIBS and POWER are not on it. 5176 is on-brief through the gallery. [V] |
| GEOS Aerosols gives layers over time, one instrument per aerosol type. (02) | The linked page is one still with four colour-coded types and no layers. The animation is SVS 5572. [A] |
| The Jukebox is the most crowded challenge. (00-SUMMARY) | It has the **fewest registered teams** of all 14 worldwide: 654 of 20,879. At Chicago it has 4 of 87, tied for fewest with four other challenges. These are registrations, not submissions. See `sources/live-official-site-2026-11-14.md`. [V] A search of public repositories still returns more than 40 new "earth jukebox" repos, nearly all created 13 or 14 Nov (`eic-data/competitors.md`). [A, re-checked] |
| The sonification must be live. | The official summary says "generated in real time". The Objectives also allow a curated set of generated audio files. Browser synthesis from frame features satisfies both. [V] |

## 8. Where the details are

| Need | File |
|---|---|
| Pick a visualization: one row per page | `eic-data/catalog.md` |
| Dates and cadence of every dated frame folder | `eic-data/dated-frame-sets.md` |
| The ten named pages in depth | `eic-data/official-resources.md` |
| Everything about one page (analysis plus raw NASA record) | `eic-data/pages/<id>.md` |
| Cross-origin, formats, pipeline | Sections 5 and 6 of this file |
| The pixel-to-value data test and its data | `eic-data/data-test-sst-anomaly.md`, `eic-data/data/` |
| NASA's dates for the 40 lightning frames the spec uses | `eic-data/data/lightning-40-frames-dated.csv` |
| Usage, credit, Space Apps rules | `eic-data/licensing-and-rules.md`, `eic-data/doc-review/rules.md` |
| What other Jukebox teams are building | `eic-data/competitors.md` |
| What the fact-check found in this file and in `07`, and what was changed | `eic-data/fact-check.md` |
| Re-check or rebuild anything | `eic-data/README.md` |
| The official site as read today (summary, tags, team counts) | `sources/live-official-site-2026-11-14.md` |
| The Earthsound v2 spec checked against this evidence; issues, missing information, ideas | `07-earthsound-spec-check.md` |
