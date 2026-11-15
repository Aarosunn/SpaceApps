# Live capture of the official Space Apps site — 2026-11-14, 18:55–19:02 UTC (section 5 added about 20:40 UTC)

Captured by opening the pages in a real browser (the site refuses plain scripted requests: `curl` gets no TLS connection; a browser loads it normally).
Everything below is copied from the rendered pages. Nothing here is inferred.

## 1. Challenge page — https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/

Banner on the page: "The NASA Space Apps Challenge is happening now!"

**Official tags** (these were only known from a secondary source before):
- Difficulty: Intermediate; Beginner/Youth
- Subjects: Arts & Multimedia; Earth Science; **Software**

**Official one-paragraph summary** (this paragraph is NOT in `sources/jukebox.txt`, which starts at "Background"):

> NASA's Earth Information Center (EIC) produces stunning visualizations of our changing planet, but presenting Earth science through visualization alone limits who can reach it. We invite you to make this complex Earth science accessible, engaging, and multi-sensory by translating sight into sound. Your challenge is to build an "Earth Jukebox"—an interface, script, or application that pairs EIC visual frames with dynamic sonifications generated in real time.

Note the last five words: **"generated in real time"**. The Objectives section further down still allows "a curated collection of original, generated audio files".

The Background, Objectives and Potential Considerations sections on the live page match `sources/jukebox.txt` word for word (compared by reading both).

## 2. Resources tab — `?tab=resources`

Disclaimer shown above the list: "NASA does not endorse any non-U.S. Government entity and is not responsible for information contained on non-U.S. Government websites. For non-U.S. Government websites, participants must comply with any data use parameters of that specific website."

Exactly 11 resources, same names, same order and same links as `sources/jukebox.txt`. **No resources have been added.**

| # | Name on the page | Link on the page |
|---|---|---|
| 1 | Earth Information Center (EIC) Content Database | https://svs.gsfc.nasa.gov/gallery/earth-information-center/ |
| 2 | Data Sonification: Caldwell 73 | https://svs.gsfc.nasa.gov/13786/ |
| 3 | Change in Night Lights between 2012 and 2023 - EIC Version | https://svs.gsfc.nasa.gov/5313/ |
| 4 | Global Sea Surface Currents and Temperature | https://svs.gsfc.nasa.gov/3912/#media_group_349716 |
| 5 | GEOS Aerosols | https://svs.gsfc.nasa.gov/5669/ |
| 6 | Air Quality Model Runs | https://svs.gsfc.nasa.gov/5533/ |
| 7 | Perpetual Ocean 2: Western Boundary Currents | https://svs.gsfc.nasa.gov/5425/ |
| 8 | DYAMOND Global Carbon Dioxide | https://svs.gsfc.nasa.gov/5196/ |
| 9 | Lightning Events Detected from the ISS 2017-2023 | https://svs.gsfc.nasa.gov/5011/ |
| 10 | A 3D View of an Atmospheric River from an Earth System Model | https://svs.gsfc.nasa.gov/4960/ |
| 11 | GEDI Forest Height | https://svs.gsfc.nasa.gov/4950/ |

## 3. Registered teams per challenge — each challenge's `?tab=teams` ("Currently returning N teams")

Read between 18:57 and 19:00 UTC. These are teams that have selected the challenge on the official site, worldwide.
Teams can still change challenge before submitting, and a registered team is not a submitted project.

| Challenge | Registered teams | Share |
|---|---:|---:|
| **The Earth Information Jukebox** | **654** (653 on a second read 3 minutes later) | 3.1% |
| Dancing with the SARs | 760 | 3.6% |
| Harmonization of MODIS and VIIRS Hot Spots | 863 | 4.1% |
| Planet X and SPHEREx | 888 | 4.3% |
| Identify Earth Locations That Analog the Permanent Moon Base Locations and Mars | 1,017 | 4.9% |
| Flame in Freefall | 1,079 | 5.2% |
| Lunar Landing Site Navigator | 1,090 | 5.2% |
| Interplanetary Survival Guide: Martian Map | 1,284 | 6.1% |
| Be an Earth System Trend Detective! | 1,358 | 6.5% |
| Field Shift: Adapting Farms with NASA Data | 1,875 | 9.0% |
| Space Mission Design Game | 2,049 | 9.8% |
| Build a Junior Astronaut Mission Trainer | 2,063 | 9.9% |
| Abandoned but Not Forgotten (discarded equipment storytelling) | 2,838 | 13.6% |
| Create Health Monitoring Software for Astronauts on Space Missions | 3,061 | 14.7% |
| **Total** | **20,879** | 100% |

**The Jukebox has the fewest registered teams of all 14 challenges.** This contradicts `00-SUMMARY.md` ("Most crowded challenge", based on a noisy GitHub search).

## 4. Chicago local event — https://www.spaceappschallenge.org/2026/local-events/chicago/?tab=teams

"Currently returning 87 teams" (all 87 cards loaded and counted at 19:01:56 UTC; each card shows the team's chosen challenge).

| Chosen challenge | Chicago teams |
|---|---:|
| Create Health Monitoring Software for Astronauts on Space Missions | 16 |
| Planet X and SPHEREx | 10 |
| Interplanetary Survival Guide: Martian Map | 8 |
| Harmonization of MODIS and VIIRS Hot Spots | 7 |
| Abandoned but Not Forgotten | 6 |
| Be an Earth System Trend Detective! | 5 |
| Build a Junior Astronaut Mission Trainer | 5 |
| Field Shift: Adapting Farms with NASA Data | 5 |
| Space Mission Design Game | 5 |
| Identify Earth Locations That Analog the Permanent Moon Base Locations and Mars | 4 |
| **The Earth Information Jukebox** | **4** |
| Dancing with the SARs | 4 |
| Flame in Freefall | 4 |
| Lunar Landing Site Navigator | 4 |
| **Total** | **87** |

Not checked: whether our own team is one of the 4 Jukebox teams, and how many of the 87 will actually submit.

## 5. Project Submission Guide — https://www.spaceappschallenge.org/resources/project-submission-guide/

Read in the browser on 2026-11-14 at about 20:40 UTC. The page is dated November 13, 2026. Points below are paraphrased from the rendered page; short phrases in quotation marks are the page's own words.

**Deadline**
- Submission opened Sat Nov 14 at 9:00 a.m. and closes Sun Nov 15 at 11:59 p.m., both in the time zone of the team's Local Event. Universal Event teams use the Team Owner's local time.
- Projects saved or submitted after the deadline are not eligible for judging.
- Local judging and awards times "may differ from the global submission times": ask the Local Lead.
- The project can be edited and resubmitted until the end of the hackathon; only the last saved submission is reviewed.

**Form fields, in page order**
Project Name; High-Level Project Summary; Link to Project Demo; Link to Final Project; Detailed Project Description; Use of Super Intelligence (SI); NASA Data; Space Agency Partner Data and Other References. Then two checkboxes (Terms and Conditions; Confirm All Work is Original) and "Submit for Judging".

**Demo**
- A video of 30 seconds or less, or a slide deck of up to seven slides including the title and intro slides.
- Projects that exceed these limits are not eligible for Global Judging.
- Host it externally with a public link (no password, permission or registration). It cannot be uploaded to the Space Apps site. The project page itself accepts only images (JPG, PNG, GIF up to 10 MB).
- English only; a video spoken in another language needs English subtitles.
- Suggested 30-second outline: names, challenge, project title, how it works, what it could become.

**Super Intelligence (SI), the site's 2026 word for AI**
- SI tools (machine learning, chatbots, image generation, large language models) are permitted as a way to speed the work up. SI should not be used to come up with the idea of how to solve the challenge.
- Teams must show where and how SI was used. Images and videos: a visible watermark. Audio, code and data: an acknowledgment in descriptive text and metadata.
- Generated content may not use, contain or modify NASA branding or design elements.
- The answer typed in the SI field is for data collection and is not seen by the judges. Judges do see SI indicators inside the project (watermarks, descriptive text, metadata).

**Eligibility**
- All team members must be confirmed participants at the same Local Event.
- All required fields completed, all content in English.
- To be eligible for a Global Award a project must use at least one NASA data source or resource.
- No images, video, audio or likeness of anyone under 18.

**Links**
- Both the demo and the final project must open with no login. Test them in a private browser window.
- For a newly created website the guide recommends (does not require) requesting a FortiGuard Web Filter Classification so judges can reach it.

**References field**
- List all data, resources and tools used, including code, text and images that are open source or free. Copyrighted material needs permission.

## How to repeat this

Open the URLs above in a normal browser. The team list loads 20 cards at a time as you scroll to the bottom.
