# 07 - Accessibility for blind and low-vision listeners, and a quick, honest listening test

> Status: researched 2026-11-14 with live sources by its author. The independent fact-check pass did NOT complete (see README.md). Treat licence, citation and version claims as unconfirmed until you open the cited source.

## TL;DR

- NASA's own evidence is Arcand et al. 2024: 3,184 survey respondents heard three Chandra sonifications (data turned into non-speech sound); most agreed they enjoyed them, learned something and trusted them. It is self-report from a convenience sample, and the authors name the small number of blind and visually impaired (BVI; some papers write BLV, blind or low vision) respondents as their biggest limitation. Cite it as "positive response", never as "proof that blind people can read data by ear".
- Performance studies say sonification is good for overview and trends, weak for exact values and for many simultaneous layers, and that listeners need a short training. Blind and sighted listeners can even disagree on which direction of pitch means "more".
- Text is the first accessibility feature, sound the second. Every visualization needs a short alt text, a long description, a data summary and a mapping legend. SVS alt text cannot be relied on: in the local crawl it is empty for 7.5% of media items, including every item on two of the challenge's featured pages.
- The accessible web app is boring on purpose: native buttons and sliders, audio only after a user action, a Stop key, an in-app volume control, one live region for announcements, and one keyboard "probe" for a flat map.
- On phones, a screen reader swallows finger drags (the WebKit bug asking for direct touch is still open) and vibration works on Android only, not on iPhone. Build step buttons; treat haptics as a bonus.
- Listening test: 12 four-choice trials per person (chance 25%). One person beats chance at 7 of 12 or better. Worked example: 8 of 10 correct against 25% chance gives a one-sided exact p of 0.0004; against 50% chance the same 8 of 10 gives p = 0.055, which is not significant. So use four choices.
- Sighted people who cannot see the screen show that the mapping is learnable by ear. They do not show that the app is accessible to BVI users. Only screen-reader users testing the real app can support that, and the big community channels require prior approval (an ethics board or instructor for the National Federation of the Blind's list, the editors for AppleVis) before they circulate a study.
- Automated checkers (axe, Lighthouse, WAVE) find a little over half of real issues (57 percent by volume in Deque's own data) and none of the audio-versus-speech problems. Ten minutes with NVDA, a free screen reader, finds most of the rest.

## Decisions for the Jukebox build

Ranked by value per hour. Each line: what I would do, why, the trade-off.

1. **Write the words first: a listening guide plus four text blocks per visualization** (short alt, long description, data summary, mapping legend). Why: the challenge names rich descriptive text as an accessibility feature; Chandra's team writes a description for every sonification with BVI experts; blind readers in a study with 30 blind participants ranked statistics and trends as the most useful description content. Trade-off: about 20 minutes of careful writing per visualization, so ship 4 to 6 visualizations, not 94.
2. **Native HTML controls and user-triggered audio.** `<button>`, `<input type="range">`, radio inputs; no autoplay; a Stop button and Escape silence everything; an in-app volume slider. Why: native controls already satisfy name/role/value, and screen-reader speech is hard to hear over audio that starts by itself. Trade-off: less visual flair than custom knobs. Skip custom ARIA widgets unless a native element cannot do the job.
3. **One polite live region and "speak, then play".** Announce what is about to play, then start the sound. Why: status must reach assistive technology without moving focus. Trade-off: playback starts a beat later.
4. **Run the listening test with a pre-registered rule** (section 6): 12 four-choice clips, 8 to 12 listeners who cannot see the screen, plus as many BVI screen-reader users as you can reach respectfully, treated as paid design critics, reported separately. Why: published evaluation is rare in this field, so a small honest test is a real differentiator. Trade-off: three hours of the business member's Sunday and one teammate's Saturday evening for stimuli.
5. **Design the sound for listening without sight**: one consistent polarity, a click track for position, lowest and highest reference tones before each clip, each layer alone and then the mix, clips of 15 to 30 seconds, speed and loop controls. Why: these are the recurring findings of auditory-graph research and of Chandra's practice. Trade-off: slightly less "pure music".
6. **Keyboard map probe on one flat (equirectangular) visualization only**, for example Night Lights (SVS 5313). Why: it is the most convincing interactive accessibility feature and has research precedent. Trade-off: 2 to 3 hours, and it needs a precomputed value grid because browser JavaScript cannot read SVS pixels. Skip it for rotating-globe and camera-move animations, where latitude and longitude cannot be recovered from the frame.
7. **Low-vision and Deaf/hard-of-hearing basics**: contrast, visible focus, zoom to 200%, a visual legend and a live text line saying what the sound is doing, subtitles on the demo video. One to two hours total.
8. **Haptics: 20 minutes, Android only, never the only carrier of information.**

Skip entirely: `role="application"` on the whole page; Highcharts (proprietary licence, conflicts with the open-source rule); binaural/3D audio; voice commands; any iOS haptics hack; machine-written descriptions that no human checked (AI use must be declared anyway); the phrase "WCAG compliant" (say what you tested instead).

## Scope, tags and terms

Scope: how to make the Earth Information Jukebox usable without sight (and without hearing), which published evidence a pitch may cite, and a listening test the business member can run on Sunday in two to three hours. Web Audio mechanics are in 06-web-audio-live-sonification.md, mapping theory in 03-sonification-mapping-and-synthesis.md, runnable code in 08-recipes-python.md and 09-recipes-browser.md. Tags: (unverified) = not confirmed on a live page today; (judgment) = my design call, not a sourced fact.

- **BVI / BLV**: blind and visually impaired / blind or low vision. Same group; NASA and the papers use both.
- **Screen reader**: software that reads the page aloud and lets a blind user move through it by keyboard or touch gestures. NVDA and JAWS (Windows), Narrator (built into Windows), VoiceOver (Apple), TalkBack (Android).
- **WCAG**: Web Content Accessibility Guidelines, the W3C standard. Each testable rule is a "success criterion" (SC).
- **ARIA**: HTML attributes (`role`, `aria-*`) that tell a screen reader what a custom widget is and what state it is in. The APG (ARIA Authoring Practices Guide) is W3C's cookbook of widget patterns.
- **Live region**: an element whose text changes are spoken automatically by the screen reader.
- **Polarity**: the direction of a mapping. Positive: more data gives a higher note. Negative: more data gives a lower note.
- **Forced choice, chance level**: the listener must pick one of k listed answers; pure guessing scores 1/k on average (25% for four options).
- **p-value**: the probability of a result at least as good as the observed one if listeners were only guessing. Small means guessing is an unlikely explanation.

## 1. What the evidence says

### 1.1 NASA's Chandra project "A Universe of Sound"

- Started in 2020 at the Chandra X-ray Center with NASA's Universe of Learning. Team per the project page: Kimberly Arcand (visualization scientist, lead), Matt Russo (astrophysicist and musician) and Andrew Santaguida (musician and sound engineer) of SYSTEM Sounds, and consultant Christine Malec, described there as an accessibility expert, podcaster and member of the blind community.
- Practices described by Arcand in a 2021 Chandra Q&A: no single template (each sonification is designed for its data); every release carries a written description prepared with BVI experts including J.J. Hunt and Christine Malec, intended as a road map of the sounds; testers ranged from students to BVI adults; the team also built a simpler app and a vibration-based technique.
- From a 2025 Astronomy.com feature: Malec prefers simpler sonifications because they are easier to follow; listeners need a legend (what maps to pitch, which way the scan moves); short pieces reduce load; astronomer Wanda Diaz-Merced prefers hearing the sound before any description so the description does not bias her.
- A design detail worth copying, from the paper's stimulus table: the Galactic Center piece is four clips of about a minute each, three single-telescope layers and then one composite.

### 1.2 Arcand et al. 2024 in numbers

Citation: Arcand, Schonhut-Stasik, Kane, Sturdevant, Russo, Watzke, Hsu, Smith. "A Universe of Sound: processing NASA data into sonifications to explore participant response." Frontiers in Communication 9:1288896, published 13 March 2024, DOI 10.3389/fcomm.2024.1288896, open access (CC BY).

| Item | As published |
|---|---|
| Method | Online survey (SurveyMonkey), open 4 weeks from 24 February 2021, convenience sample recruited through Chandra and Astronomy Picture of the Day channels, no payment |
| Sample | 4,346 responses collected, 3,184 kept after cleaning |
| BVI respondents | Count is not in the main text (it is in an appendix I could not retrieve); the paper says the group was much smaller than the sighted group |
| Stimuli | Three sonifications with video and text description: Galactic Center, Cassiopeia A, Chandra Deep Field South, always in that order (no counterbalancing) |
| Questions | Five agree/disagree items (1 to 5) after each piece: enjoyment, learned more about the object, sound enhanced the experience, video enhanced it, trust that the piece is faithful to the science data; three closing items; up to three emotion words; two open questions |
| Analysis | Two-sided Kolmogorov-Smirnov tests comparing BVI and sighted answer distributions |
| Enjoyment | Majority chose 4 or 5; no BVI/sighted difference (p of 0.62 or higher) |
| Learning | Most felt they learned something; BVI respondents reported more, significant for Cassiopeia A only (p = 0.0241; the other two p = 0.1664 and 0.0915) |
| Trust | No group difference (p = 0.9315, 0.9998, 0.9999) |
| Closing items, sighted group | Of 2,203 sighted respondents, 1,708 agreed they were motivated to listen to more, 1,798 that they wanted to learn more about the Universe, 1,710 that they wanted to learn how others access such information (77.5%, 81.6%, 77.6% by my arithmetic) |
| Closing items, group difference | Significant for wanting to learn more about the Universe (p = 0.0470) and about how others access information (p = 0.0337); not for wanting to listen to more (p = 0.2156) |
| Emotion words | curious/curiosity 329, calm 326, interesting 243, relaxed/relaxing 216, amazed 169, wonder 168, beautiful 133, peaceful 132, awe 124; negative words were rare |
| Other findings | Respondents preferred instrumental over synthesized sounds; some believed the sounds were real recordings from space, which the authors say better explanation of the process would fix |
| Limitations stated | Convenience sample of people already interested in astronomy; possible social-desirability bias (authors rating their own work); few BVI respondents; US-heavy; learning self-reported, single exposure |

One line a pitch may quote: the authors conclude that science communicators are "failing to reach and communicate with BLV audiences" (Arcand et al. 2024).

### 1.3 Other evidence: where sonification helps and where it falls short

| Study | Participants | Task | Result | What it means for us |
|---|---|---|---|---|
| Walker and Nees 2011, "Theory of Sonification" (Sonification Handbook ch. 2, pp. 9-39) | review | auditory graphs | Mapping, polarity and scaling decide success. Pitch suits temperature; tempo less so; loudness is a poor carrier. Clicks help listeners keep their place. A repeating reference tone for the maximum value sharply improved value estimates; a tone for the starting value did not. Blind and sighted listeners gave opposite polarity for one mapping (rising pitch meant fewer dollars to blind listeners, more to sighted ones). Novelty is a barrier unless listeners are trained | Section 2 rules; test polarity with real users |
| Zanella et al. 2022, Nature Astronomy | 98 projects (as of Dec 2021) | field survey | Primary aim: public engagement 35.7%, research 25.5%, art 17.3%, BVI accessibility 13.3% (a further 22% as secondary aim), education 8.2%. Few published quantitative evaluations, no standards, uncertainty almost never sonified | A measured test is rare, hence valuable |
| Misdariis et al. 2022, Nature Astronomy | about 50 experts, 2021 workshop | guidance from sound scientists | People detect pitch changes of about 0.8% (musicians) or 1.9% (non-musicians), and remember pitch sequences far better than loudness sequences; auditory short-term memory is about 2 to 4 seconds; +10 dB is about twice as loud at 1 kHz; rough, sharp, loud sounds are unpleasant; identification tasks are a standard evaluation method | Pitch for the main variable; short, replayable clips; our test type is standard |
| Tucker Brown et al. 2022, MNRAS 516, 5674 (Astronify) | 192 sighted respondents: 118 experts, 38 non-experts, 36 partial | count 0, 1 or 2 dips in a light curve as plot, sound, or both | Strong signals (SNR 30 and 100) by sound alone: experts 91% and 100%, non-experts 85% and 85%. Medium signals (SNR 7 and 10 combined) by sound alone: 26% and 25%, versus 70% for experts with plots. Respondents with vision impairment were too few (1 to 3 per survey) and were excluded | Sound carries strong patterns; subtle ones need training; BVI people are under-sampled even in accessibility-motivated work |
| Guiotto Nai Fovino, Zanella, Grassi 2024, AJ 167, 150 | not confirmed | detect a dip in 160 simulated light curves, plot versus three sound mappings | Above chance by ear; plots better overall; with sound, listeners were more willing to say a signal was present (a more liberal response bias) | Include some trials with no feature |
| Delogu et al. 2010, Disabil. Rehabil. Assist. Technol. 5(3), 164-174 | 35: 10 congenitally blind, 10 with acquired blindness, 15 blindfolded sighted | explore a sonified map by keyboard or tablet, then pick the matching tactile map out of four | High accuracy on all four tasks; no significant difference between the three groups or between keyboard and tablet | Direct precedent for a keyboard map probe and a four-choice test |
| Zhao et al. 2008, ACM TOCHI 15(1) (iSonic) | 7 blind users, 42 hours of case studies | maps and tables by keyboard | Users found facts and trends in geographic data | Patterns in section 5 |
| Sharif et al. 2021, ASSETS | 36 screen-reader users, 36 others | read online charts | Screen-reader users were 61.48% less accurate and took 210.96% more time | The size of the gap |
| Sharif et al. 2025, W4A, pp. 160-171 | 12 interviews (a secondary review also reports a 106-person survey) | when is sonification useful | Good for overview and trend; poor for many categories and for few data points; wanted alongside text and tables, with adjustable pitch and speed and an explanation of the sounds | Pair sound with text; expose controls |
| Siu et al. 2022, CHI | 16 screen-reader users | description then sound, versus short description and sound segments interleaved | Interleaved "audio data narratives" produced more insights | Offer a narrated tour mode |
| Bellona et al. 2024, ICAD (Accessible Oceans) | BVI students and teachers; three test sites | ocean data for museums | Sonifications must be framed by spoken context; the principal investigator is blind | Earth-science precedent |
| Lundgard and Satyanarayan 2022, IEEE TVCG 28(1) | 30 blind, 90 sighted readers | rank kinds of chart description | Both groups liked statistics and trends; blind readers ranked domain commentary among the least useful, sighted readers ranked it highest; a description of how the chart is drawn, on its own, helped neither group | How to write descriptions |

Numbers for Tucker Brown, Delogu, Zhao, Sharif and Siu come from abstracts or automated summaries, not full-text reading; re-check before putting one on a slide.

## 2. Design rules for a sonification people can follow without sight

| # | Rule | Do this in the Jukebox | Basis |
|---|---|---|---|
| 1 | Say the mapping before the sound | A listening guide of 60 to 80 words (text, plus an optional "Read aloud" button), and a toggle to hear the sound first | Chandra descriptions; Bellona 2024; Arcand's "real sounds from space" misconception; Diaz-Merced's preference |
| 2 | Give the ear an axis | A soft click at fixed steps (every year, or every 30 degrees of longitude); in one study, clicks at twice the rate of the data notes combined with them like major and minor tick marks | Smith and Walker 2005 via Walker and Nees |
| 3 | Give a scale | Play the lowest and the highest possible note before the clip; offer a key that replays the maximum tone | Reference-tone finding in Walker and Nees |
| 4 | Pitch carries the main variable; loudness does not | Map value to scale degree; use loudness only for emphasis. Check: one semitone is a frequency ratio of 2^(1/12) = 1.0595, a 5.9% step, about three times the 1.9% a non-musician can detect, so neighbouring scale notes are safely distinguishable | Misdariis 2022; Walker and Nees |
| 5 | One polarity everywhere, stated out loud | "Higher note = more" for every variable; for diverging colour scales (more/less than a baseline) carry the sign with a second instrument, the size with pitch | Polarity findings; Desmos uses a noise texture for negative values |
| 6 | Short and replayable | Clips of 15 to 30 seconds (judgment), loop, speed 0.5x to 2x, step forward/back | 2 to 4 second auditory memory |
| 7 | Few streams at a time | Each layer alone, then the mix; mute/solo per layer; at most three simultaneous layers (judgment) | Chandra Galactic Center structure; Malec's preference for simplicity |
| 8 | Instruments over raw synth tones | Use instrument-like timbres; avoid harsh, rough sounds | Arcand 2024; Misdariis 2022 |
| 9 | Events get their own sounds | Short earcons (brief non-speech signals) for start, end, map edge, coastline, "no data"; never reuse a data timbre | Walker and Nees on earcons |
| 10 | Redundancy | Everything the sound says is also in text; nothing essential is carried by stereo position, colour or vibration alone | WCAG 1.3.3 and 1.4.1; single-sided hearing and mono phone speakers |
| 11 | The listener controls it | Speed, loop, layers, in-app volume, optional pitch-range setting | Chart2Music exposes lower/upper frequency and speed; Zanella 2022 |
| 12 | Overview first, detail on demand | Auto-play the whole sweep, then let the user step or probe | iSonic; Chart2Music; SAS scan and explore modes |

### 2.1 Listening guide template

Order: what and when; the shape of the picture; direction and duration of the scan; what pitch means; what each instrument means; what the clicks mean; then the two reference tones. Illustrative example (the mapping must match what your code really does):

> Night lights, 2012 to 2023. A flat world map. The sound sweeps from west to east, the Americas first, Asia last, in twenty seconds. Higher notes mean brighter lights. A soft click marks every thirty degrees of longitude. First the darkest value, then the brightest.

### 2.2 Describing Earth-science imagery in text

Per visualization, in the page text (not only in attributes):

1. **Short alt** (one sentence): what it is, where, when. W3C's complex-image guidance asks for a two-part alternative: a short description that also says where the long one is, then the long description.
2. **Long description**: (a) view: flat map, globe, or camera move, and what is at the edges; (b) the colour scale in words with units and direction; (c) two to four main patterns with place names or compass directions, the extremes with numbers, and how it changes over time; (d) a caveat that the sound is computed from the colours of the rendered frame, not from the original measurements.
3. **Data summary**: a small table or list (minimum, maximum, where, when). Tables keep their structure for screen readers if they are real `<table>` elements; `aria-describedby` flattens its target into one paragraph, so use it only for plain text.
4. **Mapping legend**: the listening guide as a list.
5. **Credits** for the SVS page (also required by the references rule).

Style rules from audio-description and image-description practice (DCMP Description Key; NCAM/DIAGRAM guidelines): present tense, active voice, objective wording, brevity, data before decoration, consistent terms, directions as compass points or clock positions, name a thing before defining it, and do not talk over essential audio.

Why you must write your own. Local crawl of the SVS API for the 94 EIC pages (1,753 media items carrying an `alt_text` field; keyword counts are a crude heuristic):

| Measure | Result |
|---|---|
| Empty alt text | 132 items (7.5%) |
| Pages where every alt text is empty | 6, including GEOS Aerosols (5669) and Air Quality Model Runs (5533), both on the challenge resource list |
| Alt text about file sizes, resolutions, downloads or YouTube | 292 items (16.7%) |
| Alt text containing any colour word | 359 items (20.5%); only 34 of 94 pages have one |

Some are good (Night Lights 5313 explains that purple means more light and orange less). Because browser JavaScript cannot call the SVS API (fixed CORS header), copy the page descriptions at build time into your own JSON and edit them by hand.

## 3. Web accessibility for an audio-centred app

### 3.1 WCAG 2.2 success criteria that apply

WCAG 2.2 is a W3C Recommendation (current dated version 12 December 2024). Levels: A is the minimum, AA the usual target, AAA optional. Requirements below are paraphrased.

| SC (level) | Requirement in short | In the Jukebox |
|---|---|---|
| 1.1.1 Non-text Content (A) | Every image, control and media item has a text alternative; for time-based media or a purely sensory experience, at least a descriptive label | Alt text for frames; name every clip |
| 1.2.1 Audio-only and Video-only, Prerecorded (A) | Prerecorded audio-only needs a text alternative with equivalent information; video-only needs that or an audio track | A text summary per rendered clip; the long description covers silent SVS video |
| 1.2.2 Captions (A), 1.2.3 and 1.2.5 Audio Description (A, AA) | Video with audio needs captions; its visuals need audio description or a full text alternative | Subtitles on the demo video; captions that describe the music, for example [low strings rise]; the long description is your media alternative |
| 1.3.1 Info and Relationships (A) | Structure is in the markup, not only in looks | Headings, lists, real tables, `<label>` |
| 1.3.3 Sensory Characteristics (A) | Instructions do not rely only on shape, colour, position or sound | Not "press the green button", not "wait for the chime" |
| 1.4.1 Use of Color (A) | Colour is never the only signal | Selected track also has text or an icon |
| 1.4.2 Audio Control (A) | Audio that plays automatically for more than 3 seconds needs pause/stop or its own volume control | Do not autoplay at all (W3C technique G171: play sounds only on user request) |
| 1.4.3 Contrast Minimum (AA) | Text 4.5:1; large text (18 pt, or 14 pt bold) 3:1 | Check text over imagery too |
| 1.4.4 Resize Text (AA), 1.4.10 Reflow (AA) | Works at 200% text size; no two-way scrolling at 320 CSS px width | Test with Ctrl and plus |
| 1.4.11 Non-text Contrast (AA) | Control boundaries, states and meaningful graphics 3:1 | Slider track, focus ring, probe cursor |
| 1.4.7 Low or No Background Audio (AAA) | For speech recordings, background at least 20 dB below the voice, or switchable off | Benchmark for ducking music under narration |
| 2.1.1 Keyboard (A), 2.1.2 No Keyboard Trap (A) | Everything works from the keyboard; focus can always leave | Probe: Tab leaves |
| 2.1.4 Character Key Shortcuts (A) | Single-letter shortcuts can be turned off, remapped, or work only while the component has focus | Letter keys only while the probe is focused |
| 2.2.2 Pause, Stop, Hide (A) | Anything that moves by itself for more than 5 seconds next to other content can be paused | Pause for animation and video |
| 2.3.1 Three Flashes (A) | Nothing flashes more than three times a second | Check the lightning visualization before looping it (not measured) |
| 2.4.3 Focus Order (A), 2.4.7 Focus Visible (AA), 2.4.11 Focus Not Obscured (AA, new) | Logical tab order; visible focus; a sticky bar must not hide the focused control | Watch a fixed player bar |
| 2.5.7 Dragging Movements (AA, new) | Anything done by dragging can be done without dragging | Step buttons beside any drag-to-probe |
| 2.5.8 Target Size Minimum (AA, new) | Targets at least 24 by 24 CSS px (AAA 2.5.5 asks 44 by 44) | Use 44 px on touch |
| 3.2.1 On Focus, 3.2.2 On Input (A) | Focusing or changing a control does not unexpectedly change context | Selecting a track does not start sound or move focus |
| 4.1.2 Name, Role, Value (A) | Every control exposes name, role and state; native HTML controls do this already | Prefer native elements |
| 4.1.3 Status Messages (AA) | Status text reaches assistive technology without taking focus | One live region (3.3) |

### 3.2 Which control for which job (WAI-ARIA Authoring Practices, APG)

| Job | Use | Keyboard and ARIA facts from the APG |
|---|---|---|
| Play, Stop, next track | `<button>` | Space or Enter activates; after an action that does not close anything, focus stays on the button |
| Play/Pause, Mute | Toggle button | Either `aria-pressed` with a label that never changes ("Mute", pressed), or a label that changes ("Play" to "Pause") without `aria-pressed`. Not both |
| Speed, volume, position | `<input type="range">` | Arrows change by one step, Home/End jump to the ends, Page Up/Down take larger steps; add `aria-valuetext` such as "1.5 times speed" or "8 of 20 seconds". The APG warns that touch screen readers may not operate ARIA sliders, so add plus and minus buttons |
| Choose a visualization | A list of buttons or native radio inputs; `role="listbox"` only if needed | Listbox: Up/Down move, Home/End recommended, options cannot contain other controls, long names are read as one unit |
| Sections (Listen, Describe, About) | Headings on one page; tabs only if space forces it | Tabs: arrows move between tabs, Tab enters the panel, `aria-selected`, `aria-controls`; activate on focus only if panels are already loaded |
| Custom composite widget | Roving tabindex or `aria-activedescendant` | Exactly one tab stop; arrows move inside. Avoid shortcuts using Insert or Caps Lock (screen-reader modifier keys) and browser or OS combinations |

### 3.3 Announcements and focus

Put one empty region in the initial HTML and only change its text later (screen readers announce changes, not initial content):

```html
<div id="live" role="status" aria-live="polite" aria-atomic="true"></div>
```

- `polite` waits for the screen reader to finish; `assertive` interrupts, so keep it for errors such as "Audio could not start".
- Announce events, not streams: "Playing Night Lights, 20 seconds", "Paused at 8 seconds", "Aerosol layer muted". A time readout that ticks every second must not live in this region; the position slider's `aria-valuetext` already tells users where they are when they ask.
- Never let focus drop to the page body: after closing a help dialog return focus to the button that opened it; after choosing a track leave focus where it was.

### 3.4 Keeping the app's audio and the screen reader's speech apart

1. **User-triggered playback only.** This satisfies 1.4.2 and matches browser autoplay rules, which block Web Audio until the user has interacted (see 06).
2. **Speak, then play.** Update the live region, then start the sound about a second later (judgment), or let the Play button's own label say what will play.
3. **An obvious, global stop.** A Stop button early in the tab order and the Escape key. Muting the whole computer would also mute the screen reader, which is why WCAG asks for a control that is independent of system volume.
4. **In-app volume.** Screen-reader users often run speech and media through the same output.
5. **Duck your own narration.** If the app speaks through the browser's speech synthesis or a recording, drop the music by 20 dB while it speaks (amplitude times 0.1, since 10^(-20/20) = 0.1), then restore it. NVDA users can make NVDA duck other audio themselves (NVDA+Shift+D cycles the mode; installed copies only).
6. **Keep both: text for screen readers, voice for everyone else.** Screen-reader users set their own voice and speed, often very fast, so the guide must exist as DOM text. Offer "Read the guide aloud" as an optional button, off by default, for low-vision and sighted users.

```js
// API names not re-checked today; see 06-web-audio-live-sonification.md
const u = new SpeechSynthesisUtterance(guideText);
u.onstart = () => musicGain.gain.setTargetAtTime(0.1, ctx.currentTime, 0.05); // -20 dB
u.onend   = () => musicGain.gain.setTargetAtTime(1.0, ctx.currentTime, 0.2);
speechSynthesis.speak(u);
```

### 3.5 Keyboard map probe

Idea: a cursor moves over a coarse grid laid on the frame; each move plays a tone for the cell's value and then speaks position and value. Precedents: iSonic (arrow keys between regions, numeric keypad as a 3 by 3 zoom), Delogu 2010, SAS Graphics Accelerator's map mode.

- **Grid and coordinates.** For a full-globe equirectangular frame (longitude linear in x, latitude linear in y) with `NC` columns and `NR` rows, the cell centre is `lon = -180 + (c + 0.5) * 360 / NC` and `lat = 90 - (r + 0.5) * 180 / NR`. Example with 12 by 6 cells (30 degrees each): column 7, row 1 gives lon = -180 + 7.5 x 30 = 45 (east), lat = 90 - 1.5 x 30 = 45 (north). For globes and camera moves, announce screen position instead ("row 2 of 6, column 3 of 12, upper left") or hand-written region names.
- **Values.** The page cannot read SVS pixels (tainted canvas), so ship a small JSON grid per frame computed offline by the Python pipeline (08) and served from your own origin.
- **Why `role="application"`.** In a screen reader's browse mode, arrow keys read the page and never reach your script. `role="application"` on the probe element makes the screen reader pass keys through while focus is inside. MDN's advice: use it only when no standard widget fits, on the smallest possible container, never on `<body>`; you then own all keyboard handling, announcements and the way out. Chart2Music does exactly this (application role, `tabindex="0"`, a status live region).
- **Sound first, speech when the user pauses.** Play the tone at once; write to the live region only after about 250 ms without a key press (judgment), so holding an arrow key gives a run of tones and one sentence at the end, not a queue of stale speech.

```html
<p id="probe-help">Map probe. Arrow keys move one cell. Space repeats the tone. Tab leaves the map.</p>
<div id="probe" role="application" tabindex="0" aria-label="Night lights map probe" aria-describedby="probe-help"></div>
```

```js
const probe = document.getElementById('probe'), live = document.getElementById('live');
const NC = 12, NR = 6; let c = 0, r = 0, timer;
probe.addEventListener('keydown', (e) => {
  if (e.key === ' ') { e.preventDefault(); return playTone(grid[r][c]); }
  const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (!d) return;                                  // Tab, Escape and everything else pass through
  e.preventDefault();
  const nc = c + d[0], nr = r + d[1];
  if (nc < 0 || nc >= NC || nr < 0 || nr >= NR) return edgeEarcon();
  c = nc; r = nr;
  playTone(grid[r][c]);
  clearTimeout(timer);
  timer = setTimeout(() => { live.textContent = describe(r, c, grid[r][c]); }, 250);
});
```

`grid`, `playTone`, `edgeEarcon` and `describe` are yours to supply (09-recipes-browser.md is the place for them). A workable tone for a value `v` between 0 and 1: frequency `220 * 8 ** v` Hz, which spans three octaves from 220 Hz to 1760 Hz (v = 0.5 gives 622 Hz) so that equal data steps sound like equal musical steps; duration 150 to 250 ms (judgment); stereo pan from -1 (left) to +1 (right) by column as a redundant cue for longitude. A good announcement is short and puts place before number: "45 north, 45 east. Brightness high, 62 percent." Also provide four visible step buttons (Up, Down, Left, Right) that call the same code: they serve touch users, switch users and phone screen readers.

### 3.6 Phones: touch exploration and haptics

- **Without a screen reader**: pointer events on the image give drag-to-explore; add the step buttons anyway (2.5.7).
- **With VoiceOver or TalkBack on**: the screen reader takes over touch (touch speaks an item, double-tap activates it), so a continuous finger drag does not reach your page. A WebKit bug asking for direct touch on `role="application"` elements, filed in August 2023 by someone building an audio map, was still open (status NEW) when fetched today. Design for swipe-and-double-tap: step buttons, a "Play row" button, and a short list of named regions.
- **Vibration API**: `navigator.vibrate(30)` (milliseconds) or a pattern array `[100, 30, 100]` (vibrate, pause, vibrate). It needs a prior user interaction, only switches the motor on and off for given durations, and can be suppressed by silent or do-not-disturb modes. Support per caniuse data fetched today: Chrome, Edge, Opera, Samsung Internet and Chrome for Android yes; Safari on macOS and iOS no; Firefox no (desktop since version 129, and Android). MDN labels it limited availability, not Baseline. A known iPhone workaround (toggling a hidden switch-style checkbox) is reported by its own library to have been patched in iOS 26.5 (unverified).
- **Recommendation**: `if ('vibrate' in navigator) navigator.vibrate(30);` when the probe crosses a boundary (coastline, threshold, map edge). The challenge text names tactile feedback, so say plainly in the README that it is Android-only.

### 3.7 Low vision, motion, and Deaf or hard-of-hearing users

- **Low vision**: 4.5:1 text and 3:1 control contrast; a thick focus ring; layouts that survive 200% zoom and a 320 px wide viewport; 44 px targets; state shown by text or shape as well as colour; use `currentcolor` for borders so they survive Windows high-contrast mode (APG seek-slider example).
- **Motion**: respect `prefers-reduced-motion: reduce` (Baseline since January 2020) by not starting animations or visualizers automatically, and always provide Pause.
- **Deaf and hard-of-hearing users** make the tool multi-sensory in the other direction: a visual legend of the mapping; a moving cursor on the frame showing where the sound is; a one-line live caption of what the sound is doing ("pitch rising: brighter"); per-layer level meters; a text transcript of any spoken guide (W3C: a descriptive transcript is what Deaf-blind users need); subtitles on the 30-second demo video (also a Space Apps rule).

## 4. Testing in a hurry

### 4.1 Ten-minute screen-reader smoke test

Test NVDA with Chrome first. In WebAIM's Screen Reader User Survey #10 (December 2023 to January 2024, 1,539 respondents) primary desktop screen readers were JAWS 40.5%, NVDA 37.7%, VoiceOver 9.7%; NVDA with Chrome was the main combination for 21.3% and JAWS with Chrome for 24.7%; 91.3% also use a mobile screen reader, on iOS for 70.6% and Android for 27.6%; 71.6% start a long page by jumping between headings. NVDA is free and open source (GNU GPL version 2 or later, per its user guide); the current user guide is for NVDA 2026.3.1 on 64-bit Windows 10 and 11.

| Step | Do | Pass if |
|---|---|---|
| 0 | Put the mouse away. Start NVDA (Ctrl+Alt+N). In the NVDA menu (NVDA+N; the NVDA key is Insert by default, Caps Lock if enabled), Tools, turn on Speech Viewer to read what is spoken. Control silences speech | NVDA talks |
| 1 | Load the page | The title names the app |
| 2 | Press H repeatedly, then D | Headings give a sensible outline; landmarks exist |
| 3 | Press Tab through the whole page | Every stop is announced with a name and a role ("Play Night Lights, button"); order is logical; focus is always visible; nothing is skipped; you never get stuck |
| 4 | Press Enter on Play | Sound starts only now; "Playing ..." is spoken once; you can still understand NVDA over the music |
| 5 | Press Escape, then the Stop button | Silence at once, both ways |
| 6 | Arrow keys on each slider | You hear a meaningful value, not "0.5" |
| 7 | Tab to the probe, use the arrows, hold one down, then Tab | Instructions are read; each move gives a tone, then one sentence; no backlog; Tab leaves |
| 8 | Read downward (NVDA+Down Arrow reads continuously) | The guide and long description make sense without the picture |
| 9 | Zoom to 200% (Ctrl and plus) | Nothing is cut off or overlapping |
| 10 | Quit (NVDA+Q). Repeat steps 3 to 5 on a phone | Swipe right moves between controls, double-tap activates |

Starting the others: Narrator is Windows logo key + Ctrl + Enter; VoiceOver on Mac is Command-F5; VoiceOver on iPhone is Settings, Accessibility, VoiceOver, or ask Siri (set up the Accessibility Shortcut first so you can turn it off again); TalkBack is holding both volume keys for a few seconds or Settings, Accessibility, TalkBack. NVDA's browse/focus toggle is NVDA+Space.

### 4.2 Automated checkers and what they cannot catch

- **axe DevTools** (Deque browser extension, built on the open-source axe-core engine), **Lighthouse** (in Chrome DevTools; its accessibility score is a weighted average of pass/fail audits based on axe rules; manual checks are not in the score), and **WAVE** (WebAIM; web tool and Chrome, Firefox and Edge extensions).
- Deque's own coverage report found automated tests caught 57.38% of the issues in its audit data set (more than 13,000 pages, about 300,000 issues). Criteria with no automatic detections there include Focus Order, Focus Visible, Sensory Characteristics, Status Messages, captions and audio description; for Keyboard (2.1.1) only 234 of 9,412 issues were found automatically.
- No tool can tell you whether alt text is true, whether the probe works, whether announcements arrive at the right moment, or whether the music drowns the screen reader. A 100 in Lighthouse proves little here.

## 5. Tools worth imitating

| Tool | What it is, licence | Interaction pattern to copy |
|---|---|---|
| Chart2Music | JavaScript library, MIT, npm `chart2music` 1.20.0; states it was built with blind people involved | Focus the chart, get a spoken summary; Left/Right step points with a tone and spoken value; Home/End first/last; Shift+End / Shift+Home play to the right / left edge; Ctrl stops; Q and E change speed; Space replays the point; Page Up/Down change series; Ctrl+[ and Ctrl+] jump to chart minimum and maximum; M monitor mode; H help; O options (lowest and highest frequency, speed); I info. Uses stereo panning. (Read from the 1.20.0 source) |
| MAIDR | Chart access system, GPL-3.0-or-later (copyleft: check before copying code), University of Illinois | Four switchable modes: B braille, T text, S sonification, R review. Arrows navigate; Space replays; P speaks position; D description; [ and ] minimum and maximum; Ctrl+Shift+arrow autoplay; period, comma, slash change autoplay speed; L then X, Y or T reads axis labels and title; Ctrl+/ help |
| Highcharts sonification module | Proprietary charting library (not open source): imitate, do not depend on it | "Context tracks": non-data sounds at fixed intervals marking ticks or thresholds; speech tracks; earcons; one call toggles playback |
| SAS Graphics Accelerator | Free Chrome extension (proprietary); works with JAWS, NVDA, VoiceOver | Pitch = y, stereo = x. V switches Explore Mode (arrows step) and Scan Mode (plays the whole chart); D speed; G next group; S plays groups as chord or melody; H help. Maps: sense what lies in each direction with keys or a game controller |
| Apple Audio Graphs | VoiceOver feature for native apps (not available to web pages) | The app supplies a chart description (title, summary, axes with units, series); VoiceOver offers a spoken description and an audio graph with x as time and y as pitch |
| Desmos Audio Trace | Web graphing calculator feature | Alt+T enters trace mode; H plays the curve; arrows move a point; sound pans left to right; a static texture marks negative y; a timbre change marks positive x; pops mark intersections; separate volume and ten speed keys; separate commands summarize the curve and describe the axes |
| iSonic | Research tool (Univ. of Maryland) | Coordinated map and table; automatic sweep for the gist; arrow keys between regions; numeric keypad as recursive 3 by 3 zoom; adjustable detail of speech |
| VoxLens | JavaScript plug-in from Sharif et al. | Three modes: summary, sonification, spoken question and answer |
| Astronify | Python, BSD 3-Clause (STScI) | One default mapping (brightness to pitch), evaluated in public |
| TwoTone, sonoUno | TwoTone: browser app, development paused per its repository; sonoUno: desktop tool designed with a focus group including visually impaired users, with spoken interface feedback. Licences not confirmed today | Column-to-track mixing (TwoTone, unverified); a user interface that speaks for itself (sonoUno) |

Shared pattern: summary first, then play all, then step, with speed control, jump-to-extremes keys, a help key, and every value available as speech.

## 6. A listening test for Sunday (two to three hours, 8 to 12 people)

### 6.1 Question and design

Research question: after a three-minute scripted introduction, can listeners who cannot see the screen answer four-choice questions about EIC visualizations from sound alone more often than the 25% expected from guessing?

Write the plan (tasks, number of trials, pass rule, stopping rule) into the repository and commit it before the first participant. That timestamp is cheap proof the rule was not chosen after seeing the data.

### 6.2 Stimuli and tasks

- 12 test clips and 2 practice clips, 15 to 20 seconds each, produced by the real pipeline from real frames. Log the SVS id and frame number of each. Match loudness. File names must not leak answers (`clip07.mp3`).
- Twelve trials, three task types, four options each, read aloud or shown as text:
  - **Trend** (4 trials): over the clip the quantity rises, falls, rises then falls, or stays level.
  - **Peak position** (4 trials): the highest value is in the first, second, third or last quarter of the sweep.
  - **Match** (4 trials): which of four one-sentence descriptions of a frame fits the clip (the same logic as Delogu's pick-one-of-four task).
- Each option (A to D) is correct three times. Include one clip with no feature ("stays level") because listeners are more willing to report a signal by ear than by eye (Guiotto Nai Fovino et al. 2024).
- Optional, 2 minutes: play a raw and a "musical" rendering of the same frame and ask which is more pleasant and which is easier to read. Report it descriptively; with 10 people, 9 must agree before a two-way preference is significant.

### 6.3 Procedure

1. Consent (6.8). 2. Training, identical for everyone and read from a script: the listening guide, the lowest and highest tones, the click, then two practice trials with the correct answer given. 3. Twelve trials without feedback; one replay allowed; after each answer a confidence rating from 1 (guess) to 5 (certain). 4. Three agree/disagree items modelled on Arcand et al. (enjoyed it; learned something about the data; trust that the sound reflects the data) and three open questions: what did a high note mean, what confused you, what would you change. About 20 minutes per person.

Counterbalancing means varying clip order so that learning and fatigue do not favour particular clips (Arcand's fixed order is a limitation the authors note). Prepare four orders (forms A to D), each a different shuffle, and give them out in rotation: participant 1 gets A, 2 gets B, and so on.

Stopping rule: stop at 12 participants or at 13:00, whichever comes first. Report everyone. Exclude a session only if the audio failed. Team members who know the mapping are not participants; pilot the script on Saturday with one outsider and discard that data.

### 6.4 What to record

One row per trial: participant id (P01...), form, clip id, task type, answer, correct (0 or 1), confidence, replay used, seconds to answer (optional). One row per participant: group (sighted without view of the screen; blind; low vision), screen-reader user (yes/no), musical training (yes/no), headphones or speakers, device, and the three ratings. No names, emails or recordings in the data file.

### 6.5 Analysis, with the arithmetic

If a listener guesses, the number correct out of n follows a binomial distribution with chance p0. The one-sided exact p-value is the probability of scoring k or more by guessing:

`p = sum for i = k..n of C(n, i) * p0^i * (1 - p0)^(n - i)`

Worked example, 8 correct of 10 independent answers, four choices (p0 = 0.25):

- i = 8: C(10,8) = 45; 45 x 0.25^8 x 0.75^2 = 45 x 0.0000152588 x 0.5625 = 0.00038624
- i = 9: 10 x 0.25^9 x 0.75 = 10 x 0.0000038147 x 0.75 = 0.00002861
- i = 10: 0.25^10 = 0.00000095
- p = 0.00041580, about 0.0004, or 1 in 2,400

The observed proportion is 0.80. A 95% confidence interval is the range of true success rates compatible with the data: Clopper-Pearson (exact, cautious) gives 0.444 to 0.975; Wilson gives 0.490 to 0.943. Both exclude 0.25. Wilson's formula with z = 1.96 and n = 10: centre = (0.8 + z^2/2n) / (1 + z^2/n) = 0.99208 / 1.38416 = 0.7167; half-width = z x sqrt(0.8 x 0.2 / n + z^2 / 4n^2) / 1.38416 = 1.96 x 0.16001 / 1.38416 = 0.2266. Clopper-Pearson's lower bound is the success rate at which "k or more" has probability 0.025, and its upper bound the rate at which "k or fewer" has probability 0.025.

The same 8 of 10 with two choices (p0 = 0.5) gives p = 56/1024 = 0.055, not significant. That is the reason for four options.

Smallest score that beats chance (one-sided p of 0.05 or less):

| Answers n | 4 choices (25%) | 3 choices (33%) | 2 choices (50%) |
|---|---|---|---|
| 8 | 5 (p = 0.027) | 6 (p = 0.020) | 7 (p = 0.035) |
| 10 | 6 (p = 0.020) | 7 (p = 0.020) | 9 (p = 0.011) |
| 12 | 7 (p = 0.014) | 8 (p = 0.019) | 10 (p = 0.019) |

How to apply it honestly:

- **Primary result, per listener**: each person's 12 answers are one binomial sample, so "scored 7 or more of 12" means that person beat chance. Report "X of N listeners individually beat chance; scores ranged from a to b, median m".
- **Pooled accuracy** (for example 72 of 120 = 60%, Clopper-Pearson 51% to 69%) is a fair headline number, but answers from one person are not independent, so say the interval is optimistic.
- **Per-clip accuracy** (N people, one answer each, so independent) shows which mappings fail. A clip most people get wrong is a design finding; report it.
- Low confidence on correct answers suggests guessing; high confidence on wrong ones suggests a misleading mapping.

Standard library only, checked against the numbers above:

```python
from math import comb, sqrt
def pmf(k, n, p): return comb(n, k) * p**k * (1 - p)**(n - k)
def p_value(k, n, p0): return sum(pmf(i, n, p0) for i in range(k, n + 1))  # P(k or more | guessing)
def clopper_pearson(k, n, conf=0.95):
    a = (1 - conf) / 2
    def solve(f, lo=0.0, hi=1.0):
        for _ in range(100):
            mid = (lo + hi) / 2
            lo, hi = (mid, hi) if f(mid) else (lo, mid)
        return (lo + hi) / 2
    low = 0.0 if k == 0 else solve(lambda p: p_value(k, n, p) < a)
    high = 1.0 if k == n else solve(lambda p: sum(pmf(i, n, p) for i in range(k + 1)) > a)
    return low, high
def wilson(k, n, z=1.96):
    ph, d = k / n, 1 + z * z / n
    c = (ph + z * z / (2 * n)) / d
    h = z * sqrt(ph * (1 - ph) / n + z * z / (4 * n * n)) / d
    return c - h, c + h
assert abs(p_value(8, 10, 0.25) - 0.000416) < 1e-6
print(p_value(8, 10, 0.25), clopper_pearson(8, 10), wilson(8, 10))
```

The Wilson formula and the exact (binomial-based) interval are both given in the NIST e-Handbook, section 7.2.4.1, which recommends the exact method when samples are very small. If SciPy is available (it is not installed on this machine; a hosted notebook has it), `scipy.stats.binomtest(8, n=10, p=0.25, alternative='greater')` returns the same p-value and its `.proportion_ci()` method returns a confidence interval (default `method='exact'`).

### 6.6 Who you test decides what you may claim

| Participants | You may say | You may not say |
|---|---|---|
| Sighted adults who cannot see the screen (screen hidden or turned away; no blindfolds, see below) | Untrained listeners decoded trend, peak position and frame identity from sound alone at X% against 25% chance after three minutes of instruction | Accessible to blind users; works with screen readers; anything about BVI people |
| BVI screen-reader users, even two or three, using the real app on their own device | N screen-reader users completed these tasks with NVDA or VoiceOver; these are the problems they found and what we changed; quotes with permission | Percentages, significance, or "blind users can ..." as a general claim |
| Nobody BVI reached in time | Built following published guidance from projects that worked with BVI people; smoke-tested with NVDA by sighted developers; not yet tested with BVI users | Any accessibility success claim |

Why sighted listeners are not stand-ins: they carry a visual memory of world maps and of how such images look; they do not use a screen reader, so nothing about the interface is tested; and blind and sighted listeners have shown opposite expectations about polarity (Walker and Lane 2001). Delogu 2010 found similar accuracy across groups on its one task, which supports using sighted listeners to test decodability, not accessibility. Report the groups separately; never pool them silently.

Name the condition "audio only, screen hidden". Do not blindfold people or describe the test as simulating blindness: in a 2015 study with 255 students (Silverman, Gwinn and Van Boven, Social Psychological and Personality Science; read from a press summary), people who simulated blindness with their eyes covered afterwards judged blind people as less capable of work and independent living. Hiding the screen gives the same experimental control without that framing.

### 6.7 Reaching BVI testers respectfully and fast

- Fastest ethical route this weekend: people you can ask personally. Event organizers and mentors, friends, family, classmates, a campus disability-services contact who knows someone. Ask for 20 to 30 minutes by phone or video call.
- Do not cold-post in community spaces. The National Federation of the Blind's research solicitation form states that internal approval (an institutional review board, an organization's ethics board, or an instructor for a class project) is required before it distributes a study. AppleVis requires prior approval from its editorial team for survey and research announcements. I could not confirm the current rule of the r/Blind subreddit; read the rules and message moderators first.
- Offer payment for their time if you can, and say so in the invitation. You are asking for expertise.
- Send accessible materials: a plain-text message, direct links to MP3 files on your own site, and answers taken by voice on the call. That avoids depending on a form tool whose screen-reader behaviour you have not tested. If you use a form, complete it yourself with NVDA first.
- Etiquette (American Foundation for the Blind guidance for interviewers, plus common sense): say who you are and who else is on the call; speak to the person, not a companion; ordinary words such as "see" and "look" are fine; ask how the person describes their own vision and use their term; let them use their own device and settings; never touch a guide dog or someone's equipment; ask before recording; ask what works, not only what fails.
- Ask the question that honours the co-design principle "nothing about us without us": what would you build differently? Then change something and credit the contribution (anonymously unless they prefer to be named).
- Names to get right: American Foundation for the Blind, National Federation of the Blind, American Council of the Blind. Local organizations (for a Chicago team, The Chicago Lighthouse; unverified today) are worth contacting after the weekend for follow-up testing.

Remote variant for sighted listeners: a page on your GitHub Pages site with native `<audio controls>` elements and radio buttons per clip, answers pasted into a form or collected on a call. Fix the form order (A to D) by link.

### 6.8 Consent wording (read aloud or place at the top of the form)

> This is a short listening test for a student hackathon project in the NASA Space Apps Challenge 2026. You will hear short sound clips made from NASA Earth visualizations and answer multiple-choice questions. It takes about 20 minutes. Taking part is voluntary. You can skip any question or stop at any time without giving a reason. We store your answers under a number, not your name. We will ask whether you are blind or have low vision, whether you use a screen reader, and whether you have musical training; you may decline to answer. We do not record audio or video. Anonymous results will be published with our open-source project. You must be 18 or older. Do you agree to take part? May we quote your comments without your name?

Adults only. The US human-subjects regulation (45 CFR 46.102, 2020 edition, opened today) defines research as a systematic investigation, including testing and evaluation, designed to develop or contribute to generalizable knowledge. A design check on your own hackathon prototype is not aimed at generalizable knowledge, but whether a given activity falls under the rule is an institution's call, not the team's (not legal advice). If any member wants to publish or present the results academically later, ask that member's university first.

### 6.9 Reporting template

> On 15 November 2026 we ran a listening test with N adults: M sighted listeners who could not see the screen, recruited at our event, and K blind or low-vision screen-reader users recruited through personal contacts. After a scripted three-minute introduction, each heard 12 clips generated by our pipeline from Earth Information Center frames (SVS ids ...) and answered four-choice questions (chance 25%). Scores ranged from a to b of 12 (median m). X of N listeners scored 7 or more, the pre-registered threshold for a one-sided exact binomial p of 0.05 or less. Pooled accuracy was P% (95% Clopper-Pearson interval L% to U%; answers from the same listener are not independent, so this interval is optimistic). The K screen-reader users also used the live app; their findings and our changes are listed in ACCESSIBILITY.md. Limitations: small convenience sample; stimuli chosen by the team; one session with no retention test; no comparison condition; sighted listeners are not a proxy for blind users. Script, stimuli and anonymised answers are in /listening-test.

## 7. Language and framing

| Write | Avoid | Why |
|---|---|---|
| "blind and low-vision people", "screen-reader users", "a person who is blind" (person-first on first mention; "blind people" afterwards is fine) | "the blind" as a noun, "suffers from", "afflicted with", "differently abled", "hard of seeing" | American Foundation for the Blind guidance |
| "adds a non-visual way into four EIC visualizations" | "lets blind people see the Earth", "gives sight through sound" | Sound does not restore sight; these lines read as inspiration cliches |
| "tested with N listeners, including K screen-reader users" | "accessible to the blind", "fully accessible", "WCAG compliant" | Only what was tested is defensible |
| "designed with feedback from ..." (if true) | "designed for the blind" by a team with no BVI input | Co-design principle |
| "sound alongside text, keyboard and captions" | "sound instead of sight" | Low vision is not no vision; many users combine senses and tools |

Do not make a BVI tester the emotional centrepiece of the video. Show the tool being used, and quote criticism as readily as praise.

Defensible after one weekend: the mappings are documented; untrained listeners decoded specific features at a stated rate; the interface was operated end to end with named screen readers; known gaps are listed. Not defensible: learning gains, long-term usefulness, benefit to BVI people in general, or superiority over other tools.

## 8. One-page checklist, ordered by impact per hour

Times are estimates (judgment).

| # | Item | Time | Covers |
|---|---|---|---|
| 1 | Page title, `lang`, one `<h1>`, a heading per section, `<main>` and `<nav>` | 15 min | 1.3.1 |
| 2 | Only native controls, each with a visible text label | 30 min | 2.1.1, 4.1.2 |
| 3 | No autoplay; Stop button and Escape; in-app volume | 20 min | 1.4.2 |
| 4 | Per visualization: short alt, long description, data summary, mapping legend, credit | 20 min each | 1.1.1, 1.2.1 |
| 5 | Listening guide with lowest and highest reference tones, before first play | 30 min | Rules 1 to 3 |
| 6 | One `role="status"` live region; announce play, pause, layer changes | 15 min | 4.1.3 |
| 7 | NVDA + Chrome smoke test; fix what you hear | 30 min | Everything |
| 8 | Visible focus, 4.5:1 text and 3:1 control contrast, 200% zoom | 30 min | 2.4.7, 1.4.3, 1.4.11, 1.4.4 |
| 9 | Speed, loop, per-layer mute and solo | 45 min | Rules 6, 7, 11 |
| 10 | Click track and one fixed polarity in every clip | 30 min | Rules 2, 5 |
| 11 | Visual legend, moving cursor, one-line live caption; subtitles on the demo video | 45 min | 1.2.x, Deaf and hard-of-hearing users |
| 12 | Keyboard probe on one flat-map visualization, plus four step buttons | 2 to 3 h | Differentiator |
| 13 | Respect `prefers-reduced-motion`; Pause for animation; check the lightning clip for flashing | 15 min | 2.2.2, 2.3.1 |
| 14 | Touch targets of 44 px; Android vibration on boundaries | 30 min | 2.5.8, 2.5.7 |
| 15 | axe DevTools, Lighthouse, WAVE pass | 15 min | The automatable half |
| 16 | ACCESSIBILITY.md: what was tested, with which tools and people, known gaps | 15 min | Honesty, Validity score |

## Open questions / unverified

- Arcand et al. 2024: the number of BVI respondents is in an appendix I could not retrieve. Do not state a number.
- Tucker Brown 2022 percentages and Zanella 2022 percentages were read from the arXiv versions through an automated page summary; Delogu 2010, Zhao 2008, Sharif 2021, Siu 2022 and Lundgard 2022 figures come from abstracts or search snippets; the 106-person survey in Sharif 2025 comes from a secondary review only. Open the papers before quoting.
- Lundgard and Satyanarayan: my description of the middle levels as "statistics and trends" paraphrases a search summary; exact level names not checked.
- Chart2Music key bindings were read from the 1.20.0 bundle, not from documentation. Bare [ and ] (probably series minimum and maximum) were not confirmed. Which screen readers it is tested with: not found.
- Licences not confirmed today: TwoTone (third-party metadata says MPL-2.0), sonoUno, axe-core. Whether the axe DevTools extension stays free: unclear on its page.
- WebKit bug 260511 was open when fetched; behaviour of pointer events under VoiceOver and TalkBack was not tested on a device. The claim that Apple removed the iOS haptic workaround in iOS 26.5 comes from one library's README.
- NVDA's default audio-ducking mode, and whether browsers' Web Audio output is ducked like other audio, were not checked.
- The speech and gain API names in the ducking snippet were not re-checked today.
- r/Blind posting rules; screen-reader accessibility of Google Forms or Microsoft Forms; The Chicago Lighthouse as a contact: not checked.
- Whether a hackathon listening test needs ethics review at any member's university: not checked. The definition of research in 45 CFR 46.102 was read from the 2020 govinfo edition (the eCFR page redirected), so later amendments were not checked.
- The Silverman et al. 2015 result on blindness simulations comes from a press summary, not the paper.
- Whether Space Apps rules say anything about testing with people: unknown.
- The lightning visualization was not measured against the three-flashes limit.
- Release date of the NASA+ documentary "Listen to the Universe": not on the page fetched.
- The 250 ms speech delay, the three-layer limit, clip lengths and all time estimates are design judgments, not sourced values.
- SVS alt-text statistics come from the local crawl with simple keyword matching.

## Sources

Local files
- Official challenge text - C:\Users\alexl\code\hackathons\SpaceApps\spaceapps-2026\sources\jukebox.txt - accessibility as a core theme; screen-reader support, tactile feedback and descriptive text as suggested features; resource list
- Local SVS API crawl - C:\Users\alexl\code\hackathons\spaceapps-eic-evidence\svs_api (94 JSON files) - alt-text statistics in 2.2

NASA Chandra programme and its evaluation
- Arcand et al. 2024, A Universe of Sound: processing NASA data into sonifications to explore participant response - https://www.frontiersin.org/journals/communication/articles/10.3389/fcomm.2024.1288896/full - sample, method, items, p-values, word counts, limitations, the one quoted phrase
- arXiv record of the same paper - https://arxiv.org/abs/2403.18082 - authors, DOI
- Frontiers press release on EurekAlert, 25 March 2024 - https://www.eurekalert.org/news-releases/1038837 - 3,184 participants, three objects
- A Universe of Sound project page - https://chandra.si.edu/sound/index.html - team, start year, Christine Malec's role
- Chandra blog, Why Make Sonifications of Astronomical Data? (14 Sept 2021) - https://chandra.harvard.edu/blog/index.html/node/797 - written descriptions with J.J. Hunt and Christine Malec, no single template, testers
- Listen to the Universe page - https://chandra.harvard.edu/sound/listen.html - documentary on NASA+, people featured
- Astronomy.com, Listen to the universe: How sonification turns data into sound (Feb 2025) - https://www.astronomy.com/science/how-sonification-turns-data-into-sound/ - Malec's preference for simple pieces, legend, hearing sound before description

Research on sonification and accessible data
- Walker and Nees 2011, Theory of Sonification, chapter page - https://sonification.de/handbook/chapters/chapter2/ - citation
- Same chapter, PDF - https://sonification.de/handbook/download/TheSonificationHandbook-chapter2.pdf - mapping, polarity, scaling, context cues, reference tones, blind/sighted polarity, training
- Zanella et al. 2022, arXiv record - https://arxiv.org/abs/2206.13536 - citation, DOI 10.1038/s41550-022-01721-z
- Zanella et al. 2022, HTML version - https://ar5iv.labs.arxiv.org/html/2206.13536 - 98 projects, aims, lack of evaluation
- Misdariis et al. 2022, arXiv record - https://arxiv.org/abs/2211.12725 - citation, DOI 10.1038/s41550-022-01821-w
- Misdariis et al. 2022, PDF - https://arxiv.org/pdf/2211.12725 - detection thresholds, memory, loudness, evaluation methods, workshop size
- Misdariis et al. 2022, journal page - https://link.springer.com/article/10.1038/s41550-022-01821-w - volume and pages (seen in search results)
- Tucker Brown et al. 2022, HTML version - https://ar5iv.labs.arxiv.org/html/2209.04465 - respondents, design, success rates
- Tucker Brown et al. 2022, PDF - https://arxiv.org/pdf/2209.04465 - citation
- Tucker Brown et al. data set - https://data.ncl.ac.uk/articles/dataset/Tucker-Brown_et_al_-_Astronify_Efficacy_Testing_-_Data/20936749/1 - public stimuli and survey data (seen in search results)
- Guiotto Nai Fovino, Zanella, Grassi 2024 - https://arxiv.org/abs/2402.09953 - design and findings
- Same paper, ADS record - https://ui.adsabs.harvard.edu/abs/2024AJ....167..150G - journal reference (seen in search results)
- Delogu et al. 2010 - https://pubmed.ncbi.nlm.nih.gov/20415530/ - citation and abstract-level findings (via search; page needed cookies)
- iSonic project page - https://www.cs.umd.edu/projects/hcil/audiomap - interaction design
- Zhao et al. 2008, PDF - https://www.cs.umd.edu/users/ben/papers/Zhao2008Data.pdf - citation, 7 users and 42 hours (seen in search results)
- Sharif et al. 2021 - https://faculty.washington.edu/wobbrock/pubs/assets-21.01.pdf - accuracy and time gap (via search)
- Sharif et al. 2022, VoxLens - https://faculty.uw.edu/wobbrock/pubs/chi-22.04.pdf - three modes (via search)
- Sharif et al. 2025 - https://faculty.washington.edu/wobbrock/pubs/w4a-25.01.pdf - title and authors (PDF text not extractable)
- Secondary review of Sharif et al. 2025 - https://a11y-paradise.onrender.com/reviews/69bf150cf63feadf7b45466f - survey size, when sonification helps
- Siu et al. 2022 - https://hci.stanford.edu/publications/paper.php?id=473 - audio data narratives (via search)
- Bellona et al. 2024 - https://par.nsf.gov/biblio/10563651 - Accessible Oceans, spoken context
- Lundgard and Satyanarayan 2022 - https://arxiv.org/pdf/2110.04406.pdf - what blind and sighted readers want from descriptions (via search)

W3C and MDN
- WCAG 2.2 - https://www.w3.org/TR/WCAG22/ - all success criteria, levels, numbers, definitions
- Understanding SC 1.4.2 Audio Control - https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html - screen-reader rationale, G171
- APG Slider pattern - https://www.w3.org/WAI/ARIA/apg/patterns/slider/ - keys, properties, touch warning
- APG Media Seek Slider example - https://www.w3.org/WAI/ARIA/apg/patterns/slider/examples/slider-seek/ - aria-valuetext for time, currentcolor
- APG Tabs pattern - https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ - keys, activation
- APG Listbox pattern - https://www.w3.org/WAI/ARIA/apg/patterns/listbox/ - keys, limits
- APG Button pattern - https://www.w3.org/WAI/ARIA/apg/patterns/button/ - toggle buttons, focus after activation
- APG Developing a Keyboard Interface - https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/ - roving tabindex, shortcut conflicts
- W3C WAI Complex Images tutorial - https://www.w3.org/WAI/tutorials/images/complex/ - two-part text alternative
- W3C WAI Making Audio and Video Media Accessible - https://www.w3.org/WAI/media/av/ - captions, descriptive transcripts, description
- MDN ARIA live regions - https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions - polite, assertive, region must exist first
- MDN application role - https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/application_role - when to use, author duties
- MDN Navigator.vibrate - https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate - syntax, user activation, availability
- caniuse data for the Vibration API - https://raw.githubusercontent.com/Fyrd/caniuse/main/features-json/vibration.json - per-browser support
- WebKit bug 260511 - https://bugs.webkit.org/show_bug.cgi?id=260511 - no direct touch under VoiceOver for application role
- ios-haptics README - https://unpkg.com/ios-haptics@3.1.1/README.md - claim that the iOS workaround was patched (seen in search results)
- MDN SpeechSynthesis - https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis - speech synthesis availability
- MDN prefers-reduced-motion - https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion - media feature, Baseline date
- MDN Autoplay guide - https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay - Web Audio is subject to autoplay rules

Screen readers and checkers
- WebAIM Screen Reader User Survey #10 - https://webaim.org/projects/screenreadersurvey10/ - usage shares
- NVDA User Guide - https://download.nvaccess.org/documentation/userGuide.html - version, commands, Speech Viewer, audio ducking
- Microsoft, Introducing Narrator - https://support.microsoft.com/help/14234 - Narrator shortcut (seen in search results)
- Apple, Turn VoiceOver on or off on Mac - https://support.apple.com/guide/voiceover/vo2682 - Command-F5 (seen in search results)
- Apple, Turn on and practice VoiceOver on iPhone - https://support.apple.com/guide/iphone/turn-on-and-practice-voiceover-iph3e2e415f/ios - settings path, practice area
- Google, Turn TalkBack on or off - https://support.google.com/accessibility/android/answer/6007100 - shortcut and gestures
- Deque automated accessibility coverage report - https://www.deque.com/automated-accessibility-coverage-report/ - 57.38%, undetectable criteria
- Lighthouse accessibility scoring - https://developer.chrome.com/docs/lighthouse/accessibility/scoring - how the score is built
- WAVE - https://wave.webaim.org/ - what it is, forms
- axe DevTools - https://www.deque.com/axe/devtools/ - what it is

Tools
- Chart2Music README 1.20.0 - https://cdn.jsdelivr.net/npm/chart2music@1.20.0/README.md - purpose, MIT licence, usage
- Chart2Music bundle 1.20.0 - https://cdn.jsdelivr.net/npm/chart2music@1.20.0/dist/index.mjs - key bindings, application role, live region
- Chart2Music docs - https://www.chart2music.com/docs/ - arrows and H key
- MAIDR README 4.6.0 - https://cdn.jsdelivr.net/npm/maidr@4.6.0/README.md - modes, licence, maker
- MAIDR controls - https://raw.githubusercontent.com/xability/maidr/main/docs/CONTROLS.md - key bindings
- Highcharts sonification, getting started - https://www.highcharts.com/docs/sonification/getting-started - context tracks, speech tracks
- Highcharts licence - https://shop.highcharts.com/license - proprietary
- SAS Graphics Accelerator - https://support.sas.com/software/products/graphics-accelerator/ - free extension, requirements
- SAS accessibility sample - https://support.sas.com/accessibility/Samples/COVID-19/index.html - modes and keys
- Apple Audio Graphs - https://developer.apple.com/documentation/accessibility/audio-graphs.md - x as time, y as pitch, chart descriptor
- Desmos Audio Trace - https://help.desmos.com/hc/en-us/articles/37064105800333-Audio-Trace - keys and sound cues
- Desmos keyboard shortcuts - https://desmos.com/graphingshortcuts - summary and axis commands (seen in search results)
- Astronify - https://github.com/spacetelescope/astronify - BSD 3-Clause
- TwoTone - https://github.com/datavized/twotone - move to the sonifydata repository (seen in search results)
- sonoUno desktop - https://github.com/sonounoteam/sonouno-desktop - repository (seen in search results)

Description, language, recruiting
- NCAM/DIAGRAM Image Description Guidelines - https://www.wgbh.org/ncam-resources/2026-08-19/image-description-guidelines - brevity, data focus, tables
- DCMP Description Key, How to Describe - https://dcmp.org/learn/617 - tense, objectivity, directions
- American Foundation for the Blind, resources for reporters - https://www.afb.org/press-room/reporter-resources-writing-about-blindness-vision-loss - terms and interview etiquette
- NFB Research Participant Solicitation Request Form - https://www.nfb.org/research_participant_solicitation_request_form - approval required
- AppleVis posting guidelines - https://www.applevis.com/help/what-are-general-guidelines-and-rules-posting-applevis-website - editorial approval for research posts (seen in search results)
- 45 CFR 46.102, 2020 edition (govinfo PDF) - https://www.govinfo.gov/content/pkg/CFR-2020-title45-vol1/pdf/CFR-2020-title45-vol1-sec46-102.pdf - definition of research and of human subject
- eCFR 45 CFR 46.102 - https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-A/part-46/subpart-A/section-46.102 - current text (seen in search results; the page redirected, not opened)
- Silverman, Gwinn and Van Boven 2015, Stumbling in Their Shoes (press summary) - https://www.sciencedaily.com/releases/2015/01/150114140554.htm - blindness simulations lower judged capability (seen in search results; DOI 10.1177/1948550614559650)

Statistics
- NIST/SEMATECH e-Handbook of Statistical Methods, 7.2.4.1 Confidence intervals - https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm - Wilson interval formula, exact binomial interval, advice for small samples
- SciPy, scipy.stats.binomtest - https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.binomtest.html - function signature, `alternative`, `proportion_ci`
