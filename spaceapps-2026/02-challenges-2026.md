# B. NASA Space Apps 2026 Challenges Catalog

Researched 2026-11-14. Tags: [VERIFIED] read on cited page, [INFERRED], [UNKNOWN].

## Access notes
- Official list https://www.spaceappschallenge.org/2026/challenges/ blocked for WebFetch (robots.txt) per instructions; not circumvented.
- Individual challenge pages (e.g. https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/) failed in WebFetch with "unable to get local issuer certificate" (TLS error) [VERIFIED, tool error]. Details below come from secondary sources.

## Master list (14) -- source: Sonoma State local event page https://edeon.sonoma.edu/nasaspaceapps-26/ [VERIFIED]
1. Abandoned but Not Forgotten -- /2026/challenges/nasas-discarded-equipment-storytelling/
2. Be an Earth System Trend Detective! -- /2026/challenges/earth-system-trend-detective/
3. Build a Junior Astronaut Mission Trainer -- /2026/challenges/junior-astronaut-mission-trainer/
4. Lunar Landing Site Navigator -- /2026/challenges/lunar-landing-site-navigator/ (Romanian press calls it "CLPS Lunar Mission Browser")
5. Create Health Monitoring Software for Astronauts on Space Missions -- /2026/challenges/health-monitoring-software/
6. Dancing with the SARs -- /2026/challenges/dancing-with-the-sars/
7. Field Shift: Adapting Farms with NASA Data -- /2026/challenges/adapting-farms-with-nasa-data/
8. Flame in Freefall -- /2026/challenges/flame-in-freefall/
9. Harmonization of MODIS and VIIRS Hot Spots -- /2026/challenges/modis-and-viirs-hot-spots/
10. Identify Earth Locations That Analog the Permanent Moon Base Locations and Mars -- /2026/challenges/permanent-moon-base-locations-and-mars/
11. Interplanetary Survival Guide: Martian Map -- /2026/challenges/interplanetary-survival-guide-martian-map/
12. Planet X and SPHEREx -- /2026/challenges/planet-x-and-spherex/
13. Space Mission Design Game -- /2026/challenges/space-mission-design-game/
14. The Earth Information Jukebox -- /2026/challenges/the-earth-information-jukebox/
(all prefixed https://www.spaceappschallenge.org)

Difficulty grouping per Romanian press https://zilesinopti.ro/?p=892787 [VERIFIED as reported there]: Beginner/Intermediate: Martian Map, Space Mission Design Game, Earth Information Jukebox, Earth analogs. Intermediate/Advanced: Trend Detective, Lunar mission browser, Dancing with the SARs; Field Shift & Flame in Freefall listed after (implied).

## Alternate official slugs/difficulty/subjects -- source: Space Apps Sri Lanka https://www.nasaspaceapps.lk/challenges [VERIFIED on that page]
(Slugs on .lk differ from Sonoma's; which is canonical is [UNKNOWN] -- both pages untestable due to TLS error.)
| # | Challenge | Difficulty | Subjects |
|---|---|---|---|
| 1 | Abandoned but not Forgotten: Storytelling about NASA's Discarded Equipment on the Moon and Mars | Intermediate; Beginner/Youth | Astrophysics / Planets & Moons |
| 2 | Be An Earth System Trend Detective! | Advanced | Earth Science / Software |
| 3 | Build a Junior Astronaut Mission Trainer | Intermediate; Beginner/Youth | Games / Planets & Moons |
| 4 | CLPS Lunar Mission Browser (Sonoma lists "Lunar Landing Site Navigator") | Advanced; Intermediate | Human Exploration / Moon |
| 5 | Create Health Monitoring Software for Astronauts on Space Missions | Intermediate | Human Exploration / Software |
| 6 | Dancing with the SARs | Advanced; Intermediate | Earth Science |
| 7 | Field Shift: Adapting Farms with NASA Data | Advanced; Intermediate | Arts & Multimedia / Earth Science |
| 8 | Flame in Freefall: AI-Powered Fire Safety Insights from Microgravity Combustion Data | Advanced; Intermediate | Space Exploration |
| 9 | Harmonization of MODIS and VIIRS Hot Spots | Advanced; Intermediate | Earth Science / Software |
| 10 | Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars | Advanced; Intermediate; Beginner/Youth | Earth Science / Planets & Moons |
| 11 | Interplanetary Survival Guide: Martian Map | Intermediate | Human Exploration / Mars |
| 12 | Planet X and SPHEREx | Advanced | Astrophysics / Planets & Moons |
| 13 | Space Mission Design Game | Intermediate; Beginner/Youth | Games |
| 14 | The Earth Information Jukebox | Intermediate; Beginner/Youth | Arts & Multimedia / Earth Science |

---
## PRIORITY: The Earth Information Jukebox
- URL: https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/ -- WebFetch failed (TLS cert error) [VERIFIED failure]. FULL official text (objectives, potential considerations, resource list, FAQ) NOT retrieved [UNKNOWN].
- Difficulty: Intermediate; Beginner/Youth [VERIFIED https://www.nasaspaceapps.lk/challenges]
- Subjects: Arts & Multimedia / Earth Science [VERIFIED same]
- Summary: "Pair Earth Information Center visualizations with live sonification, making Earth science an experience of sight and sound." [VERIFIED same]
- Statement core (restated by team README "NASA Challenge Statement" block): "NASA's Earth Information Center (EIC) produces stunning visualizations of our changing planet" ... build an "Earth Jukebox": an interface, script, or application that "pairs EIC visual frames with dynamic sonifications generated in real time." [VERIFIED secondary: https://github.com/Sharanya1807/earth-jukebox-nasa-space-apps-2026 ; phrase also on https://edeon.sonoma.edu/nasaspaceapps-26/]
- Problem framing: visualization-only Earth science limits who can access it (blind/low-vision accessibility) [INFERRED from search summary of team READMEs; not seen on official page]
- Authoring team: [UNKNOWN]. Likely NASA Earth Information Center / Earth Science Division [INFERRED from name]. EIC = NASA HQ immersive exhibit incl. "Space for Earth" [VERIFIED caption on nasaspaceapps.lk].
- Official NASA data/resources list: [UNKNOWN] (page unreadable). Resources teams are actually using:
  - NASA SVS 5176 (EIC frames; SST anomaly Pacific variant) https://svs.gsfc.nasa.gov/5176/ [VERIFIED cited in https://github.com/Nishix03/TerraSonic-NASA-Space-APPS]
  - NASA GIBS / Worldview imagery [VERIFIED cited same + terra-vox]; GIBS docs https://nasa-gibs.github.io/gibs-api-docs/ [INFERRED URL]
  - NASA POWER API (no login) [VERIFIED cited in TerraSonic, EARTHSONIC, Green Corner]
  - GISTEMP v4 https://data.giss.nasa.gov/gistemp/ [VERIFIED cited in jaherunhasanrimon repo]
  - FIRMS active fire, IMERG, MUR SST, PO.DAAC sea level, NSIDC sea ice [VERIFIED as listed in Sharanya1807 README; no URLs given]
  - EIC imagery via earth.gov; one team reports no stable EIC image endpoint, another used a pinned earth.gov mirror [VERIFIED per search summary of team repos; not individually read]
  - Related: NASA-IMPACT EIC-Mobile repo reads SVS videos + image services [VERIFIED search snippet; https://github.com/NASA-IMPACT/EIC-Mobile]
- Space agency partner resources: [UNKNOWN]
- FAQ: [UNKNOWN]
- Data accessibility: EASY -- images/video frames + small time series, no Earthdata login needed for SVS/GIBS/POWER/GISTEMP [INFERRED]
- Deliverable: interface/script/app pairing visuals + real-time audio [VERIFIED secondary as above]
- Next Frontier tie: new sensory frontier / accessibility of Earth science [INFERRED]
- CROWDEDNESS: HIGH. Evidence: >=20 public GitHub repos already for 2026 Jukebox on day 1 (e.g. jaherunhasanrimon, Saima040, imtanjilsarkar, joshibhavishya/Vision, EARTHSONIC, CrimsonCompiler/Prism-Tone, joselynrajeev55-ops, terra-vox, green-corner-app, ahsanur-official, Yoriichi-0u0/earth-fm, sybabintem/jukebox, Raiyan-Noor, Omtripathi1004, Nishix03/TerraSonic, NASA-space-app-challenge-2026/shkim, AhmadZubayer/ByteAero, winlu2303) [VERIFIED via web search results]. Beginner tag + easy data + fun output = magnet [INFERRED]. Differentiators to beat the pack: true frame-pixel-driven sonification of actual EIC frames (most repos sonify a time series instead), blind/low-vision user testing, scientifically honest mapping docs [INFERRED].
- Best-fit Global Awards: Best Use of Storytelling / Art & Technology, Most Inspirational, Global Connection / accessibility-oriented awards [INFERRED; award names not verified this year].

---
## Per-challenge notes (other 13)
Caveat: no official challenge page could be read (TLS error / robots). Summaries are from https://www.nasaspaceapps.lk/challenges (".lk") and https://edeon.sonoma.edu/nasaspaceapps-26/ ("Sonoma") [VERIFIED there]. Authoring team, official dataset lists, partner resources, FAQs: [UNKNOWN] for all unless noted.

Crowdedness proxy: GitHub repo search hit counts (repos created after 2026-09-01 matching challenge-name phrase; text search, noisy, includes unrelated repos) via GitHub search API, run 2026-11-14 [VERIFIED counts; interpretation INFERRED]:
Jukebox ("earth information jukebox" OR "earth jukebox") 111 | Trend Detective 110 | Field Shift 224 (generic phrase, noisy) | Flame in Freefall 153 | MODIS and VIIRS 111 | Planet X+SPHEREx 64 | Martian Map/Interplanetary Survival 127 | Junior Astronaut 177 | Abandoned/discarded equipment 98 | CLPS/lunar nav 279 (CLPS term noisy) | astronaut health monitoring 280 (generic) | mission design game 112 | Dancing with the SARs 72 | Earth analogs: unmeasurable (query too noisy) [UNKNOWN].
Stricter '"space apps" + keyword' counts: jukebox 36, NISAR 56, SPHEREx 89, mars map 45, mission design game 53, combustion 64.

1. **Abandoned but not Forgotten** -- Int; Beginner/Youth; Astrophysics / Planets & Moons. "tell the story of some or all of this equipment" left on Moon/Mars for young explorers. Data: likely NASA history/landing-site catalogs, LRO imagery [INFERRED]. Accessibility: easy. Crowd: M-H (storytelling, beginner) [INFERRED]. Next Frontier: legacy of exploration [INFERRED].
2. **Be An Earth System Trend Detective!** -- Advanced; Earth Science / Software. Visualize NASA observations over time, show where Earth changes and whether trends are significant ("find and examine variables measured by NASA missions or produced by NASA models"). Data: NASA mission/model variables; likely Giovanni/Earthdata, some need Earthdata login [INFERRED]. Crowd: M (advanced stats, but popular "climate dashboard" vibe; 110 hits).
3. **Build a Junior Astronaut Mission Trainer** -- Int; Beginner/Youth; Games / Planets & Moons. Game: students run lunar/Martian outpost balancing power, food, shielding, life support. Data light. Crowd: H (games + beginner; 177 hits) [INFERRED].
4. **CLPS Lunar Mission Browser / Lunar Landing Site Navigator** -- Adv; Int; Human Exploration / Moon. Compare lunar landing sites & dates via sunlight + comm windows near south pole. Relevant data: SVS "Illumination at the Moon's South Pole to 80S, 2025-2028" https://svs.gsfc.nasa.gov/5027 [VERIFIED exists; inclusion in challenge INFERRED]. Accessibility: moderate (rasters/ephemerides). Crowd: M.
5. **Create Health Monitoring Software for Astronauts** -- Int; Human Exploration / Software. Track health indicators, respond to changes on long missions. Data: [UNKNOWN] (likely synthetic/physiological). Crowd: H (generic dashboard; many health-app repos) [INFERRED].
6. **Dancing with the SARs** -- Adv; Int; Earth Science. Interactive app using NASA-ISRO NISAR radar to visualize surface change (glaciers to forests). Data: NISAR products via ASF https://asf.alaska.edu/nisar/ and Earthdata https://www.earthdata.nasa.gov/data/platforms/space-based-platforms/nisar [VERIFIED pages exist; challenge listing INFERRED]. Accessibility: HARD (big SAR rasters, Earthdata login) [INFERRED]. Crowd: L-M (72 hits) -- under-served.
7. **Field Shift: Adapting Farms with NASA Data** -- Adv; Int; Arts & Multimedia / Earth Science. Decision-support tool combining NASA EO with soil/crop info for resilient crop rotations. Teams use NASA POWER (e.g. https://github.com/Zul-Qarnain/field-shift) [VERIFIED topics]. Accessibility: easy-moderate. Crowd: M-H (agri resembles popular 2025 farm/weather challenges) [INFERRED].
8. **Flame in Freefall** -- Adv; Int; Space Exploration. AI-powered dashboard that "summarizes, ranks, and interprets" NASA microgravity combustion findings for spaceflight fire safety. Data: likely NASA publications/PSI/CIR experiment data [INFERRED]. Accessibility: text/docs, easy for LLM pipeline. Crowd: M-H (AI dashboard mirrors 2025 "Space Biology Knowledge Engine", which was very popular) [INFERRED].
9. **Harmonization of MODIS and VIIRS Hot Spots** -- Adv; Int; Earth Science / Software. Web app harmonizing MODIS + VIIRS fire records into a "burning activity calendar". Data: FIRMS (free MAP_KEY), MCD14/VNP14, VNP64A1 [INFERRED]. Accessibility: moderate (FIRMS CSV API easy; scientific harmonization hard). Crowd: M (111 hits).
10. **Identify Earth Locations that Analog Moon Base / Mars** -- Adv; Int; Beginner/Youth; Earth Science / Planets & Moons. Use open Earth/Moon/Mars data to find Earth analogs (press cites Atacama, Haughton Crater, Death Valley https://zilesinopti.ro/?p=892787). Accessibility: moderate rasters. Crowd: M [INFERRED; count UNKNOWN].
11. **Interplanetary Survival Guide: Martian Map** -- Int; Human Exploration / Mars. Layered integrated view of a location/route on Mars to help astronauts plan safely. Data: likely Mars Trek / HiRISE / MOLA [INFERRED]. Crowd: M-H (127 hits; map apps attractive).
12. **Planet X and SPHEREx** -- Advanced; Astrophysics / Planets & Moons. Public web tool to display/compare SPHEREx sky images over time to reveal moving/changing objects (blink comparator). Data: SPHEREx via IRSA/IPAC [INFERRED]. Accessibility: hard-ish (FITS, astropy). Crowd: L-M (64 hits), but exoplanet-style astro hook drew crowds in 2025 [INFERRED].
13. **Space Mission Design Game** -- Int; Beginner/Youth; Games. Students plan a full mission balancing engineering choices + limited resources. Crowd: H (beginner game; 112 hits).

---
## Ranked table (most attractive for a strong team = under-served + feasible first)
| # | Challenge | Difficulty | Est. crowd | Data access | Best-fit Global Awards [INFERRED] | Notes |
|---|---|---|---|---|---|---|
| 1 | Dancing with the SARs | Adv/Int | L-M | Hard (NISAR rasters, Earthdata login) | Best Use of Science, Best Use of Data | Fewest repos; brand-new mission data; high bar |
| 2 | Planet X and SPHEREx | Adv | L-M | Moderate-hard (FITS/IRSA) | Best Use of Science, Galactic Impact | Blink comparator; new mission |
| 3 | Harmonization of MODIS and VIIRS Hot Spots | Adv/Int | M | Moderate (FIRMS API easy) | Best Use of Data, Best Use of Science | Real science problem, clear deliverable |
| 4 | CLPS Lunar Mission Browser | Adv/Int | M | Moderate (SVS 5027 illumination) | Best Mission Concept, Best Use of Technology | Artemis-era relevance |
| 5 | Be An Earth System Trend Detective! | Adv | M | Moderate (Giovanni/Earthdata) | Best Use of Science | Statistical rigor differentiates |
| 6 | Earth analogs (Moon/Mars) | Adv/Int/Beg | M | Moderate | Best Use of Data, Global Connection | Multi-planet data fusion |
| 7 | Flame in Freefall | Adv/Int | M-H | Easy (papers/text) | Best Use of Technology | LLM-dashboard crowd (2025 Bio Knowledge Engine analog) |
| 8 | Field Shift | Adv/Int | M-H | Easy (NASA POWER) | Local Impact, Global Connection | Popular farm theme |
| 9 | Martian Map | Int | M-H | Moderate (Mars Trek) | Best Mission Concept | |
| 10 | Abandoned but not Forgotten | Int/Beg | M-H | Easy | Best Storytelling, Most Inspirational | |
| 11 | **The Earth Information Jukebox** | Int/Beg | **H** | Easy (SVS/GIBS/POWER, no login) | Art & Technology / Storytelling, Most Inspirational | >=111 hits, 20+ named repos on day 1; win via real accessibility + pixel-driven EIC frames |
| 12 | Space Mission Design Game | Int/Beg | H | Easy | Best Educational / Storytelling | |
| 13 | Junior Astronaut Mission Trainer | Int/Beg | H | Easy | Best Educational / Most Inspirational | |
| 14 | Astronaut Health Monitoring | Int | H | Unknown/synthetic | Best Use of Technology | Generic dashboard magnet |

Award names are [INFERRED] from past years (e.g. https://www.spaceappschallenge.org/2025/awards/, not read); 2026 award list [UNKNOWN].
