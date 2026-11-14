# R1: Judge red-team of "Earthsound" (Earth Information Jukebox)

Written Sat 2026-11-14, about 33 h before deadline. Reviewer read `notes/idea-current.md`, `sources/jukebox.txt`, `sources/guide-judging.txt`, `01-winners-analysis.md`. Did not read `04-idea-verdict.md` or `00-SUMMARY.md`.

Tags: [VERIFIED] = read at the URL or in the file this session. [SNIPPET] = seen only in a search-result summary, page not read. [INFERRED] = my reasoning. [UNKNOWN] = could not establish.

**Verdict in one line:** a competent mid-pack entry with one good instinct (make the listener answer a question) attached to the wrong question (which place), an accessibility claim nobody blind has touched, and about twice the scope 33 hours allows.

---

## 1. Scores, as realistically built by 5 people in 33 h

The local guide file contains only the score-5 anchor text for each criterion [VERIFIED, `sources/guide-judging.txt`]. Scores below 5 are my interpolation against that wording [INFERRED].

| Criterion | Score | Reason against the rubric wording |
|---|---|---|
| Impact | 3 | Rubric 5 = "addressing a significant problem ... benefits a large audience". The problem (EIC is sight-only) is real and stated by NASA [VERIFIED, jukebox.txt]. But a 5-round quiz does not give a blind person access to the EIC data; it gives them a game about it. No BLV user is in the loop, so the benefit is asserted, not shown. |
| Creativity | 3 | Rubric 5 = "groundbreaking approach that has never been attempted before". Sound-only place guessing exists, NASA-data-to-music games exist, map-cursor sonification exists (section 5). The combination is fresh; no single part is. |
| Validity | 2 | Rubric 5 = "scientifically sound ... fully developed ... highly usable". Values are reverse-engineered from rendered frames via colorbar; the planned evidence (beat 25% chance, 5 blindfolded sighted people) does not test the claim being made (section 2, items 2 and 3). Stack is still undecided at T-33 h [VERIFIED, idea file]. |
| Relevance | 4 | Rubric 5 = "thoroughly engages with the challenge ... NASA data is integral". Uses the named EIC visuals and has a jukebox mode, so it is on-brief. Loses a point because the headline mode hides the visualization, while the objective asks for a visualization "alongside its corresponding soundscape" [VERIFIED, jukebox.txt]. |
| Presentation | 3 | Rubric 5 = "polished, structured, and highly effective". Nothing is planned for it in the idea file, and the format is 7 slides or a 30-second video [VERIFIED, guide]. An audio product is the hardest thing to sell in either. Could be a 4 with a dedicated owner starting now. |

Total about 15/25. A nominee from a competitive local event is usually 20+ [INFERRED].

---

## 2. The 8 strongest reasons it loses, ranked

**1. Scope is about 2x what fits, and the stack is undecided.**
The design lists: offline frame-to-grid pipeline with colorbar decoding for 6+ visuals, a per-layer synth, animation over time, explore mode, phone tilt, guess mode with a difficulty ramp, three hint types with a points economy, half-credit scoring, a year bonus round, reveal cards, tier names, share line, screen-reader support, visual mirror, a mapping table, and a listener test [VERIFIED, idea file]. Relevance asks whether it is "a complete solution" and the 2024 Science winner shipped plain HTML/JS in about 30 h by doing one thing [VERIFIED, 01-winners-analysis.md]. The likely outcome is every mode at 60% [INFERRED].

**2. "Guess the place" tests geography trivia and timbre memory, not data listening.**
To pick Lagos over Jakarta by ear, the player must already know how bright, how forested, and how stormy each one is, and must have memorised your mapping. That is prior knowledge plus an arbitrary code. And if the four options differ in environment type (ocean vs city vs forest), anyone beats 25% by recognising the instrument, which proves only that your timbres are distinguishable [INFERRED]. A subject-matter judge will see this in one question.

**3. The research says the task you picked is the one sonification is worst at.**
Sharif et al., W4A 2025 (106 screen-reader users surveyed, 12 interviewed): participants found sonification helpful for "an overview of data, particularly data trends" and not useful for granular understanding of complex visualizations, naming "geospatial maps" explicitly [VERIFIED, read pp. 160-161, https://faculty.washington.edu/wobbrock/pubs/w4a-25.01.pdf]. Separately, an EEG sonification study found untrained listeners at chance before training and significantly better after a short session [SNIPPET, https://pmc.ncbi.nlm.nih.gov/articles/PMC4195310]. Your design has no training step and asks for exact spatial identification.

**4. The accessibility claim has no blind person behind it.**
Same paper: 63% of surveyed screen-reader users had never encountered sonification in online visualizations, and only about half rated it at least "somewhat beneficial" [VERIFIED, same PDF]. Blindfolded sighted listeners are not a proxy for people who navigate by screen reader daily. See section 4.

**5. The crowd will all say the same sentence.**
The team's own estimate is 100+ repos on day 1 [VERIFIED as the team's claim, idea file; count itself UNKNOWN]. The challenge text names accessibility as "a core theme" [VERIFIED], so every entry will claim it. In 2023 roughly 10+ public sonification repos produced one winner [VERIFIED, 01-winners-analysis.md]. "Audio-first for blind users" is the entry fee, not the differentiator.

**6. The target award does not match the build.**
Global Connection is "the project that best connects people around the world through technology" [VERIFIED, guide]. The design is single-player with no leaderboard and no shared space; the only connective tissue is a date seed and a share line. The 2023 sonification winner did take this award [VERIFIED, 01-winners-analysis.md], but copying a three-year-old winner's angle with a weaker connection story is not a plan.

**7. The data path invites an awkward expert question.**
Only 3 visuals have flat maps (5313, 3912, GEDI 4950); the rest are globe or 3D renders [VERIFIED, idea file]. Decoding a colorbar from a lit, compressed, annotated render gives approximate values at best, and SVS images are not CORS-readable so nothing is live [VERIFIED, idea file]. If the slide says "physical values" a NASA judge may ask how accurate, and there is no answer [INFERRED]. The challenge itself only asks for frames-to-sound, so the fix is to claim less, not build more.

**8. It may simply not sound good, and the pitch format cannot carry it.**
The brief asks for "artistic, musically pleasing outputs" and warns that direct translation "might result in chaotic noise" [VERIFIED, jukebox.txt]. Four layered Web Audio synths driven by raw grids is how you get that noise. In NASA's own study, the synthetic-sounding piece had the widest spread of enjoyment ratings and respondents leaned toward instrumental sounds [VERIFIED, https://www.frontiersin.org/journals/communication/articles/10.3389/fcomm.2024.1288896/full]. Whether the team has anyone with audio skill is [UNKNOWN]. And a judge skimming 7 slides hears nothing.

---

## 3. Game framing: help or hurt?

**The game helps; this game hurts.** Making the listener answer a question is the single best idea here, because it turns "pretty sounds" into something with a right answer, which is what Validity needs. Games carrying real data also appear among winners every year 2023-2025 [VERIFIED, 01-winners-analysis.md].

**Will a judge call it a gimmick bolted on?** Yes, if the game is the front door and the jukebox is a side mode. The objective is a project "where individuals can select or experience a specific EIC visualization alongside its corresponding soundscape" [VERIFIED]. Guess mode hides the visualization by design. Flip the order: jukebox first, challenge as the thing you do inside each visualization.

**Is the place the right thing to guess?** No. Ask what the visualization is about, in a form answerable from the sound alone:

- **What changed** (best fit): play night lights 2012 then 2023 for a region. "Did it get brighter, dimmer, or stay the same?" The source visual is literally "Change in Night Lights between 2012 and 2023" [VERIFIED, jukebox.txt]. This is a trend question, the thing sonification is good at (item 3).
- **Which is more:** two short clips, "which place has the taller forest?" or "which water is warmer?"
- **Which phenomenon:** "Is this a western boundary current or open ocean?"

These need no geography knowledge, work identically for blind and sighted players, have honest chance levels (33% or 50%), and each answer is a science fact the reveal card can explain. Matching sound to image is worse: it requires sight. Keep one "name the place" round as a finale if it is free; do not build the product on it.

---

## 4. Accessibility: credible or performative?

**Performative as written.** Evidence:

- No blind or low-vision person designs, tests, or is quoted [VERIFIED, idea file].
- The validation is blindfolded sighted listeners.
- Phone tilt is described as "intended to work with VoiceOver" [VERIFIED, idea file], which means untested. iOS Safari needs a permission call from a user gesture before it delivers orientation events [SNIPPET, MDN via search]. WCAG 2.5.4 (Level A) requires any motion-operated function to also work through ordinary controls and to be disableable [VERIFIED, https://www.w3.org/WAI/WCAG22/Understanding/motion-actuation.html]. How tilt behaves with VoiceOver running is [UNKNOWN].
- NASA's own survey (3,184 responses) found the two main feedback themes were listeners misunderstanding what the sounds were and not understanding how sound related to the image; the authors conclude descriptions of the mapping should be central. It also had no comprehension test, self-report only, and the authors call the small BLV sample their biggest limitation [VERIFIED, Frontiers URL above].

**What makes it real in 33 h:**

1. **One real screen-reader user, today.** Post now to a blind-community forum or call a local blindness organisation and ask for a 20-minute remote session Sunday morning. One named tester with two changes made from their feedback beats every label you add. If nobody answers, say so on the slide; do not imply testing that did not happen.
2. **A 45-second spoken "learn the sounds" step** before any question: "This is dim. This is bright." Addresses the training finding directly.
3. **A "say the value" key** in explore mode that speaks the number and place ("night lights 62 of 100, up 30 percent since 2012"). The W4A interviewees asked for sonification combined with other modalities [VERIFIED].
4. **Run the whole thing yourselves with NVDA or VoiceOver, screen off,** start to finish. Fix focus order and live-region announcements. This is two hours, not a feature.

---

## 5. Prior art that makes it look derivative

| Prior art | What it is | Overlap |
|---|---|---|
| Arcobaleno, Space Apps 2023 | Sonification of NASA imagery for people with sight impairments; **won Global Connection** [VERIFIED, 01-winners-analysis.md] | Same angle, same target award |
| Face The Music (team Arc), Space Apps 2019 | Mobile web game that "translates NASA Earth climate data into music"; pick cities, song distorts with pollution; Tone.js; **Global Nominee only** [VERIFIED, https://2019.spaceappschallenge.org/challenges/living-our-world/1up-nasa-earth/teams/arc] | Game + NASA Earth data + music + places |
| Aria EarthMOOG, Space Apps 2018 | Pan a web map, pixel colours of NASA GIBS tiles become music in real time; **Global Nominee only** [VERIFIED, https://2018.spaceappschallenge.org/challenges/help-others-discover-earth/artify-earth/teams/aria-earthmoog/project] | Your explore mode, eight years earlier |
| SongSAT, Space Apps 2018 | MODIS land cover types each get a musical pattern; accessibility framing; Most Inspirational [VERIFIED, 01-winners-analysis.md] | "Each layer has its own instrument" |
| EchoGuessr (Devpost), RadioGuessr, HearHere, Audio Geo-Localization Game | Sound-only "guess the location" games; HearHere is Wordle-style daily [SNIPPET, https://devpost.com/software/echoguessr returned 403; https://github.com/barryspacezero/RadioGuessr] | The guess-the-place loop |
| NASA Chandra "A Universe of Sound" | NASA's own sonification programme with a BLV survey [VERIFIED, Frontiers URL] | Judges know this work; cite it, do not pretend to precede it |

Read the middle two rows carefully: the two closest ancestors of this exact idea both stopped at nominee. No 2026 look-alike was found by search [UNKNOWN; projects are not indexed yet].

---

## 6. Honest probabilities

Base rates: 10 winners from 11,500+ submissions in 2025, about 0.09%; 45 finalists; 1-3 nominees per local event under the 2022 rules [VERIFIED, 01-winners-analysis.md]. Chicago's team count and number of nominee slots are [UNKNOWN], so the first number is soft. All figures [INFERRED].

| Stage | As planned | With the section 7 edits |
|---|---|---|
| Chicago Global Nominee | 15-20% | 30-35% |
| Global Finalist (unconditional) | about 1% | 2-3% |
| Global Winner (unconditional) | about 0.2% | 0.5-0.8% |

**Best award to aim at: Art & Technology** ("most effectively combines technical and creative skills" [VERIFIED, guide]). It describes what will actually exist on Sunday night, a data-driven musical game, and the 2025 winner of it was a set of mini-games [VERIFIED]. Global Connection is the precedent award, but it is where every accessibility-claiming entry in this challenge will point, and the build has no connection mechanic. If a real BLV tester comes through, Global Connection becomes a fair second.

---

## 7. The 5 highest-leverage edits

1. **Change the question from "where" to "what changed / which is more".** Three question types from section 3, two or three choices each, answerable from sound alone. Half a day of work, mostly content. This fixes items 2 and 3 and makes the listener test mean something.
2. **Cut to the 3 flat-map visuals (night lights 5313, sea surface 3912, GEDI 4950) and make the jukebox the landing page.** Image on screen, sound playing, cursor by arrow keys and drag, a "Challenge" button per visualization. Say "values estimated from the EIC frame's colour scale", not "physical values".
3. **Get one blind screen-reader user in the loop by Sunday noon,** plus the spoken tutorial and the say-the-value key (section 4). Start the outreach before writing more code.
4. **Replace the validity plan.** 8-10 listeners, eyes closed, the new questions, score before and after the 45-second tutorial. Report n, chance level, and both numbers on one slide, including if the result is bad. Two hours on Sunday afternoon.
5. **Give the business person the presentation now, full time.** One sentence with a named user and payoff; a 30-second captioned video built around one question the viewer answers by ear; dataset names and SVS IDs on screen; write the Art & Technology definition at the top of the script. Hold a feature freeze at Sunday 3 PM CT.

**Delete:** phone tilt and anything DeviceOrientation; the points economy, hint costs, half credit and tier names; the year bonus round; the similarity-based difficulty ramp; aerosols, CO2, lightning, atmospheric river and every globe render; any slide wording that implies blind users tested it if they did not. Keep the date seed only if it is the few lines it should be, and do not pitch "daily" as a feature.
