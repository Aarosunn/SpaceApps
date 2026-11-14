# B. NASA Space Apps 2026 Challenges Catalog

Rebuilt 2026-11-14 from OFFICIAL challenge page text saved locally in `sources/` (c-*.txt, jukebox.txt). Team context: Chicago local event, 5 people (4 technical, 1 business), aiming for a Global Award.

Tags:
- **[VERIFIED]** = from the official page text, cited by official URL `https://www.spaceappschallenge.org/2026/challenges/<slug>/`.
- **[INFERRED]** = our analysis (no data was fetched online for this rebuild).
- **[SECONDARY]** = carried over from the old non-official sources (Sri Lanka page https://www.nasaspaceapps.lk/challenges = ".lk"; Sonoma page https://edeon.sonoma.edu/nasaspaceapps-26/; GitHub search counts). The official text files do not include the difficulty or subject tags, so those still come from .lk.

## Judging context [VERIFIED, sources/guide-judging.txt = Judging and Awards Guide https://www.spaceappschallenge.org/resources/judging-awards-guide/]
- The 10 Global Awards: **Best Use of Science** (best and most valid use of the scientific method), **Best Use of Data** (makes space data accessible or uses it in a unique application), **Best Use of Technology** (most innovative tech), **Galactic Impact** (most potential to improve life on Earth or the universe), **Best Mission Concept** (most plausible concept and design), **Most Inspirational** (captures our hearts), **Best Storytelling** (most creatively communicates the potential of open data through storytelling), **Global Connection** (best connects people around the world through technology), **Art & Technology** (best combines technical and creative skills), **Local Impact** (greatest potential to make a difference in the local community).
- Scoring criteria (score of 5 = top): Impact, Creativity/Innovation, Validity/Feasibility (including usability), Relevance & NASA Data Integration ("NASA data is integral"), Communication/Storytelling.
- Submission: demo is either 7 slides max or a 30-second video max, in English. All external resources, including open-source ones, go in References. Deadline Sun Nov 15, 11:59 p.m. local time. Global Nominees announced Dec 3, Finalists Dec 17, Winners Jan 26, 2027.

## Master list (14 challenges, all confirmed by official source files)
| # | Challenge | Slug |
|---|---|---|
| 1 | The Earth Information Jukebox | the-earth-information-jukebox |
| 2 | Lunar Landing Site Navigator | lunar-landing-site-navigator |
| 3 | Dancing with the SARs | dancing-with-the-sars |
| 4 | Planet X and SPHEREx | planet-x-and-spherex |
| 5 | Harmonization of MODIS and VIIRS Hot Spots | modis-and-viirs-hot-spots |
| 6 | Be an Earth System Trend Detective! | earth-system-trend-detective |
| 7 | Identify Earth Locations That Analog the Permanent Moon Base Locations and Mars | permanent-moon-base-locations-and-mars |
| 8 | Flame in Freefall | flame-in-freefall |
| 9 | Field Shift: Adapting Farms with NASA Data | adapting-farms-with-nasa-data |
| 10 | Interplanetary Survival Guide: Martian Map | interplanetary-survival-guide-martian-map |
| 11 | Abandoned but Not Forgotten (NASA's discarded equipment storytelling) | nasas-discarded-equipment-storytelling |
| 12 | Space Mission Design Game | space-mission-design-game |
| 13 | Build a Junior Astronaut Mission Trainer | junior-astronaut-mission-trainer |
| 14 | Create Health Monitoring Software for Astronauts on Space Missions | health-monitoring-software |

Crowdedness proxy [SECONDARY, carried over]: GitHub repo search hit counts (repos created after 2026-09-01 that match the challenge-name phrase; noisy text search), run 2026-11-14. Jukebox 111 | Trend Detective 110 | Field Shift 224 (generic phrase, noisy) | Flame in Freefall 153 | MODIS and VIIRS 111 | Planet X+SPHEREx 64 | Martian Map/Interplanetary Survival 127 | Junior Astronaut 177 | Abandoned/discarded equipment 98 | CLPS/lunar nav 279 (noisy) | astronaut health monitoring 280 (generic) | mission design game 112 | Dancing with the SARs 72 | Earth analogs: not measurable. Stricter '"space apps" + keyword' counts: jukebox 36, NISAR 56, SPHEREx 89, mars map 45, mission design game 53, combustion 64.

Note on wording [VERIFIED + INFERRED]: three official pages (Field Shift, Trend Detective, Flame in Freefall) say "SI" where secondary sources said "AI" (e.g. .lk titled Flame in Freefall "AI-Powered..."). We read "SI" as AI/ML-style techniques [INFERRED]. Mirror the official wording in the submission.

---
## 1. PRIORITY: The Earth Information Jukebox
- **Official URL:** https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/ (source: sources/jukebox.txt) [VERIFIED]
- **Difficulty / subjects:** Intermediate; Beginner/Youth. Arts & Multimedia / Earth Science [SECONDARY .lk]

### Background (summary) [VERIFIED]
NASA's Earth Information Center (EIC) visualizations track planetary change (global temperatures, ocean currents), but they are mostly visual. This "limits accessibility for blind and low-vision users and constrains how the public can interact with complex Earth science." Sonification (translating data into sound) opens multi-sensory access, "can reveal subtle data patterns that might be missed by the naked eye," and "can foster a deeper emotional connection." Teams need a way to connect imagery to audio generation: a "jukebox" interface or algorithm that analyzes EIC visual frames and plays a matching soundscape. The page gives examples: computer vision mapping color spectrums to chords, pixel density to rhythm, or artistic rulesets driving synth parameters from shapes. It also says the translation should be "exploratory, blending scientific data with artistic expression."

### Objectives (close quote) [VERIFIED]
> Your challenge is to create an "Earth Jukebox" experience that generates dynamic sonifications from NASA's EIC visual frames. The desired outcome is a project where individuals can select or experience a specific EIC visualization alongside its corresponding soundscape. You may consider developing an interactive tool that actively translates the visual data into sound, or you may choose to submit a curated collection of original, generated audio files that tell the auditory story of the data.
>
> ...You might use computer vision techniques to analyze color palettes, shapes, or pixel densities in the EIC imagery, and map those elements to audio parameters like pitch, tempo, or instrumentation. You are welcome to employ machine learning algorithms, open-source audio synthesis frameworks, or custom data-driven artistic rulesets to generate the soundscapes. The exact method of translation is entirely up to you — we encourage you to aim for soundscapes that balance data interpretation with artistic, musically pleasing outputs.
>
> The final deliverable can take many forms... an interactive web-based jukebox, a standalone desktop application, a backend API endpoint, or an engaging playlist of original, generated audio files accompanied by an explanation of the creative process used to make them. Think about how your audience will experience the visual data and how your approach can best convey the complexity of our changing planet through sound.

### Potential Considerations (close quote) [VERIFIED]
- **Understanding the Concepts**
  - "Sonification: the use of non-speech audio to convey information or perceptualize data."
  - "Visual Frames: many EIC visualizations are animated sequences or images. You might explore extracting individual images (frames) from these sequences to serve as the foundation for your audio generation."
- **Designing Your "Jukebox" Experience**
  - Submission can be "a coded, interactive user interface (UI)" or "a thoughtfully curated digital gallery or playlist of your original, generated audio files paired with the imagery."
  - If interactive: think about UX, "how intuitively someone can select a visualization and initiate the audio."
  - "**Accessibility is a core theme of this challenge.** You could explore adding features that support blind and low-vision users, such as screen-reader compatibility, tactile feedback, or rich descriptive text accompanying your audio."
- **Approaches to Data Translation**
  - Map "color spectrums, brightness, geometric shapes, or spatial pixel density" to "pitch, rhythm, tempo, volume, or instrumentation."
  - "Consider the balance between strict data translation and musicality. A direct pixel-to-sound translation might result in chaotic noise; you may want to apply artistic rulesets, musical scales, or harmonies to make the audio engaging and pleasant to listen to."
  - Disciplines can range "from writing custom computer vision algorithms and machine learning models to utilizing audio synthesizers and digital audio workstations."
- **Telling the Story**
  - "Documenting your process... sharing the 'why' behind your artistic choices or explaining the algorithms and scripts you used to generate the sounds."
  - "Think about the emotional impact... how your soundscapes can reflect the urgency of climate change or the beauty of our planet's interconnected systems."

### Official NASA Data & Resources (all 11, as listed) [VERIFIED]
1. Earth Information Center (EIC) Content Database: https://svs.gsfc.nasa.gov/gallery/earth-information-center/ (SVS visuals used in the EIC dashboards. "Participants can use the videos and images as data.")
2. Data Sonification: Caldwell 73: https://svs.gsfc.nasa.gov/13786/ (conceptual model: luminosity and spatial coordinates mapped to volume and pitch)
3. Change in Night Lights between 2012 and 2023 - EIC Version: https://svs.gsfc.nasa.gov/5313/ (high contrast, so intensity can map to tempo or volume)
4. Global Sea Surface Currents and Temperature: https://svs.gsfc.nasa.gov/3912/#media_group_349716 (continuous flowing motion plus thermal gradients)
5. GEOS Aerosols: https://svs.gsfc.nasa.gov/5669/ (particles shown by type, so suited to "multi-track experimentation", one instrument per layer)
6. Air Quality Model Runs: https://svs.gsfc.nasa.gov/5533/ ("downloadable high-resolution frames")
7. Perpetual Ocean 2: Western Boundary Currents: https://svs.gsfc.nasa.gov/5425/ (high contrast, suited to CV-to-rhythm/scale)
8. DYAMOND Global Carbon Dioxide: https://svs.gsfc.nasa.gov/5196/ (CO2 patterns changing over time)
9. Lightning Events Detected from the ISS 2017-2023: https://svs.gsfc.nasa.gov/5011/ ("punctuated sonification", percussive triggers)
10. A 3D View of an Atmospheric River from an Earth System Model: https://svs.gsfc.nasa.gov/4960/ (moisture density and spread mapped to shifting soundscapes)
11. GEDI Forest Height: https://svs.gsfc.nasa.gov/4950/ (color spectrum of canopy height mapped to rhythm, frequency, pitch)

- **Partner-agency resources:** none listed on the official page [VERIFIED by absence in sources/jukebox.txt].
- **Expected deliverable forms** [VERIFIED]: interactive web jukebox, standalone desktop app, backend API endpoint, or a curated playlist/gallery of generated audio paired with imagery plus a process explanation.

### What judges will likely look for [INFERRED from the Considerations + judging guide]
1. Real EIC/SVS frames as the input (the brief is explicitly frame-to-sound, not time-series-to-sound).
2. A mapping that is both legible and musical: scales and harmonies instead of raw noise.
3. Accessibility as a first-class feature (screen reader, descriptive text, tactile/haptic), ideally tested with blind or low-vision users.
4. A documented "why" for each mapping choice.
5. Emotional/story framing (climate urgency, interconnected systems).
6. Easy select-and-play UX.

### Analysis [INFERRED]
- **Data accessibility: EASY.** Every resource is an SVS page. SVS pages normally serve downloadable MP4s and frame sequences with no login, and #6 is explicitly described as downloadable frames. The work is CV and audio, not data wrangling.
- **Crowdedness: HIGH** [SECONDARY evidence]: 111 broad hits, 36 strict hits, and 20+ named public repos for the 2026 Jukebox on day 1 (e.g. jaherunhasanrimon, Saima040, imtanjilsarkar, joshibhavishya/Vision, EARTHSONIC, CrimsonCompiler/Prism-Tone, joselynrajeev55-ops, terra-vox, green-corner-app, ahsanur-official, Yoriichi-0u0/earth-fm, sybabintem/jukebox, Raiyan-Noor, Omtripathi1004, Nishix03/TerraSonic, NASA-space-app-challenge-2026/shkim, AhmadZubayer/ByteAero, winlu2303). The old notes say many of these sonify NASA POWER, GISTEMP, or GIBS time series rather than the listed EIC frames, which is off-brief relative to the official resource list.
- **Best-fit Global Awards:** Art & Technology (most direct fit), Best Storytelling, Most Inspirational, Best Use of Data (an accessibility angle that "makes space data accessible"), Global Connection (non-visual access across languages).
- **Differentiator:** per-layer, frame-pixel-driven sonification of the 11 listed visuals (e.g. Aerosols: one instrument per aerosol type; Lightning: percussion), with a published mapping legend, real blind/low-vision user feedback, and an accessible UI. The business teammate can own the user testing and the story.

---
## 2. Lunar Landing Site Navigator
- **Official URL:** https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/ (sources/c-lunar-landing-site-navigator.txt) [VERIFIED]
- **Difficulty / subjects:** Advanced; Intermediate. Human Exploration / Moon [SECONDARY .lk, which called it "CLPS Lunar Mission Browser"; that name does not appear on the official page]
- **Summary** [VERIFIED]: CLPS and other lunar missions must pick landing sites and dates that balance science and engineering. The Sun's position drives power and thermal conditions, and Earth's position decides whether direct-to-Earth comms work. This is most acute at the south pole, where small location or date shifts swing power and comms dramatically. Schedules slip, so planners need rapid comparison of alternative sites and dates. Existing tools (Quickmap, Moon Trek, JPL Horizons) are built for detailed analysis and are hard for non-specialists to use quickly. Objective: a tool for rapid evaluation of landing-site options. It may include curated site lists (Apollo, CLPS targets, other commercial and international sites) plus custom coordinates, side-by-side comparison, date/time flexibility, Sun and Earth positions relative to the horizon, time remaining to sunset or Earthset, solar elevation, sunlight duration, Earth visibility windows, 2D/3D views, timeline animations, and accessibility across skill levels.
- **NASA Data & Resources** [VERIFIED]: Quickmap https://quickmap.lroc.asu.edu/ | Moon Trek https://trek.nasa.gov/moon/ | Horizons System https://ssd.jpl.nasa.gov/horizons/
- **Partner resources** [VERIFIED]: CSA Moon Exploration https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/
- **Deliverables** [VERIFIED]: web app, mobile app, interactive visualization, educational game, or other.
- **Judge hints (Potential Considerations)** [VERIFIED]: use ephemerides from Horizons or precomputed data. Use LOLA topography for accurate horizons (no atmosphere means no refraction, and the horizon is set by terrain). Show solar elevation prominently. Communicate time-to-sunset/Earthset clearly. Make lunar-versus-Earth extremes vivid. Explain why small changes have big impact. Consider Earth libration and orbital variation. Represent steep south-pole slopes and shadowed craters. Support science-engineering coordination and schedule-slip response, with education as a second use.
- **Data accessibility** [INFERRED]: MODERATE. Horizons is a well-documented computation service (the page says it gives Sun/Earth positions "as seen from any location on the Moon"). Terrain-aware horizons need LOLA DEMs; LOLA is mentioned in the considerations but no LOLA URL is listed. Note: the old file's SVS 5027 illumination dataset is NOT an official resource.
- **Crowd** [SECONDARY]: 279 hits, but the "CLPS" term is noisy. Est. **M** [INFERRED].
- **Best-fit awards** [INFERRED]: Best Mission Concept, Best Use of Technology, Best Use of Science.
- **Differentiator** [INFERRED]: terrain-masked horizon (LOLA) instead of a bare sphere, a "what if we slip 2 weeks" comparison view, validated against Horizons.

## 3. Dancing with the SARs
- **Official URL:** https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/ [VERIFIED]
- **Difficulty / subjects:** Advanced; Intermediate. Earth Science [SECONDARY .lk]
- **Summary** [VERIFIED]: SAR is active microwave remote sensing. It works day or night and through clouds, is sensitive to roughness and dielectric constant (so water, floods, and soil moisture stand out), and can measure centimeter-scale deformation. Objective: build an interactive app that uses **NISAR** radar data to track and visualize one or more surface changes (wetlands, deforestation/wildfire, crops, soil moisture, glaciers/sea ice, earthquakes/subsidence) at locations worldwide. The page suggests change-detection maps, time-series animations, or dashboards. The outcome should be "open-source, user-friendly." Steps: pick a study area ("your hometown" is explicitly allowed), download free NISAR data, add optional optical/GIS context, present in any interactive digital medium (report, video, slides, story map, "even an interpretive dance?"), and hypothesize the physical drivers. Prompts include which polarizations highlight the changes and what future NISAR applications are possible.
- **NASA Data & Resources** [VERIFIED]: NASA Earthdata Search https://search.earthdata.nasa.gov/search | ASF Data Search Vertex https://search.asf.alaska.edu/ | NISAR Data User Guide https://nisar-docs.asf.alaska.edu/ | Intro to Remote Sensing https://www.earthdata.nasa.gov/learn/earth-observation-data-basics/remote-sensing | Intro to Synthetic Aperture Radar (SAR) https://www.earthdata.nasa.gov/learn/earth-observation-data-basics/sar | NASA ARSET Trainings https://appliedsciences.nasa.gov/get-involved/training | NISAR StoryMaps https://nisar.jpl.nasa.gov/applications/arcgis-storymaps/ | NISAR Applications White Papers https://nisar.jpl.nasa.gov/applications/societal-benefit/ | UAVSAR Postcards https://uavsar.jpl.nasa.gov/education/postcards.html
- **Partner resources** [VERIFIED]: CSA: Radarsat Constellation Mission (RCM) - Data https://donnees-data.asc-csa.gc.ca/en/dataset/rcm | Synthetic Aperture Radar python Tutorial https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial | RADARSAT 1 - Data https://donnees-data.asc-csa.gc.ca/en/dataset/radarsat1. CONAE: SAOCOM Catalogue https://catalogos.conae.gov.ar/catalogo/catalogoSatSaocomInfo.html | SAOCOM Catalogue Registration https://www.argentina.gob.ar/noticias/la-informacion-saocom-cada-vez-mas-accesible
- **Deliverables** [VERIFIED]: interactive app, plus a summary in any digital medium.
- **Judge hints** [VERIFIED]: compare polarizations and/or frequencies (other sensors), use multi-date time series plus ancillary data (population, vegetation type), show human drivers, focus on "compelling storytelling through data visualizations," give personal hometown context, make it interactive (image sliders, web maps).
- **Data accessibility** [INFERRED]: HARD. Large SAR products via Earthdata Search/ASF Vertex, which likely need an Earthdata login. NISAR is a new mission, so the available time span may be short. The CSA Python tutorial lowers the ramp. Note: the old file's URLs asf.alaska.edu/nisar and the Earthdata NISAR platform page are not on the official list.
- **Crowd** [SECONDARY]: 72 hits, 56 strict. Est. **L-M**.
- **Best-fit awards** [INFERRED]: Best Use of Data, Best Use of Science, Local Impact (hometown study area: Chicago-area Lake Michigan shoreline, flooding, or subsidence), Best Storytelling.
- **Differentiator** [INFERRED]: a Chicago-area study with a clear physical-driver hypothesis plus a before/after slider. Few teams will get NISAR working.

## 4. Planet X and SPHEREx
- **Official URL:** https://www.spaceappschallenge.org/2026/challenges/planet-x-and-spherex/ [VERIFIED]
- **Difficulty / subjects:** Advanced. Astrophysics / Planets & Moons [SECONDARY .lk]
- **Summary** [VERIFIED]: Moving or changing objects are found by comparing sky images taken at different times (that is how Pluto was found, and Backyard Worlds volunteers found most known brown dwarfs and comets this way). SPHEREx (returning data since May 2025) maps the whole sky every six months in 102 near-infrared bands. Objective: a public-facing web tool where users enter RA/Dec and see a series of SPHEREx images of that patch played "like a little video" so moving objects are easy to spot. **Required test targets:** Barnard's Star, Epsilon Indi B, WISE 0855 (RA 08h55m10.831s, Dec -7d14m42.53s), RW Aurigae, R Draconis.
- **NASA Data & Resources** [VERIFIED]: NASA/IPAC Infrared Science Archive https://irsa.ipac.caltech.edu/Missions/spherex.html | SPHEREx Tutorial Notebooks https://caltech-ipac.github.io/irsa-tutorials/spherex/ | WiseView http://byw.tools/wiseview | Gaia Mission Data https://archive.stsci.edu/missions-and-data/gaia ("use the latest data release (Data Release 3)"). Also referenced: backyardworlds.org http://backyardworlds.org/
- **Partner resources** [VERIFIED]: CSA: NEOSSat https://www.asc-csa.gc.ca/eng/satellites/neossat/ | Canadian Astronomy Data Centre (CADC) https://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/en/ | NEOSSat Data Tutorial https://github.com/asc-csa/NEOSSAT_Tutorial | NEOSSat Dataset https://data.asc-csa.gc.ca/dataset/neossat
- **Deliverables** [VERIFIED]: public web tool (blink comparator).
- **Judge hints** [VERIFIED]: easy to update with new data releases. Creative display of 102 bands (e.g. co-add per detector array for S/N). "Extra kudos if your tool can generate spectra on the fly." Add/subtract epochs. User-chosen field of view. Gaia/WISE overlays. Coordinates in the URL for embedding. Show contamination flags. Consider Astropy and Aladin (CDS).
- **Data accessibility** [INFERRED]: MODERATE-HARD. FITS spectral images through IRSA; the official tutorial notebooks give a working path. Cutout/transfer time is a stated concern.
- **Crowd** [SECONDARY]: 64 hits, 89 strict. Est. **L-M**.
- **Best-fit awards** [INFERRED]: Best Use of Data, Best Use of Technology, Best Use of Science, Global Connection (citizen science).
- **Differentiator** [INFERRED]: on-the-fly spectra plus URL-embeddable views plus Gaia proper-motion overlay, demoed on all five test targets.

## 5. Harmonization of MODIS and VIIRS Hot Spots
- **Official URL:** https://www.spaceappschallenge.org/2026/challenges/modis-and-viirs-hot-spots/ [VERIFIED]
- **Difficulty / subjects:** Advanced; Intermediate. Earth Science / Software [SECONDARY .lk]
- **Summary** [VERIFIED]: MODIS (Terra/Aqua, 20+ years, near end of life) and VIIRS (successor) differ in resolution, sensitivity, and schedule, so their records cannot be compared without harmonization. Objective: a harmonized burning-activity calendar in a web app. Part 1: harmonize FIRMS MODIS and VIIRS hotspots "so that ... the sensor of origin no longer matters." Part 2: a web app where users select a region and date range and download analytics and visualizations. The calendar shows hotspot counts from the early 2000s to the present by month and year, plus current-versus-historical comparison. Color ramps and a downloadable CSV are suggested. Photo credit: CONAE (Argentina).
- **NASA Data & Resources** [VERIFIED]: FIRMS NASA EARTHDATA: Fire Information for Resource Management System https://www.earthdata.nasa.gov/data/tools/firms (the only listed resource).
- **Partner resources:** none listed [VERIFIED by absence].
- **Deliverables** [VERIFIED]: web app with calendar, region/date selection, downloadable analytics and CSV.
- **Judge hints** [VERIFIED]: audience is emergency responders, scientists, land managers, firefighters. Draw an area on a map or enter lat/lon. Use accessible color ramps. Show anomalies versus multi-year averages and the number of fires detected.
- **Data accessibility** [INFERRED]: MODERATE. FIRMS hotspot archives are point CSV-style data, which are easy to handle. The hard part is a defensible harmonization method (e.g. overlap-period cross-calibration). The old file's MCD14/VNP14/VNP64A1 product names and the MAP_KEY note are not on the official page.
- **Crowd** [SECONDARY]: 111 hits. Est. **M**.
- **Best-fit awards** [INFERRED]: Best Use of Data, Best Use of Science, Galactic Impact.
- **Differentiator** [INFERRED]: quantified harmonization (overlap-period regression with uncertainty bands) shown visibly in the UI.

## 6. Be an Earth System Trend Detective!
- **Official URL:** https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/ [VERIFIED]
- **Difficulty / subjects:** Advanced. Earth Science / Software [SECONDARY .lk]
- **Summary** [VERIFIED]: Variables from MODIS, OMI, AIRS, GPM and models (MERRA-2, GLDAS) can show regional trends, sometimes opposite in different regions from the same process. The page lists four elements: (1) identify variables, (2) acquire them for a region, (3) generate and visualize a long-enough time series, (4) do basic statistics: rate of change and significance via "a t-test, the Mann-Kendall test, or confidence intervals." It states "A response that does both the visualization and the analysis meets the full scope."
- **NASA Data & Resources** [VERIFIED]: Giovanni https://giovanni.gsfc.nasa.gov/ | Hydrology Time Series https://disc.gsfc.nasa.gov/information/tools?title=Hydrology%20Time%20Series | AppEEARS https://appeears.earthdatacloud.nasa.gov/ | Climate Data Online (CDO) https://www.ncei.noaa.gov/cdo-web/ | Time-Series Analysis of Remotely-Sensed SeaWiFS Chlorophyll in River-Influenced Coastal Regions https://ntrs.nasa.gov/api/citations/20090042747/downloads/20090042747.pdf
- **Partner resources** [VERIFIED]: KNMI Climate Explorer https://climexp.knmi.nl/ | Statistical test methods to detect trends in time series data https://medium.com/@snp.kriss/statistical-test-methods-to-detect-trends-in-time-series-data-b361a0ec530b | A Comprehensive Guide to Statistical Significance https://www.statsig.com/perspectives/a-comprehensive-guide-to-statistical-significance | CSA: RCM - Data https://donnees-data.asc-csa.gc.ca/en/dataset/rcm | Geo.ca http://geo.ca/ | SWOT Mission - Information https://www.asc-csa.gc.ca/eng/satellites/swot/ | Monitoring and protecting our ecosystem from space https://www.asc-csa.gc.ca/eng/satellites/everyday-lives/monitoring-and-protecting-our-ecosystems-from-space.asp | Synthetic Aperture Radar python Tutorial https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial
- **Deliverables** [VERIFIED]: a tool that visualizes plus statistically tests trends.
- **Judge hints** [VERIFIED]: audience is HS/college students and the scientifically literate public. Give simple variable definitions. Make users "data detectives." Use a short question flow to pick variables, plus demo examples. "SI" can suggest variables from news, papers, or region type. Daily or monthly data are easiest. Non-significant trends are still interesting. Consider CUAHSI tools. Remove the seasonal cycle. Linear trends are "a great start."
- **Data accessibility** [INFERRED]: EASY-MODERATE. Giovanni and AppEEARS produce time series directly, though they likely need an Earthdata login.
- **Crowd** [SECONDARY]: 110 hits. Est. **M**.
- **Best-fit awards** [INFERRED]: Best Use of Science (an explicit scientific-method fit), Best Use of Data, Local Impact (e.g. Lake Michigan / Chicago urban heat trends).
- **Differentiator** [INFERRED]: guided "detective" flow with deseasonalized Mann-Kendall plus Sen's slope and honest p-values, and a variable-suggestion assistant.

## 7. Identify Earth Locations That Analog the Permanent Moon Base Locations and Mars
- **Official URL:** https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/ [VERIFIED]
- **Difficulty / subjects:** Advanced; Intermediate; Beginner/Youth. Earth Science / Planets & Moons [SECONDARY .lk]
- **Summary** [VERIFIED]: Use open Earth, Moon, and Mars data to systematically find, possibly *previously unrecognized*, terrestrial analogs for candidate permanent Moon-base sites or Mars landing/exploration sites. Explain what is analogous, how similar it is, where the analogy breaks down, and how it helps exploration. The page says "The goal is not simply to rediscover well-known analog sites." Formats: report, interactive map, app, story, similarity-ranking system, ML tool, etc.
- **NASA Data & Resources** [VERIFIED; URLs as listed on the page, including their `utm_source` query strings]: NASA Earthdata Search https://search.earthdata.nasa.gov/?utm_source=%27chatgpt.com%27 | NASA Worldview https://worldview.earthdata.nasa.gov/index.html?utm_source=%27chatgpt.com%27 | NASA Planetary Data System (PDS) https://pds.nasa.gov/?utm_source=%27chatgpt.com%27 | NASA Lunar Reconnaissance Orbiter (LRO) https://pds-geosciences.wustl.edu/missions/lro/?utm_source=%27chatgpt.com%27 | NASA LRO Diviner Lunar Data https://pds-geosciences.wustl.edu/missions/lro/diviner.htm?utm_source=%27chatgpt.com%27
- **Partner resources** [VERIFIED]: CSA: RCM - Data https://donnees-data.asc-csa.gc.ca/en/dataset/rcm | RADARSAT 1 - Data https://donnees-data.asc-csa.gc.ca/en/dataset/radarsat1 | SAR Python Tutorial https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial. ESA: Copernicus Data Space Ecosystem https://dataspace.copernicus.eu/?utm_source=%27chatgpt.com%27 | ESA Open Science Catalog https://opensciencedata.esa.int/?utm_source=%27chatgpt.com%27. JAXA: G-Portal https://gportal.jaxa.jp/gpr/index/index?utm_source=%27chatgpt.com%27
- **Judge hints** [VERIFIED]: think beyond visual similarity. Use multiple analogy dimensions (geology, terrain, temperature/illumination, ice, dust, biology, caves/lava tubes, operations). Partial matches are fine if quantified. Processes as well as places. **Look beyond Antarctica, Atacama, Iceland, Hawaii.** Explore subsurface too. Combine datasets. Pick the right scale (a crater, not a continent). Connect to exploration. State Earth's limits (gravity, vacuum, radiation). "Surprise us."
- **Data accessibility** [INFERRED]: MODERATE-HARD. Multi-body rasters (PDS, Diviner) plus Earth rasters need reprojection and feature engineering.
- **Crowd** [SECONDARY]: count not measurable. Est. **M** [INFERRED].
- **Best-fit awards** [INFERRED]: Best Use of Science, Best Use of Data, Best Mission Concept, Global Connection.
- **Differentiator** [INFERRED]: a quantitative multi-dimension similarity metric that surfaces an unexpected (non-famous) site, with an explicit "where it breaks" scorecard. The old file's press examples (Atacama, Death Valley) cut against the official brief.

## 8. Flame in Freefall
- **Official URL:** https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/ [VERIFIED]
- **Difficulty / subjects:** Advanced; Intermediate. Space Exploration [SECONDARY .lk]
- **Summary** [VERIFIED]: Fire is a top spaceflight hazard (Artemis II smoke alarm, Apollo 13, Mir, Apollo 1). Microgravity flames behave differently. Planned Moon Base and rover atmospheres (≥30% O2 at ≤10.2 psi) raise flammability. Low-gravity combustion results are in NASA's Physical Science Informatics (PSI) database but are hard to find, compare, and interpret. Objective: "an SI-powered, web-based dashboard that summarizes, ranks, and interprets combustion science investigations." It may identify the investigations most relevant to crew habitats (spacecraft, stations, lunar/Mars bases, pressurized rovers), extract data for predictive flammability modeling, and highlight research for next-gen fire safety equipment. Optional: Earth spinoff applications. Rockets and propellants are out of scope.
- **NASA Data & Resources** [VERIFIED]: PSI Data Repository: Combustion Science https://psi.nasa.gov/physci/repo/search?q=combustion | NASA Combustion Science https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/ | NASA ScienceCasts: The Power of Studying Combustion on the ISS https://www.youtube.com/watch?v=W1oXykoz9zg | A Researcher's Guide to International Space Station Combustion Science https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/ | Apollo 1 https://sma.nasa.gov/sma-disciplines/accllp/apollo-1 | Apollo 13 https://sma.nasa.gov/sma-disciplines/accllp/apollo-13 | Fireman's Air Tanks https://spinoff.nasa.gov/node/9582 | Fire Detector https://spinoff.nasa.gov/node/9407 | New Technology for the Fire Attire https://spinoff.nasa.gov/node/9918
- **Partner resources:** none listed [VERIFIED by absence].
- **Judge hints** [VERIFIED]: audience is professors, grad and undergrad students, aerospace researchers and engineers. Summarize objectives, fuels (shape/size), O2 concentration, airflow, test variables, sensors. Show similarities and differences across investigations. Group by hardware (ACME/CIR gaseous; FLEX/FLEX-2/CFI droplets/MDCA; BASS/BASS-II/SPICE/SLICE in MSG duct). Cover the spacesuit/O2 context (CFI-G up to 85% O2). There is no partial-g data in PSI yet (LUCI, FM2 future); E-FIELD Flames mimics partial g; µg and 1g results may bound intermediate gravity. Note: SAME/SAME-R and DAFT, plus ACME BRE, are named explicitly.
- **Data accessibility** [INFERRED]: MODERATE. A PSI search URL plus PDFs and web pages. PSI dataset downloads may require registration (unverified). The content is heterogeneous, so structured extraction is the real work.
- **Crowd** [SECONDARY]: 153 hits, 64 strict. Est. **M-H** (an LLM-dashboard pattern like the 2025 knowledge-engine challenge) [INFERRED].
- **Best-fit awards** [INFERRED]: Best Use of Technology, Galactic Impact, Best Use of Data.
- **Differentiator** [INFERRED]: a structured extraction table (fuel, O2, pressure, flow, g-level) with a "Moon Base atmosphere relevance" ranking, rather than a chat box.

## 9. Field Shift: Adapting Farms with NASA Data
- **Official URL:** https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/ [VERIFIED]
- **Difficulty / subjects:** Advanced; Intermediate. Arts & Multimedia / Earth Science [SECONDARY .lk]
- **Summary** [VERIFIED]: Combine NASA EO (SMAP, ECOSTRESS, GPM, Landsat, MODIS, NASA POWER, GRACE/GRACE-FO, SRTM) with local agricultural information in an app, model, interactive map, or decision-support tool that helps farmers explore crop-rotation options for soil health and resilience. The tool may highlight bare-field periods, vulnerable seasons, and pest-cycle or water-saving rotations. It may **"compare at least three rotation strategies, including the existing rotation,"** explaining for each why it was suggested, the evidence, benefits, information gaps, and risks needing local review. The tool "does not replace farmer judgment."
- **NASA Data & Resources** [VERIFIED, as listed]: Soil Moisture Active Passive (SMAP) https://www.earthdata.nasa.gov/data/platforms/space-based-platforms/smap | Global Precipitation Measurement (GPM) & IMERG https://gpm.nasa.gov/data | Landsat https://earthexplorer.usgs.gov/ | MODIS https://lpdaac.usgs.gov/products/ | VIIRS https://search.earthdata.nasa.gov/search?q=VIIRS | NASA POWER https://power.larc.nasa.gov/ | Shuttle Radar Topography Mission (SRTM) https://www.earthdata.nasa.gov/data/instruments/srtm | ECOSTRESS https://ecostress.jpl.nasa.gov/data | USDA Ag Data Commons https://www.nal.usda.gov/services/agdatacommons | Web Soil Survey (WSS) https://websoilsurvey.nrcs.usda.gov/app/ | Cropland Data Layer (CDL): CropScape https://nassgeodata.gmu.edu/CropScape/ | PRISM Climate Data https://prism.oregonstate.edu | USDA NRCS SSURGO/STATSGO2 https://www.nrcs.usda.gov/resources/data-and-reports/soils | National Agriculture Imagery Program (NAIP) https://naip-usdaonline.hub.arcgis.com/ | USGS National Land Cover Database (NLCD) https://www.usgs.gov/centers/eros/science/national-land-cover-database | NLDAS/GLDAS https://www.earthdata.nasa.gov/ (search "NLDAS"/"GLDAS" in Earthdata Search) | FAO Global Agro-Ecological Zones (GAEZ) https://gaez.fao.org | CoCoRaHS https://www.cocorahs.org/Maps | USGS National Water Information Systems (NWIS) https://waterdata.usgs.gov/nwis | USDA AMS Market News https://www.ams.usda.gov/market-news | USDA NASS QuickStats https://quickstats.nass.usda.gov | OpenET https://openetdata.org | USFS LANDFIRE https://www.landfire.gov | Global Ecosystem Dynamics Investigation (GEDI) https://gedi.umd.edu/data. (GRACE/GRACE-FO is named in the objectives but has no URL in the resource list.)
- **Partner resources** [VERIFIED]: ESA: Copernicus Sentinel-2 https://dataspace.copernicus.eu | ERA5: ECMWF Reanalysis https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels?tab=overview
- **Judge hints** [VERIFIED]: explain ET, soil-moisture anomalies, NDVI, frost risk, and water balance. Satellite vs ground data. Compare SI/statistical approaches. Explain uncertainty and where local expertise is needed. Harmonize resolutions to a common grid. Compare rotations on nutrient cycling, erosion, organic matter, pests, water, forage, market. Map rotations to farmer priorities. Interactive maps, timelines, scenario sliders. Farmer-centered UX with farmer-entered priorities and constraints.
- **Data accessibility** [INFERRED]: MIXED. POWER, PRISM, CDL, and QuickStats are easy and US-wide. SMAP, ECOSTRESS, and IMERG rasters are harder (Earthdata).
- **Crowd** [SECONDARY]: 224 hits (noisy). Est. **M-H** [INFERRED].
- **Best-fit awards** [INFERRED]: Local Impact (Illinois corn/soy, CDL + SSURGO), Galactic Impact, Best Use of Data.
- **Differentiator** [INFERRED]: a real Illinois field case with ≥3 rotations, an evidence and uncertainty panel per rotation, and (ideally) feedback from a local farmer. Strong fit for the business teammate.

## 10. Interplanetary Survival Guide: Martian Map
- **Official URL:** https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/ [VERIFIED]
- **Difficulty / subjects:** Intermediate. Human Exploration / Mars [SECONDARY .lk]
- **Summary** [VERIFIED]: Mars Trek and the USGS-NASA geologic maps are regional/global. Astronauts need hyperlocal maps for spacewalks. Objective: a map, tool, or interface a Mars astronaut could use on a surface excursion. Pick science goals and a location (example: boxwork at Mount Sharp, studied by Curiosity in 2025). Layer **at least three kinds of data** (optical, thermal, spectral, topographic, geophysical, atmospheric, radiation, chemical). Safety comes first (e.g. space weather and radiation, suit mobility). Optional route map avoiding obstacles.
- **NASA Data & Resources** [VERIFIED]: JPL Mars Trek https://trek.nasa.gov/mars/ | USGS-NASA Planetary Geologic Mapping Program https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars | Curiosity route-map example https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/ | NASA Worldview https://worldview.earthdata.nasa.gov/ | Mars Perseverance Raw Images Gallery https://mars.nasa.gov/mars2020/multimedia/raw-images/
- **Partner resources:** none listed [VERIFIED by absence].
- **Judge hints** [VERIFIED]: format can be a habitat display, tablet app, or helmet HUD. Static, interactive, or a generator. Draw inspiration from Earth, Moon, and exoplanet maps. Past, predicted, or timeless data. Include point-of-view rover imagery. Consider rovers or pairs of astronauts.
- **Data accessibility** [INFERRED]: MODERATE (Mars Trek layers and downloads; raw images are easy). HiRISE/MOLA (old file) are not separately listed.
- **Crowd** [SECONDARY]: 127 hits, 45 strict. Est. **M-H**.
- **Best-fit awards** [INFERRED]: Best Mission Concept, Best Use of Data, Art & Technology (HUD).
- **Differentiator** [INFERRED]: a slope/rock-aware traverse planner with a suit-mobility cost model and a radiation layer, shown as a HUD mock.

## 11. Abandoned but Not Forgotten (Discarded Equipment Storytelling)
- **Official URL:** https://www.spaceappschallenge.org/2026/challenges/nasas-discarded-equipment-storytelling/ [VERIFIED]
- **Difficulty / subjects:** Intermediate; Beginner/Youth. Astrophysics / Planets & Moons [SECONDARY .lk]
- **Summary** [VERIFIED]: Create an engaging, story-driven educational tool or narrative for school-age and casual enthusiasts about hardware left on the Moon, Mars, and elsewhere: what it is, why it was sent, and what it discovered. Examples: a Moon map with clickable "ghost rovers," a graphic novel from a dormant lander's view, a podcast, a game, a children's book, an animation, a 3D timeline.
- **NASA Data & Resources** [VERIFIED]: NSSDCA https://nssdc.gsfc.nasa.gov/. Moon: Apollo Lunar Modules https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C | Lunar Roving Vehicles https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063C | ALSEP Scientific Packages https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-099C | Surveyor Landers https://science.nasa.gov/mission/surveyor-3/. Mars and beyond: Sojourner https://science.nasa.gov/mission/mars-pathfinder/ | Spirit & Opportunity https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/ | Viking 1 & 2 https://science.nasa.gov/mission/viking-1/ | Phoenix & InSight https://science.nasa.gov/mission/insight/ | Dawn https://science.nasa.gov/mission/dawn/ | NEAR Shoemaker https://science.nasa.gov/mission/near-shoemaker/ | Pioneer 10 & 11 https://science.nasa.gov/mission/pioneer-10/ | Ingenuity https://science.nasa.gov/mission/mars-2020-perseverance/ingenuity-mars-helicopter/ | Kepler https://science.nasa.gov/mission/kepler/
- **Partner resources:** none listed [VERIFIED by absence].
- **Judge hints** [VERIFIED]: strong narrative. Show how missions operated rather than listing facts. Connect the engineering to the science gained. Build a personal connection. "Accuracy is important throughout!" Consider age group, format accessibility, scope, and perspective.
- **Data accessibility** [INFERRED]: EASY (catalog and web pages).
- **Crowd** [SECONDARY]: 98 hits. Est. **M-H** [INFERRED].
- **Best-fit awards** [INFERRED]: Best Storytelling, Most Inspirational, Art & Technology.
- **Differentiator** [INFERRED]: first-person artifact voices backed by real NSSDCA mission data, with accessible audio narration.

## 12. Space Mission Design Game
- **Official URL:** https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/ [VERIFIED]
- **Difficulty / subjects:** Intermediate; Beginner/Youth. Games [SECONDARY .lk]
- **Summary** [VERIFIED]: An interactive game covering a complete mission: objective, requirements, spacecraft, instruments, launch vehicle, orbit, and constraints (budget, mass, power, comms, data, lifetime). Single-player or **collaboration for up to four players**. Should include mission simulation and evaluation, scoring, and feedback.
- **NASA Data & Resources** [VERIFIED]: Design and Develop Science Missions https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf?emrc=a454cf | General Mission Analysis Tool (GMAT) https://software.nasa.gov/software/GSC-19468-1 | Concept Maturity Levels (CMLs) https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299 | Mission Design Lab (MDL) https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/ | NASA Mission Viz https://nasa.github.io/mission-viz/ | A Learning Game About Telescopes https://science.nasa.gov/mission/webb/game-build-it-yourself/ | Cubesat 101 https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf | Visualize a Space Mission Using Virtual Reality (2023 challenge) https://www.spaceappschallenge.org/2023/challenges/visualize-a-space-mission-using-virtual-reality/
- **Partner resources** [VERIFIED]: CSA Digital Games and Activities https://www.asc-csa.gc.ca/eng/youth-educators/digital-games-and-activities.asp
- **Judge hints** [VERIFIED]: accessible to all knowledge levels. Roles in team mode and negotiation. Every decision has a consequence. No single perfect solution. A launch-vehicle mass/orbit compatibility check. Clear resource display. Explain *why* rather than right/wrong. Optional: scenarios, random events, difficulty levels, leaderboards, end-of-mission reports, sandbox mode, post-mission analysis.
- **Data accessibility** [INFERRED]: EASY (documents; GMAT is optional).
- **Crowd** [SECONDARY]: 112 hits, 53 strict. Est. **H**.
- **Best-fit awards** [INFERRED]: Best Mission Concept, Best Use of Technology (real-time multiplayer), Most Inspirational.
- **Differentiator** [INFERRED]: real 4-role multiplayer with physics-grounded checks (rocket equation, power budget) and a CML-styled end report.

## 13. Build a Junior Astronaut Mission Trainer
- **Official URL:** https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/ [VERIFIED]
- **Difficulty / subjects:** Intermediate; Beginner/Youth. Games / Planets & Moons [SECONDARY .lk]
- **Summary** [VERIFIED]: An interactive game or app for **kids ages 7-12** to manage a lunar or Martian outpost (life support, radiation shielding, power, food, communication delay). Every choice has a cost. **Ground it in real NASA open data** (DONKI, OSDR, Artemis/Mars data) rather than invented numbers. Working prototype; any format.
- **NASA Data & Resources** [VERIFIED]: NASA Open APIs https://api.nasa.gov/ | Space Weather Database Of Notifications, Knowledge, Information (DONKI) https://ccmc.gsfc.nasa.gov/tools/DONKI/ | NASA Open Science Data Repository (OSDR) https://osdr.nasa.gov/bio/repo/ (search API https://osdr.nasa.gov/osdr/data/search?term=KEYWORD) | RadLab (OSDR Radiation Dosimetry Database) https://visualization.osdr.nasa.gov/radlab/gui/data-api/ | Mars Trek https://trek.nasa.gov/mars/
- **Partner resources** [VERIFIED]: CSA Space resources for STEM and youth organizations https://www.asc-csa.gc.ca/eng/youth-educators/resources-stem-and-youth-organizations.asp | Food production on the moon and in remote areas https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/
- **Judge hints** [VERIFIED]: plain language. Playable in a browser with no download or account. Attribute data in-tool. Curated embedded data is fine "just don't present static data as live." No cost-free "safe" choice. Mechanics over polish. Two or three core resources. Stand-out features: link in-game shielding to *actual current* space weather, replayability, a short dataset explanation for judges.
- **Data accessibility** [INFERRED]: EASY (api.nasa.gov key, DONKI JSON). The old file's "data light" claim was wrong; real data is a core ask.
- **Crowd** [SECONDARY]: 177 hits. Est. **H**.
- **Best-fit awards** [INFERRED]: Most Inspirational, Best Use of Data, Art & Technology.
- **Differentiator** [INFERRED]: live DONKI events plus RadLab dose driving the core mechanic, tested with real kids.

## 14. Create Health Monitoring Software for Astronauts on Space Missions
- **Official URL:** https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/ [VERIFIED]
- **Difficulty / subjects:** Intermediate. Human Exploration / Software [SECONDARY .lk]
- **Summary** [VERIFIED]: A visual tool that helps astronauts self-assess health during missions and guides treatment and improvement. The page frames it around the HRP's five hazards (radiation, isolation/confinement, distance from Earth, gravity fields, hostile closed environments). Any input (text, clicks, camera) and any data representing a health indicator (e.g. blood sugar in mg/dL, ultrasound images). Idea: a clickable human-body figure.
- **NASA Data & Resources** [VERIFIED]: Risks of Human Spaceflight https://www.nasa.gov/hrp/risks/ | Ongoing HRP Research in Space https://www.nasa.gov/hrp/ongoing-hrp-research/
- **Partner resources** [VERIFIED]: CSA Monitoring Radiation for Astronaut Health https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp | Why Do We Conduct Science Experiments in Space? https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp
- **Judge hints** [VERIFIED]: different environments (spacecraft, station, rover, base). Scheduled measurement prompts. Gamification. Dynamic charts. Color-coded status. Simple instructions, without assuming medical knowledge.
- **Data accessibility** [INFERRED]: EASY but thin. There is no NASA dataset, only reference pages, so data will be synthetic or user-entered, which weakens the "NASA data integral" score.
- **Crowd** [SECONDARY]: 280 hits (generic). Est. **H**.
- **Best-fit awards** [INFERRED]: Best Use of Technology, Galactic Impact.
- **Differentiator** [INFERRED]: hazard-linked thresholds cited from HRP risk pages, plus a camera-based measurement.

---
## Ranked table (under-served + feasible + award fit for a 4-tech / 1-business team) [INFERRED]
| Rank | Challenge | Crowd H/M/L | Data access | Best-fit awards | Key differentiator opportunity |
|---|---|---|---|---|---|
| 1 | Dancing with the SARs | L-M | Hard (NISAR via Earthdata/ASF) | Best Use of Data, Best Use of Science, Local Impact | Working NISAR change detection on a Chicago-area site (the brief explicitly invites a hometown study area) |
| 2 | Planet X and SPHEREx | L-M | Moderate-hard (IRSA FITS; tutorial notebooks) | Best Use of Data, Best Use of Technology, Global Connection | Spectra on the fly + URL embedding + Gaia overlay, demoed on all 5 test targets |
| 3 | Lunar Landing Site Navigator | M | Moderate (Horizons + LOLA) | Best Mission Concept, Best Use of Technology | Terrain-masked horizons and a schedule-slip comparison view |
| 4 | Harmonization of MODIS and VIIRS Hot Spots | M | Moderate (FIRMS easy; harmonization method hard) | Best Use of Data, Best Use of Science | Quantified cross-sensor harmonization with uncertainty |
| 5 | Be an Earth System Trend Detective! | M | Easy-moderate (Giovanni/AppEEARS) | Best Use of Science, Local Impact | Guided detective flow with deseasonalized Mann-Kendall |
| 6 | The Earth Information Jukebox | H | Easy (SVS frames, no login) | Art & Technology, Best Storytelling, Most Inspirational | Frame-pixel, per-layer sonification of the 11 listed visuals + real blind/low-vision testing |
| 7 | Earth analogs (Moon/Mars) | M | Moderate-hard (PDS/Diviner + Earth rasters) | Best Use of Science, Best Mission Concept | A similarity metric that finds a non-famous analog (the brief rejects Atacama/Iceland repeats) |
| 8 | Field Shift | M-H | Mixed (POWER/CDL easy; SMAP/ECOSTRESS hard) | Local Impact, Galactic Impact | Illinois field case comparing at least 3 rotations with uncertainty |
| 9 | Flame in Freefall | M-H | Moderate (PSI + documents) | Best Use of Technology, Galactic Impact | Structured parameter extraction plus a Moon Base O2 relevance rank |
| 10 | Martian Map | M-H | Moderate (Mars Trek) | Best Mission Concept, Art & Technology | Suit-mobility traverse planner as a HUD |
| 11 | Abandoned but Not Forgotten | M-H | Easy | Best Storytelling, Most Inspirational | First-person artifact narratives grounded in NSSDCA data |
| 12 | Junior Astronaut Mission Trainer | H | Easy (DONKI/RadLab) | Most Inspirational, Best Use of Data | Live space weather driving the core trade-off |
| 13 | Space Mission Design Game | H | Easy | Best Mission Concept, Best Use of Technology | True 4-role multiplayer with physics checks |
| 14 | Astronaut Health Monitoring | H | Easy but no NASA dataset | Best Use of Technology, Galactic Impact | HRP-hazard-linked thresholds |

Note: the Jukebox is crowded, but the crowd seems to sonify off-list time series. A team that executes the official brief (EIC frames, accessibility as the core, documented mappings) has a clearer route to Art & Technology than its rank suggests [INFERRED].
