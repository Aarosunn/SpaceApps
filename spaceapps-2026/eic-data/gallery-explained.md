# What the EIC gallery is and how it is organised

> Snapshot: 2026-11-14, 17:15-20:50 UTC. Analysis fields were written by an AI agent from the raw NASA records and preview frames; where marked *re-checked*, a second agent independently tried to refute them. Raw facts (file names, counts, sizes, timestamps) come from scripts, not AI. Re-verify anything you build on: see `README.md`.

## What the Earth Information Center actually is

VERIFIED (bundles/40467.md lines 12-15): the Earth Information Center (EIC) is a visitor experience showing how the planet is changing in nine areas (sea level, air quality, biodiversity, wildfires, greenhouse gases, energy, disasters, water resources, agriculture). SVS gallery 40467 says verbatim: "This gallery consists of content used in the hyperwall display in the Earth Information Center at NASA Headquarters." So the physical EIC is a hyperwall exhibit at NASA HQ, and SVS 40467 is the content library feeding it (hyperwall-format renders, daily dashboard feeds, produced videos, B-roll, and screenshots of live tools). It is not the exhibit and not a "jukebox". Smithsonian: the only evidence in these sheets is two videos, 14696 "NASA + Smithsonian and Greenhouse Gases" and 14700 "NASA + The Smithsonian: Biodiversity"; the installation itself is not described, so it is INFERENCE only. A public EIC website is not described in these sheets (unverified).

## Structure

Root 40467 has 6 sections: Overview; EIC Dashboards (6 sub-galleries 40509, 40473, 40477, 40479, 40529, 40531); EIC Videos (sub-galleries 40487, 40484 plus 6 video pages 14700, 14606, 14696, 14568, 14507, 14713); EIC Beauty Pieces (9 cards: media_group 479017 for 3912 plus details pages 4950, 4993, 4960, 5011, 5313, 5196, 5425, 5533); Media Resources (14371 B-roll); Daily Visualizations (40512, 23 pages). INDEX.md lists 94 pages, 10 of them galleries. Card types: gallery_page, details_page, media_group (a visual on another page, no page link), link (screenshot of an external live tool, no SVS page). Of the 10 official Jukebox resources, 8 are inside the tree (3912, 4950, 4960, 5011, 5196, 5313, 5425, 5533, all Beauty Pieces) and 2 are outside (13786, 5669).

## Galleries

### 40467 — Earth Information Center (EIC)

Root gallery: content used in the hyperwall display at NASA HQ.

- Sections: Overview; EIC Dashboards (6 gallery pages); EIC Videos (2 galleries + 6 video pages); EIC Beauty Pieces (media_group 479017->3912; 4950, 4993, 4960, 5011, 5313, 5196, 5425, 5533); Media Resources (14371); Daily Visualizations (40512)
- SVS pages: 40509, 40473, 40477, 40479, 40529, 40531, 40487, 40484, 14700, 14606, 14696, 14568, 14507, 14713, 3912, 4950, 4993, 4960, 5011, 5313, 5196, 5425, 5533, 14371, 40512
- Notes: 3912 is reached only via media_group 479017 with thumbnail .../a003912/flat_global_ecco2_2028x1024.25000_searchweb.png; id 479017 appears in svs_api/3912.json line 106 and svs_api/40467.json line 403. 4993 and 14371 are in the tree but not official Jukebox resources.

### 40509 — Earth Now Dashboard

Latest-imagery dashboard: two cycles of Worldview screenshots, GEOS-FP and GEOS-CF model pages, GOES movie.

- Sections: Overview; Worldview First Cycle (4 links 860409-860412); Worldview Second Cycle (5 links 860413-860417); Models: Weather 5147-5150; Models: Air Quality 5151-5154; Visualizations 5120
- SVS pages: 5147, 5148, 5149, 5150, 5151, 5152, 5153, 5154, 5120
- Items that are NOT SVS visualizations: 860409 True color Terra; 860410 Black Marble Suomi NPP; 860411 Geostationary NOAA/JAXA; 860412 Active fires Suomi NPP; 860413 Rain and Snow; 860414 SST; 860415 Land Surface Temperature; 860416 Arctic sea ice animation; 860417 Antarctic sea ice animation
- Notes: 9 link cards, all WorldView_*.png screenshots of a live Worldview feed: no SVS page, no data, no movie. Page 5120 and the GEOS pages have page records updated 2026-11-13/14.

### 40473 — Climate Vital Signs Dashboard

Long-term climate indicators; SVS pages only.

- Sections: Overview; Visualizations (9 details pages)
- SVS pages: 5099, 5111, 5119, 5190, 5207, 5191, 5209, 5382, 5235
- Notes: 5099 also in Daily; 5119 also in Greenhouse Gases. 5190 record updated 2026-11-13 though it is a 1880-present graphic, so update date does not prove a daily product.

### 40477 — Greenhouse Gases Dashboard

CO2, CH4, N2O tracking and flow models.

- Sections: Overview; Visualizations (10 cards: media_group 367972->5054, media_group 368019->5041, 8 details pages)
- SVS pages: 5054, 5041, 5047, 5115, 5116, 5118, 5117, 5119, 5121, 5126
- Notes: 5054 and 5041 are media_group cards, not page links; mapped via thumbnail path and INDEX.md. 5115 and 5116 hold many 5760x3240 / 9600x3240 hyperwall files.

### 40479 — Carbon Dioxide Sources and Sinks

CO2 emission, transport, absorption; smallest dashboard.

- Sections: Overview; Visualizations (3 cards)
- SVS pages: 5110, 5081, 5121
- Notes: 5121 also in 40477. 5196 (DYAMOND CO2) is NOT here; it is in Beauty Pieces.

### 40529 — Air Quality Dashboard

Air pollution: Worldview screenshots, GEOS-CF pages, TEMPO section, side circles. Released 2024-12-04.

- Sections: Overview; Worldview Satellite Observations (4 links 1139914-1139917); Models: Air Quality 5151-5154; TEMPO section: 5175, 4810, 5107 plus link id 1 'Air Quality Index for DC'; Side Circles (2 links 1139918, 1139919 Eyes on Earth)
- SVS pages: 5151, 5152, 5153, 5154, 5175, 4810, 5107
- Items that are NOT SVS visualizations: 1139914 Active fires Suomi NPP; 1139915 CO by Aqua; 1139916 NO2 by Aura; 1139917 AOD by Suomi NPP; id 1 Air Quality Index for DC (placeholder no_preview image; live tool, AirNow attribution is inference); 1139918 Eyes on Earth: Aqua (side circle); 1139919 Eyes on Earth: Aura (side circle)
- Notes: 7 link entries. Worldview section text is copy-pasted from Earth Now.

### 40531 — Wildland Fires Dashboard

Wildfire monitoring: global view, US/Canada view, side circle.

- Sections: Overview; Global View: links 1139893, 1139894, 1139895 + 5315; US and Canada: links 1139893, 1139896, 1139897 + 5453; Side Circles: 5113
- SVS pages: 5315, 5453, 5113
- Items that are NOT SVS visualizations: 1139893 Worldview Active Fires VIIRS (appears in both sections); 1139894 FIRMS Global Active Fires; 1139895 NOAA Experimental Smoke Forecast; 1139896 FIRMS US/Canada Active Fires; 1139897 FIRMS Red Flags and Fire Weather
- Notes: 6 link entries, 5 unique ids. 5113 is the only SVS page in a Side Circles section; bundles/5113.md lines 59-60 list a fires-dashboard.hwshow hyperwall show file.

### 40487 — NASA and Hurricanes

EIC video gallery plus featured visualizations.

- Sections: Overview; Video: 14369; Featured Visualizations: 4983, 12772, 4685, 5067, 5097, 5058
- SVS pages: 14369, 4983, 12772, 4685, 5067, 5097, 5058
- Notes: Hurricane-themed in title only: includes 4983 (CO2 for Hyperwalls, 9600x3240) and 5067 (also daily).

### 40484 — NASA and Agriculture Video

EIC video gallery on farm water use (OpenET) with water/land visualizations.

- Sections: Overview; Video: 14367; Featured Visualizations (tile, 12 pages); Featured Videos: 13543
- SVS pages: 14367, 10480, 13417, 12647, 20322, 30521, 5098, 4968, 5087, 10721, 31196, 4170, 4889, 13543
- Notes: Oldest content (10480 from 2009, 10721 from 2012). No official Jukebox resources.

### 40512 — Daily Visualizations

Claims: 'This gallery brings together the data visualizations that are updated daily for NASA's Earth Information Center (EIC).' Single tile section of 23 details pages, no link cards.

- Sections: Overview; Visualizations (tile gallery, 23 pages)
- SVS pages: 4285, 5067, 5113, 5101, 5120, 4897, 5046, 5064, 5099, 5072, 5153, 5154, 5152, 5151, 5150, 5149, 5148, 5147, 5176, 5315, 5584, 5544, 5577
- Notes: Daily-only (10): 4285, 4897, 5101, 5046, 5064, 5072, 5176, 5584, 5544, 5577. In another gallery too (13): 5067, 5113, 5120, 5099, 5147-5154, 5315. 'Updated daily' is the gallery's claim; page-record dates range from 2026-01-09 (5064) and 2026-04-23 (5046) to 2026-11-14, and a record date is not the newest frame date. 5577 is typed Animation.

## Findings

- MULTI-GALLERY PAGES (INDEX.md): 5067 (40487+40512); 5099 (40473+40512); 5113 (40531 Side Circles+40512); 5120 (40509+40512); 5147-5150 (40509+40512); 5151-5154 (40509+40529+40512, three galleries); 5315 (40531+40512); 5119 (40473+40477); 5121 (40477+40479). Link card 1139893 repeats inside 40531 but is not an SVS page.
- OFFICIAL JUKEBOX RESOURCES: inside the tree (all in EIC Beauty Pieces of 40467) = 3912, 4950, 4960, 5011, 5196, 5313, 5425, 5533. Outside = 13786 (Data Sonification: Caldwell 73, Produced Video 2020) and 5669 (GEOS Aerosols (2025), released 2026-08-10); INDEX.md shows an empty gallery path for both. None of the 10 is in a dashboard or the Daily gallery. 4993 is in Beauty Pieces but not official.
- 3912 LINK: the gallery card is [media_group] 479017, not a /3912/ link; its thumbnail is .../a003912/flat_global_ecco2_2028x1024.25000_searchweb.png, and 479017 appears in svs_api/3912.json line 106 and svs_api/40467.json line 403. Page 3912 movies: ecco2_sst_flow.mp4 66.70 s x 30 fps = 2001 frames; flat_global_ecco2_2028x1024_comp_p30.mp4 68.70 s = 2061 frames. Date coverage of the movie is not shown in these sheets (unknown).
- HYPERWALL FORMATS: 5313 EIC version is 7680x2160 (32:9; 43.33 s, 30 fps, ~1300 frames, hevc; 43.33x30 = 1300; page's 131072 item count is unreliable). 5011 has a 7680x2160 variant 'created for EIC display'. 4960 has 7680x2160 and 9600x3240. 4983 is 9600x3240. 5196 has 5760x3240 '3x3 hyperwall' and 9600x3240 'hyperwall5x3' (super-wide, 1176 frames) folders. 5533 offers 16:9 (5760x3240) and 32:9 (7680x2160). A 7680x2160 frame is a wall layout, so check a frame before mapping cursor x to longitude.
- DASHBOARDS ARE SHOW LAYOUTS: 40509, 40529 and 40531 mix SVS pages with 22 link-card entries (21 unique ids): 9 in 40509, 7 in 40529, 6 in 40531. These are PNG screenshots of live tools (Worldview, FIRMS, NOAA smoke forecast, Eyes on Earth, a DC air quality index) with no SVS page, data or timestamps; do not count them as EIC frames. 'Side Circles' sections exist only in 40529 (2 Eyes on Earth links) and 40531 (page 5113); round shape is inference from the name.
- DAILY CAVEATS: 23 pages verified by counting. 'Updated daily' is not supported by page-record dates for 5064 (2026-01-09), 5046 (2026-04-23), 5577 (2026-08-28), 5072 (2026-10-16). Read the last frame's date before trusting it. 5067 shows UTC; GEOS labels are US Eastern per the known trap.
- ID TRAPS: link ids 860409-860417, 1139893-1139919 and placeholder id 1 are media-group ids, not SVS pages. Media groups 367972, 368019, 479017 belong to pages 5054, 5041, 3912. The 10 gallery ids (40467-40531) are not visualizations.
- UNKNOWN: Smithsonian installation and any public EIC website are not described in these sheets; 5669 and 13786 content not examined; 3912 movie date coverage unknown. Saved to <evidence>/analysis/pages/galleries.json.
