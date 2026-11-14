# Tools and libraries: what people use to turn images and data into sound, and what we should pick

> Status: researched 2026-11-14 with live sources by its author. The independent fact-check pass did NOT complete (see README.md). Treat licence, citation and version claims as unconfirmed until you open the cited source.

## TL;DR

- **Build the hybrid.** Python reads the EIC frames offline and writes a small `features.json` per visualization; a static GitHub Pages site plays those features with Tone.js in step with the EIC video. A measured fact forces this: `svs.gsfc.nasa.gov` answers with a fixed `access-control-allow-origin` header for another site, so our page can show SVS media but cannot read its pixels.
- **Minimum stack, all permissive licences, all with Windows wheels usable on Python 3.14 (checked on PyPI today):** `numpy` + `pillow` + `imageio-ffmpeg` (or `av`) + the standard-library `wave` module. In the browser: Tone.js 15.1.22 (MIT), optionally `tonal` 6.5.1 (MIT), plus built-in Web Speech, ARIA and `requestVideoFrameCallback`.
- **Synthesize instead of shipping samples.** A synthesizer computes sound from formulas, so there is no sample licence to track. If a real instrument is wanted, the cleanest sets are smplr's `SplendidGrandPiano` (samples stated as public domain) and its VCSL-based `Mallet` (CC0); the Salamander piano (CC BY 3.0) and FluidR3_GM (CC BY 3.0 per its host) need attribution only; smplr's default `MusyngKite` kit is CC BY-SA 3.0.
- **Keep out of the shipped app:** GPL/AGPL libraries (pedalboard, DawDreamer, SCAMP, WebAudioFont, Strudel, pixasonics, `@ffmpeg/core`), Highcharts (commercial licence), and AI music models (non-commercial weights, API keys, watermarks, and output that is not a function of the pixels).
- **No sonification library does our image step.** STRAUSS, Astronify, sonoUno, miditime, Erie, Chart2Music, Highcharts and TwoTone all take tables or series. The three PyPI packages that take images (pixasonics, herakoi, ViSound) are GPL, stale or unlicensed. Frame-to-feature code is ours to write, and it is where we differ.
- **What the 2026 field uses** (46 public Jukebox repositories scanned today): raw Web Audio 29, canvas `getImageData` 25, Web Speech 20, Tone.js 19, React 19, Python numpy 19. Zero contain EXR/TIFF frames, MIDI files, soundfonts, WebCodecs or opencv.js; two use `requestVideoFrameCallback`. Past Space Apps sonification repositories (2018 to 2023) were Python plus MIDI files.
- **Differ on method, not on library:** full-resolution frames processed offline, a published mapping, WAV files rendered from the same mapping, frame-accurate video sync, and a measured listening test (07-accessibility-and-listening-tests.md).

## Decisions for the Jukebox build

Ranked. Each line is what I would do in the team's place.

1. **Architecture: hybrid (Stack 3 below).** Reason: the CORS constraint removes live pixel reading from SVS; offline Python can use the full-resolution frame sets nobody else is touching; and it produces both deliverable forms the challenge names (an interactive tool and a curated set of generated audio files). Trade-off: changing an image feature means re-running Python and committing new JSON. Mitigation: keep the mapping (feature to pitch, volume, pan) in JavaScript so sound design iterates in the browser without re-running Python.
2. **Browser audio: Tone.js, pinned to 15.1.22 and copied into the repo** (`vendor/Tone.js`, 346 kB) so the demo survives venue Wi-Fi. Reason: ready synths, effects, a musical clock and `Tone.Offline` rendering; about half an hour to first sound. Trade-off: one dependency, and npm's `latest` tag dates from 2025-04-27 (the `next` tag is 15.5.72), so pin and do not chase versions. Raw Web Audio is the alternative if someone on the team already knows it; it is what 29 of 46 sampled teams use.
3. **Python: stay on the installed 3.14 for the core set** (`python -m pip install --user numpy pillow imageio imageio-ffmpeg`), which all have usable Windows wheels. Create a Python 3.12 environment only if you need something from the "no 3.14 wheel" list in section E. Trade-off: no pydub, pygame, tinysoundfont or AI audio models on 3.14.
4. **Video frames: `imageio-ffmpeg` first** because its Windows wheel contains the FFmpeg executable (no separate install). Use PyAV (`av`) if you need frame-accurate seeking or speed. Skip OpenCV unless you need optical flow or contours (02-frame-analysis-algorithms.md).
5. **Offline renderer: numpy plus the standard-library `wave` module.** Measured on this machine: 60 s of 16 sine voices at 44.1 kHz rendered in 1.2 s (about 49 times faster than real time). Use it for downloadable WAVs and for listening-test stimuli, so every listener hears identical audio. Trade-off: you write envelopes and mixing yourself (08-recipes-python.md).
6. **Sync sound to the picture with `requestVideoFrameCallback`** (browser built-in, Baseline since October 2024): it reports the media time of each displayed frame, which indexes the feature array. Only 2 of 46 sampled repositories do this.
7. **Instruments: Tone.js synths for everything, at most one sampled instrument** (Salamander piano through `Tone.Sampler`, CC BY 3.0; or, with no attribution duty, smplr's `SplendidGrandPiano` or `Mallet`, whose samples are public domain and CC0; table in section A). Reason: licences and load time. Trade-off: synth timbres need an hour of tuning to sound pleasant (04-making-it-musical.md).
8. **Accessibility plumbing from built-ins:** Web Speech API for spoken descriptions, ARIA live regions, keyboard controls, `navigator.vibrate`. These are table stakes (ARIA appears in 40 of 46 sampled repositories, speech in 20, vibration in 12); the measured listening test is the differentiator.
9. **Licence our code Apache-2.0 or MIT and start `REFERENCES.md` in hour one.** Both are OSI-approved; Creative Commons licences are not on the OSI list, so CC is for media and samples only, never for our code.
10. **Skip:** every tool in sections F, G and H as a product component (use Audacity or Sonic Visualiser only to inspect output); opencv.js, MediaPipe, ffmpeg.wasm, WebCodecs; AI music generation; MIDI plus FluidSynth on Windows (extra native install); React unless the UI person is already fast in it.

## How to read this file

Terms used below, defined once:

- **Web Audio API**: the browser's built-in audio engine. You connect nodes (oscillator, gain, filter) into a graph inside an `AudioContext`.
- **Synthesizer / sampler**: a synthesizer computes a waveform from formulas; a sampler plays back recorded notes, pitch-shifting them to fill gaps.
- **SoundFont (.sf2)**: a file holding sampled instruments. **General MIDI (GM)** is the standard list of 128 instrument numbers such files follow.
- **MIDI**: a format that stores notes (pitch number, start, length, loudness), not audio. MIDI note `m` has frequency `f = 440 * 2^((m - 69) / 12)` Hz, so note 60 (middle C) is 261.63 Hz.
- **DAW**: digital audio workstation, a multitrack recording and mixing program.
- **OSC**: Open Sound Control, a network message format music programs use to talk to each other.
- **Wheel**: a prebuilt Python package. A tag such as `cp314-win_amd64` means "CPython 3.14, 64-bit Windows"; `abi3` wheels work on every later Python version; `py3-none-any` is pure Python.
- **CDN**: a public server that hosts npm packages as plain files for a `<script>` tag.
- **CORS / tainted canvas**: browsers let a page display another site's image or video, but once it is drawn on a canvas without that site's CORS approval the canvas is "tainted" and `getImageData()`, `toBlob()`, `toDataURL()` and `captureStream()` throw `SecurityError` (MDN).
- **EXR**: OpenEXR, a floating-point image format used for film-grade frames.

How facts were checked on 2026-11-14: versions, dates, licences and wheel tags come from the PyPI JSON API and the npm registry; repository licences and last-push dates from the GitHub API; CDN URLs were requested and returned HTTP 200. "Est. hours" columns are my estimates for a programmer new to audio, not measurements. Nothing was installed; code lines are taken from the projects' own documentation and were not run here, except the numpy benchmark.

## The constraint that decides the stack

1. **Cross-origin pixels.** SVS serves its API and media with `access-control-allow-origin: https://tempo.multiverse.music` whatever the requesting origin (measured today). From a GitHub Pages site, `<img>` and `<video>` pointing at SVS display fine; `canvas.getImageData()` on them throws; `fetch()` of the API or of media bytes fails. Two consequences. First, do not add `crossorigin="anonymous"` to an SVS `<video>` or `<img>` tag: that asks for CORS approval, which the server will not give for our origin, so the load fails (inference from CORS rules, untested). Second, pixels must come either from offline analysis (features in JSON) or from copies of frames hosted in our own repository (same origin, canvas works).
2. **Frame formats in the EIC crawl.** Of 187 frame directories, 98 hold EXR (343,555 files), 48 PNG (72,567 files), 19 TIFF (56,797 files) and 5 JPG (8,341 files). The 1,729 media items include 448 PNG, 367 MP4, 361 JPG and 135 WebM. So movies and PNG frames cover most needs; EXR needs the `OpenEXR` package and a tone-mapping step, and is optional this weekend.
3. **GitHub limits.** Git blocks files over 100 MiB and warns at 50 MiB; a Pages site may be at most 1 GB with a soft 100 GB per month bandwidth limit. A mono 16-bit 44.1 kHz WAV costs `44100 * 2 * seconds + 44` bytes: 5.29 MB per minute (measured). Feature JSON is small: 900 frames x 8 columns x 2 features at 2 decimals is 85 kB; 900 x 32 x 3 at 3 decimals is 555 kB (measured).

Formats available for the ten visualizations the challenge lists (counted in the local crawl):

| SVS page | Frame sets | Media files (most common types) |
|---|---|---|
| 13786 Caldwell 73 sonification (NASA's own example) | none | jpg 3, mp4 1, webm 1 |
| 5313 Night lights 2012 to 2023 | none | png 2, jpg 1, mp4 1, mov 1 |
| 3912 Sea surface currents and temperature | TIFF in 4 directories (7,753 files), PNG in 2 (4,002) | mp4 20, png 10, jpg 7, webm 3 |
| 5669 GEOS aerosols | none | png 7 |
| 5533 Air quality model runs | PNG in 4 directories (11,134 files) | png 8, mp4 5 |
| 5425 Perpetual Ocean 2 | EXR in 10 directories (163,510 files) | mp4 20, jpg 13, png 5 |
| 5196 DYAMOND carbon dioxide | EXR in 5 directories (5,880 files), PNG in 1 (1,176) | png 14, mp4 8, jpg 7 |
| 5011 Lightning from the ISS | none | mp4 5, jpg 3, png 2 |
| 4960 Atmospheric river | PNG in 2 directories (3,596 files), EXR in 3 (43,727) | mp4 5, jpg 4, png 3, webm 3 |
| 4950 GEDI forest height | TIFF in 9 directories (15,684 files), EXR in 3 (4,191) | mp4 32, jpg 23, webm 12, tif 11 |

Every listed page has a movie or PNG/JPG stills, so Pillow plus a video decoder covers all ten. Only 5425 has frame sets in EXR alone, and 5669 has stills but no movie in the crawl. EXR support is therefore optional. Size also argues for sampling: in the crawl the median EXR frame is 11.7 MB (3840 x 2160 is the commonest size), the median TIFF frame 31.7 MB and the median PNG frame 2.8 MB, and one 19,001-frame EXR set is about 500 GB. Take every Nth frame; never mirror a directory.

## A. Browser audio

Install lines and URLs were verified today. "Seen" = latest release on npm and last push on GitHub where checked.

| Tool | What it is | Install / script tag | Licence | Seen 2026-11-14 | Est. hours to first sound | Best at | Limits |
|---|---|---|---|---|---|---|---|
| Web Audio API | Built-in audio graph (`AudioContext`, `OscillatorNode`, `GainNode`, `OfflineAudioContext`) | none | browser feature | `OfflineAudioContext` widely available since April 2021 (MDN) | 1 | zero dependencies, total control | you write envelopes, voices and scheduling; context must be created or resumed inside a user gesture (MDN) |
| Tone.js | Framework on Web Audio: synths, effects, sampler, musical clock (Transport), offline render | `npm install tone` or `<script src="https://cdn.jsdelivr.net/npm/tone@15.1.22/build/Tone.js"></script>` (global `Tone`) | MIT | 15.1.22 (2025-04-27), `next` 15.5.72; repo pushed 2026-11-14; 14.9k stars | 0.5 | notes, rhythm, effects, `Tone.Offline(callback, duration)` returning a buffer | `await Tone.start()` must run in a click or key handler; 346 kB |
| p5.js + p5.sound | Creative-coding canvas library plus a sound add-on that npm describes as a thin wrapper around Tone.js | `https://cdn.jsdelivr.net/npm/p5@2.4.0/lib/p5.min.js` and `https://cdn.jsdelivr.net/npm/p5.sound@0.4.2/dist/p5.sound.min.js` | LGPL-2.1 | p5 2.4.0 (2026-11-11), p5.sound 0.4.2 (2026-11-08) | 1 | one-file sketches that draw and sound | 1.07 MB + 230 kB; thinner than Tone itself; LGPL must be listed |
| Howler.js | Audio file player | `https://cdn.jsdelivr.net/npm/howler@2.2.4/dist/howler.min.js` | MIT | 2.2.4 (2023-09-19) | 0.5 | playing pre-rendered clips | no synthesis (unverified); a plain `<audio>` element covers our need |
| smplr | Sampled instruments with no setup: 11 instrument types (Soundfont, SplendidGrandPiano, DrumMachine, Mallet, Mellotron, Soundfont2 for .sf2, and more), `renderOffline` to WAV | `npm i smplr` or `import { Soundfont } from "https://unpkg.com/smplr@1.2.0/dist/index.mjs"` in a module script | MIT (npm); samples have their own licences | 1.2.0 (2026-11-06) | 0.5 | realistic instrument sound fast | samples download at run time from third-party hosts; default Soundfont kit `MusyngKite` is CC BY-SA 3.0, pass `kit: "FluidR3_GM"` |
| soundfont-player | Older loader for the same pre-rendered soundfonts | `https://cdn.jsdelivr.net/npm/soundfont-player@0.12.0/dist/soundfont-player.min.js` | MIT | 0.12.0 (2020-01-27) | 0.5 | nothing smplr lacks | smplr's README presents itself as its successor; skip |
| WebAudioFont | Thousands of GM instrument presets as JS files plus a player | `https://surikov.github.io/webaudiofont/npm/dist/WebAudioFontPlayer.js` | GPL-3.0 | npm 3.0.4 (2022-06-28); repo pushed 2026-09-04 | 1 | widest instrument choice | GPL-3.0 would bind our whole app; mixed sample origins; skip |
| @tonejs/midi | Reads and writes MIDI files as JSON | `npm install @tonejs/midi` | MIT | 2.0.28 (2022-02-04) | 1 | exporting a `.mid` of our notes | makes no sound itself |
| Strudel | TidalCycles pattern language in JavaScript | `<script src="https://unpkg.com/@strudel/web@1.3.0"></script>`, then `initStrudel()` and `note("<c a f e>(3,8)").play()` | AGPL-3.0-or-later | 1.3.0 (2026-01-18); source on Codeberg | 0.5 in its REPL, 2 embedded | rhythmic patterns in one line | AGPL: the whole app must be released under a compatible licence; skip unless the team wants AGPL |
| Elementary Audio | Functional audio DSP in JavaScript (web, Node offline, native) | `@elemaudio/core`, `@elemaudio/web-renderer` | MIT | 4.0.1 / 4.0.3 (December 2024) | 2 to 3 | custom low-level DSP | no ready instruments; overkill |
| Faust (WebAssembly) | DSP language compiled in the browser to Web Audio nodes | `npm i -D @grame/faustwasm` | LGPL-2.1 (npm) | 0.20.2 (2026-11-11) | 4+ | physical models, custom effects | a new language; overkill |
| Magenta.js | Pretrained melody and drum models (MusicVAE, MelodyRNN, DrumsRNN, PerformanceRNN, ImprovRNN) | `https://cdn.jsdelivr.net/npm/@magenta/music@1.23.1/dist/magentamusic.min.js` | Apache-2.0 | npm last published 2021-11-01 (depends on TensorFlow.js 2.x); repo pushed 2026-06-22 | 2 to 3 | machine-made melodies | multi-megabyte bundle (the unminified build is 2.5 MB) plus model downloads; output is not driven by our data; counts as AI use |

Helper worth adding: **tonal** (MIT, 6.5.1, 2026-10-14), music theory lookups: `<script src="https://cdn.jsdelivr.net/npm/tonal@6.5.1/browser/tonal.min.js"></script>` gives a global `Tonal`; `Note.midi("C4")` is 60, `Note.freq("a4")` is 440, `Scale.get("C major").notes` lists the scale. A hand-written array of scale degrees does the same job in ten lines.

Sample sets a browser can load, with the licence each source states. The three hosts (`smpldsnds.github.io`, `gleitz.github.io`, `tonejs.github.io`) answered with `access-control-allow-origin: *` today, so cross-origin loading works, unlike SVS media. For the demo, copy the files you use into the repo.

| Sample set | Loaded through | Licence stated by its source |
|---|---|---|
| Splendid Grand Piano | smplr `SplendidGrandPiano` | public domain, originally released by Akai (its sfzinstruments README, which asks derivatives to name the source) |
| VCSL (Versilian Community Sample Library) | smplr `Mallet` and `Versilian` | CC0 |
| FluidR3_GM | smplr `Soundfont` with `kit: "FluidR3_GM"` (marimba file 1.7 MB, piano 2.6 MB) | CC BY 3.0 per the midi-js-soundfonts README |
| MusyngKite | smplr `Soundfont` default kit | CC BY-SA 3.0 per the same README: avoid |
| Salamander Grand Piano | `Tone.Sampler` with `baseUrl: "https://tonejs.github.io/audio/salamander/"` | CC BY 3.0, Alexander Holm (search snippet) |
| GeneralUser GS 2.0.3 (`.sf2`) | FluidSynth, or smplr `Soundfont2` | its own licence v2.0: free use for music, private or commercial, and in software projects |

Smallest working page (API calls as in the Tone.js README):

```html
<script src="https://cdn.jsdelivr.net/npm/tone@15.1.22/build/Tone.js"></script>
<button id="play">Play</button>
<script>
  document.getElementById("play").addEventListener("click", async () => {
    await Tone.start();                      // browsers stay silent until a user gesture
    const synth = new Tone.Synth().toDestination();
    synth.triggerAttackRelease("C4", "8n");  // middle C for an eighth note
  });
</script>
```

### Browser sonification libraries

| Tool | What it is | Licence | Seen | Input | Verdict |
|---|---|---|---|---|---|
| Highcharts sonification module | Chart sonification: built-in synth with instrument presets, mapping to musical scales, speech and context tracks, MIDI export; needs `highcharts.js` plus `modules/sonification.js` | commercial; the shop page says its Internal licence does not cover public websites; Core is listed at USD 366 per seat | npm 13.1.1 (2026-09-20) | chart series | not open source, so skip; worth reading as a design reference (context tracks, spoken announcements) |
| Chart2Music | Keyboard, screen-reader and sound layer for charts, built so blind users can hear chart data | MIT | 1.20.0 (2025-12-03); repo pushed 2026-11-02 | chart data arrays | optional: an accessible chart of a feature over time (for example mean brightness per frame) beside the video. One script tag (`https://cdn.jsdelivr.net/npm/chart2music@1.20.0/dist/index.js`, global `c2mChart`); its README shows it attached to an `<img>` element plus a data array |
| Erie (`erie-web`) | Declarative grammar for sonification (CHI 2024): you declare a tone and encodings such as time, duration, tap, pitch, loudness, pan, reverb, speech | MIT | 1.0.5 (2026-10-26) | data tables | skip as a dependency; borrow its vocabulary to document our mapping. Its docs warn that more than 100 discrete tones in a short span can overload Web Audio |
| TwoTone | No-code web app: spreadsheet column to notes in a key and scale, exports MP3 or WAV | MPL-2.0 | development paused since mid-2023; last push 2024-07-27; site still answers | CSV-like tables | a 10-minute way for the business member to audition a mapping from a CSV of our features |

## B. Browser vision and video

| Tool | What it is | Licence / status | Est. hours | Use for us | Limits |
|---|---|---|---|---|---|
| Canvas 2D | `drawImage()` then `getImageData()` gives RGBA bytes | built in | 0.5 | live "explore by pointer" on frames hosted in our own repo | tainted by SVS-hosted media; 25 of 46 sampled teams use it |
| WebGL / WebGPU shaders | Per-pixel work on the GPU | built in | 4+ | none once features are precomputed | same cross-origin rule (unverified today); steep |
| opencv.js | OpenCV compiled to WebAssembly | Apache-2.0; npm `@techstark/opencv-js` 5.0.0-release.1 (2026-06-24) | 2 | none | the official build at docs.opencv.org is 10.96 MB; 0 of 46 use it; do computer vision in Python |
| MediaPipe (`@mediapipe/tasks-vision`) | Pretrained detectors for hands, faces, poses, objects, segmentation | Apache-2.0; 1.2.3 (2026-11-11) | 2 | only a gesture-controlled interface | trained on photographs, not false-colour maps; skip |
| ffmpeg.wasm | FFmpeg in the browser | `@ffmpeg/ffmpeg` 0.12.15 MIT, but `@ffmpeg/core` 0.12.10 is GPL-2.0-or-later; bundles FFmpeg n5.1.4 | 2 | none | GPL core, large download, and it cannot fetch SVS files anyway; run FFmpeg offline |
| WebCodecs | Built-in video decoder (`VideoDecoder`, `VideoFrame`) | built in | 4+ | none | does not read MP4/WebM containers (MDN names Mediabunny, MPL-2.0, as a demuxer; `mp4box` is BSD-3-Clause) and needs the file bytes, which CORS blocks for SVS |
| `requestVideoFrameCallback` | Callback per displayed video frame with `metadata.mediaTime` (seconds) and `presentedFrames` | built in; Baseline 2024, across browsers since October 2024 | 0.5 | **use it** to index features by time | needs no pixel access, so it should work on SVS-hosted video (untested); fall back to `requestAnimationFrame` reading `video.currentTime` |

```js
function onFrame(now, meta) {
  const i = Math.min(feat.frames.length - 1, Math.round(meta.mediaTime * feat.fps));
  applyFrame(feat.frames[i]);              // set pitch, volume, pan from this frame's features
  video.requestVideoFrameCallback(onFrame);
}
video.requestVideoFrameCallback(onFrame);
```

## C. Python audio and MIDI

All run on Windows. "3.14 wheel" = a Windows 64-bit wheel usable on Python 3.14 exists on PyPI today.

| Package (`pip install` name) | What it is | Latest (uploaded) | Licence | 3.14 wheel | Est. hours | Best at | Limits |
|---|---|---|---|---|---|---|---|
| `numpy` | Arrays; a waveform is an array of samples | 2.5.4 (2026-10-10) | BSD-3-Clause and others | yes | 0.5 | additive synthesis, mixing | needs Python 3.12+ |
| `wave` (standard library) | Writes 16-bit PCM WAV | ships with Python | PSF | n/a | 0.2 | saving audio with no install | WAV only |
| `scipy` | `scipy.signal` filters and resampling, `scipy.io.wavfile` | 1.18.1 (2026-08-21) | BSD | yes | 1 | low-pass filters, smoothing | 3.12+ |
| `soundfile` | Read and write WAV, FLAC, OGG as numpy arrays | 0.14.0 (2026-06-06) | BSD 3-Clause | yes | 0.3 | float and multichannel files | none for us |
| `sounddevice` | Play and record numpy arrays through the sound card | 0.5.6 (2026-08-17) | MIT | yes | 0.3 | hearing a result without saving | local playback only |
| `librosa` | Audio and music analysis (spectrograms, pitch, tempo) | 1.0.1 (2026-11-12) | ISC | yes (pure; its `numba` dependency has a cp314 wheel) | 1 | checking our output | analysis, not generation; heavy dependency tree |
| `pedalboard` | Studio effects (reverb, compression), plugin hosting | 0.9.26 (2026-10-07) | GPLv3 | yes | 1 | polishing renders | GPL |
| `pyo` | Real-time DSP engine scripted from Python | 1.1.0 (2026-10-10) | LGPL-3.0-or-later | yes | 2 | live synthesis from Python | its own audio server model to learn |
| `mido` | MIDI messages, ports and files | 1.3.3 (2024-10-25) | MIT | yes (pure) | 1 | reading and writing `.mid` | no sound by itself |
| `MIDIUtil` | Simplest multi-track MIDI file writer | 1.2.1 (2018-03-04) | MIT | source only, pure Python | 0.5 | a `.mid` in ten lines | unmaintained since 2018, still a dependency of miditime and scamp |
| `pretty_midi` | MIDI object model; `synthesize()` renders with sine waves, `fluidsynth()` with a soundfont | 0.2.11.post0 (2026-07-28) | MIT | yes (pure) | 1 | MIDI to audio array in one call | realistic sound needs FluidSynth |
| `music21` | Music theory and notation toolkit | 10.5.2 (2026-10-28) | BSD-3-Clause | yes (pure) | 3 | scales, chords, sheet music | large; more than we need |
| `scamp` | Composition framework: timing, SoundFont playback, notation | 0.13.0 (2026-09-25) | GPL-3.0-only | yes | 2 | score output | GPL |
| `pyfluidsynth` + FluidSynth | Python binding to the FluidSynth SoundFont synthesizer | 1.4.0 (2026-05-30); FluidSynth 2.6.2 | MIT; FluidSynth LGPL-2.1 | binding yes | 2 | realistic instruments offline | FluidSynth itself and a `.sf2` file must be installed separately |
| `pydub` | Cut, mix and convert clips | 0.25.1 (2021-03-10) | MIT | pure, but see limits | 0.5 | joining clips | imports the `audioop` module, absent from Python 3.13+ unless `audioop-lts` is installed (measured here: `import audioop` raises `ModuleNotFoundError` on Python 3.14.6); MP3 needs FFmpeg (unverified); avoid on 3.14 |
| `dawdreamer` | DAW functions from Python (plugins, Faust) | 0.9.0 (2026-08-12) | GPLv3 | yes | 3 | plugin rendering | GPL; overkill |
| `python-osc` | OSC client and server | 1.10.2 (2026-04-02) | public domain (Unlicense) | yes (pure) | 1 | driving Sonic Pi, SuperCollider, Pd or TouchDesigner from Python | needs a receiving program |

```python
import numpy as np, wave
sr = 44100                                  # sample rate: samples per second
t = np.arange(sr * 2) / sr                  # time stamps for 2 seconds
x = 0.5 * np.sin(2 * np.pi * 261.63 * t)    # middle C at half volume
with wave.open("c4.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((x * 32767).astype("<i2").tobytes())   # 16-bit little-endian
```

## D. Python sonification-specific

| Package | What it is | Latest (uploaded) | Licence | Image input? | Verdict |
|---|---|---|---|---|---|
| `strauss` | Sonification toolkit from astronomy. Sources (Events are discrete, Objects evolve over time) feed a Score (a chord sequence that constrains pitch) and a Generator (Synthesizer, Sampler that also loads `.sf2`, Spectralizer using an inverse FFT), rendered to mono, stereo, 5.1 or 7.1 WAV | 1.0.3 (2026-02-17); repo pushed 2026-11-13 | PyPI says MIT, the repository LICENSE file is Apache-2.0 | no: a dict of arrays or an ASCII table | the most complete offline option once we have feature series; about 2 to 3 hours to learn; heavy dependencies (jupyterlab, pandas, matplotlib, scipy). 2 of 46 sampled teams use it |
| `astronify` | STScI package that turns a data series into pitches | 0.11 (2025-01-31) | BSD 3-Clause | no | source-only package that needs `pyo`; its install page covers macOS and Linux only; skip |
| sonoUno (`sonounolib` 0.5.3, 2022; desktop app) | User-centred sonification of table data (txt, csv) | desktop repo MIT, last push 2024-12-10 | MIT | a column-scan image script exists in its training material (seen in a search summary only) | skip |
| `sonecules` / `pya` | Research sonification architecture and its audio classes | 0.1.0 (2023-08-24) / 0.5.2 (2023-12-10) | MIT | no | stale; skip |
| `miditime` | Time series to a MIDI file with scale and octave control | 1.2.2 (2025-02-14) | MIT | no | fine for a MIDI route; tiny |
| `pixasonics` | Image sonification toolbox: load an image or numpy array (including image sequences), move a probe, map features (mean, median, min, max, std per channel) to synth parameters; headless and non-real-time modes | 0.1.7.1 (2026-07-29) | GPLv3 | **yes** | closest match in concept (Probe, Feature, Mapper, Synth), but GPL, Jupyter-centred, classifiers stop at Python 3.12 and it pins `signalflow<0.5.3`. Read its README; do not depend on it |
| `herakoi` | Webcam hand tracking over an image; the colour under the finger becomes MIDI | 0.2.0 (2023-08-01) | MIT | **yes** | pins `python-rtmidi==1.4.9` and needs mediapipe; not for 3.14. Idea source for "explore by touch" |
| `visound` | Image to sound library | 0.1.6 (2025-05-13) | none stated on PyPI and no LICENSE file found at the repository root | **yes** | no licence means no permission; do not use |

Answer to "does any accept image input": only pixasonics, herakoi and ViSound, and none fits. Everything else expects numbers we must extract first.

## E. Python vision

| Package (`pip install` name) | What it is | Latest (uploaded) | Licence | 3.14 wheel | Use |
|---|---|---|---|---|---|
| `pillow` | Open, resize and convert PNG, JPG, TIFF; `numpy.asarray(img)` gives pixels | 13.0.0 (2026-10-16) | MIT-CMU | yes (cp311 to cp315) | default image reader; its documented format list has no OpenEXR |
| `opencv-python` (`opencv-python-headless` without GUI parts) | Computer vision: video capture, colour spaces, optical flow, contours | 5.0.0.93 (2026-07-02) | Apache 2.0 | yes (`cp37-abi3`) | only if 02 calls for optical flow or contour detection. EXR reading needs the environment variable `OPENCV_IO_ENABLE_OPENEXR=1` set before `import cv2` (OpenCV forum threads) |
| `scikit-image` | Segmentation, region measurement, colour conversion | 0.26.0 (2025-12-20) | BSD | yes (cp311 to cp314) | region statistics; slower to learn |
| `imageio` | One `imread` for many formats; plugins for ffmpeg, pyav, tifffile | 2.38.1 (2026-10-08) | BSD-2-Clause | yes (pure) | convenience layer |
| `imageio-ffmpeg` | FFmpeg wrapper whose Windows wheel includes the FFmpeg executable; `read_frames(path)`, `count_frames_and_secs(path)`, `get_ffmpeg_exe()` | 0.8.1 (2026-11-03) | BSD-2-Clause | yes (`py3-none-win_amd64`) | pip-only way to decode MP4/WebM and to mux WAV with video. Its README recommends PyAV for new code |
| `av` (PyAV) | Bindings to FFmpeg's libraries | 19.0.2 (2026-10-21) | BSD-3-Clause | yes (`cp312-abi3`, Python 3.12+) | faster, frame-accurate decoding |
| `OpenEXR` | Official EXR reader: `with OpenEXR.File(p) as f: rgb = f.channels()["RGB"].pixels` | 3.5.4 (2026-11-12) | BSD-3-Clause | yes (cp311 to cp315) | EXR frame sets |
| `tifffile` | TIFF reader and writer | 2026.11.12 | BSD-3-Clause | yes (pure) | TIFF frames Pillow cannot open |
| `moviepy` | Video editing, muxing audio onto video | 2.2.1 (2025-05-21) | MIT | pure | declares `pillow<12.0`, which conflicts with Pillow 13; call the bundled FFmpeg executable through `subprocess` instead |

**Which Python version.** Python 3.14 is fine for the recommended set (numpy, scipy, pillow, scikit-image, imageio, imageio-ffmpeg, av, OpenEXR, opencv-python, soundfile, sounddevice, librosa). `strauss` is itself pure Python, but its long dependency list was not checked package by package. Packages seen today **without** a Python 3.14 Windows wheel: `tinysoundfont` (up to cp312), `python-rtmidi` (up to cp312), `pygame` and `PyAudio` (up to cp313), `simpleaudio` (cp37 and cp38 only), `audiocraft` (its README requires Python 3.9), `stable-audio-tools` (requires Python 3.10), `pixasonics` (classifiers up to 3.12), `herakoi` (old pins). **Python 3.12 is the safe choice** if any of these is needed: tinysoundfont, python-rtmidi, pygame and PyAudio all ship cp312 Windows wheels, and everything in the recommended set supports 3.12. simpleaudio and the two AI packages do not install there either. If a laptop refuses to create a new virtual environment, `python -m pip install --user ...` into the existing interpreter is enough for the core set.

## F. Live-coding and patching environments

None of these belongs in the shipped product: judges and blind users cannot run a desktop patch from a link. Their value is as a sound-design sketchpad.

| Tool | What it is | Version seen | Licence | Windows / browser | Est. hours | Verdict |
|---|---|---|---|---|---|---|
| Sonic Pi | Code-based music instrument for learners; OSC and MIDI in and out on desktop | v5.0.0 | MIT (main source) | yes / a browser version exists | 0.5 | best sketchpad: audition scales and timbres, or drive it from Python with `python-osc` |
| SuperCollider | Synthesis server plus language | 3.14.1 | GPL-3.0 | yes (installer) / no | 3 to 5 | most powerful, too slow to learn now |
| Pure Data (vanilla) | Visual patching for audio | 0.57-0 | BSD-style | yes / no | 2 to 4 | skip |
| plugdata | Friendlier Pure Data, standalone or as VST3/AU/CLAP/LV2 plugin | not shown on its site | GPL-3.0 | yes / no | 2 to 4 | skip |
| Max/MSP + RNBO | Commercial patching; RNBO exports a patch to Web Audio, C++, plugins, Raspberry Pi | prices not shown on the page | proprietary; trial disables saving | yes / export only | 3+ | skip |
| ChucK | Timing-centred audio language; WebChucK runs it in browsers | 1.5.5.9 | dual MIT / GPL-2.0-or-later | yes / yes (WebChucK) | 2 | interesting, but Tone.js is closer to our skills |
| Csound | Classic synthesis language; `@csound/browser` WebAssembly build | 7.0.0 | LGPL-2.1+ | yes / yes | 4+ | skip |
| TidalCycles | Pattern language embedded in Haskell; sound through SuperDirt in SuperCollider | not shown | GPL-3.0 | yes, long install (its Windows route uses Chocolatey to add Git, GHC and cabal, SuperCollider, sc3-plugins, SuperDirt and an editor) / no (Strudel is its browser port) | 2+ install | skip |
| VCV Rack | Virtual Eurorack modular synth | 2.6.6 Free (Pro USD 149) | GPL-3.0-or-later with a plugin exception | yes / no | 2 | no simple data input; skip |
| TouchDesigner | Node-based real-time visuals and audio | 2025.33230 (2026-09-01) | proprietary; free Non-Commercial licence limited to 1280x1280 | yes / no | 3+ | skip |

## G. DAWs, editors and command-line tools

A DAW in the pipeline weakens the claim "generated from the frames": anything arranged by hand is no longer a function of the data. Use these to inspect and package, not to compose.

| Tool | Version seen | Licence / price | Use for us |
|---|---|---|---|
| Audacity | 4.0.2 | GPLv3; free | Inspect waveforms and spectrograms, trim, export. **Import Raw Data trick** (File > Import > Raw Data): Audacity reads any file's bytes as audio; you choose encoding, byte order, channels, start offset, amount to import and sample rate (100 to 384,000 Hz). An image file imported this way is noise, which makes a neat 10-second demonstration of why a direct translation fails. Feed it an uncompressed image (BMP or raw; PNG and JPEG bytes are compressed data, not pixels): 1920 x 1080 RGB is 6,220,800 bytes, which plays for 141 s as 8-bit mono at 44,100 Hz |
| Sonic Visualiser | 5.2.1 | GPL v2 or later; free | Check that the sound follows the data (for example that pitch rises when the feature rises); evidence for the Validity criterion |
| REAPER | 7.86 (2026-11-13) | proprietary; 60-day full-function evaluation; USD 60 discounted licence | only if someone already uses it |
| Ableton Live (and Max for Live) | Live 12; 30-day trial of Suite | proprietary | skip; whether the trial includes Max for Live was not stated on the page |
| Logic Pro / GarageBand | versions not shown | Apple only. Logic Pro: Mac and iPad; USD 199.99 one-time on Mac, or inside the Apple Creator Studio subscription (USD 12.99 per month, 30-day trial). GarageBand: macOS and iOS; Apple's page states neither a price nor licence terms for its loops | skip unless someone has a Mac and already knows it |
| LMMS | 1.2.2 (2020-06-25); 1.3.0-alpha.2 | GPL-2.0; free | free way to audition a `.mid` with instruments |
| BandLab | web app (also iOS, Android) | proprietary service; its site calls the Studio "100% free" and its loops "royalty-free"; terms of use not read | skip: its loops are third-party content |
| SoX | 14.4.2 (SourceForge last updated 2024-11-28) | GPL / LGPL | not installed; numpy or FFmpeg covers it |
| FFmpeg | 9.0.2 "Lei" (2026-09-18); 8.1.3 (2026-09-21) | LGPL 2.1+, GPL 2+ when GPL parts are enabled; Windows builds from gyan.dev and BtbN | extract frames, attach our WAV to the MP4, encode MP3/OGG. If installing is restricted, `imageio-ffmpeg` already carries an executable |

## H. Image-to-sound applications

All of these implement one idea, the image as a spectrogram: horizontal position is time, vertical position is frequency, brightness is loudness. That is the "naive mapping" our notes warn about.

| Tool | Version seen | Price / licence | Mapping | Use for us |
|---|---|---|---|---|
| The vOICe (Peter Meijer) | Windows, Android, web app | free Windows version; proprietary | scans left to right, by default one image per second; higher pitch means higher in the image; louder means brighter; stereo pans with the scan | prior art to cite for blind users. Its training manual asks for daily practice sustained for at least a year, evidence that this mapping is not learnable in a 30-second demo |
| Photosounder | 1.12 (June 2026) | USD 59; demo cannot save and inserts silence every 12 s | image edited as a spectrogram | skip |
| Virtual ANS | 3.0.4 (2025-10-03) | donation-supported; licence not stated | image to sonogram and back; Windows, Linux, macOS, iOS, Android | fastest free way to hear a frame as a spectrogram |
| ARSS | 0.2.3 (2008) | licence not stated on its page; site on hiatus | image rows drive sines or filtered noise; command line | historical; superseded by Photosounder |
| Coagula Light | 1.666 | freeware, Windows | one sine per image line; red is left, green is right, blue adds noise | historical |
| AudioPaint | 1.3 (2007) and 3.0 on third-party listings only | freeware, Windows | pixel position and colour to frequency, amplitude, pan | historical |

Useful move: render one frame through Virtual ANS (or our own 20-line numpy version of the spectrogram mapping) as the **baseline condition** in the listening test, and compare it with our mapping. "Listeners answered correctly N of 10 with ours against M of 10 with the standard image-as-spectrogram method" is a validity result few teams will have.

## I. AI audio

| Model / service | Licence | Requirements seen | Fit |
|---|---|---|---|
| MusicGen and the AudioCraft family (Meta) | code MIT; model weights CC-BY-NC 4.0 | README: Python 3.9, PyTorch 2.1.0; PyPI `audiocraft` 1.3.0 (2024-06-03), source only; repo last pushed 2026-03-03 | non-commercial weights; separate old Python; text-to-music, not data-driven |
| Stable Audio Open 1.0 (Stability AI) | Stability AI Community License; files gated behind accepting terms on Hugging Face | up to 47 s stereo at 44.1 kHz; `stable-audio-tools` 0.0.20 requires Python 3.10; trained on Freesound and Free Music Archive recordings under CC0, CC BY, CC Sampling+ | custom licence to explain in references; needs a GPU to be practical (not stated on the card) |
| Magenta RealTime 2 (Google) | code Apache-2.0; weights CC-BY 4.0; the model card says Google claims no rights in generated outputs | real-time streaming on Apple Silicon only; offline on Apple Silicon or an NVIDIA GPU; `uv pip install "magenta-rt[mlx]"` | cleanest licence, but no Windows or browser path documented |
| Lyria RealTime (Gemini API) | hosted service; terms not on the page read | model `models/lyria-realtime-exp`, experimental; WebSocket; steerable by weighted prompts, bpm 60 to 200, scale, density, brightness; 48 kHz stereo PCM; instrumental only; the docs say output audio is always watermarked | needs an API key, which a static public site would expose (inference); only its control parameters could be data-driven |
| Suno, Udio, ElevenLabs Music | not researched (unverified) | | |

Rule implications (03-rules-and-deadline.md): AI is allowed, but every tool and how it was used must be declared, AI audio must be acknowledged in the description, and nothing AI-made may carry NASA branding. This applies to AI coding assistants too. Design implications: a text-to-music model produces music about a prompt, not a function of pixel values. The same frame gives different audio each run, the mapping cannot be documented, and a judge cannot audit it. That fails the "data fidelity" half of the brief. One of 46 sampled repositories references AI music services. **Recommendation: no generative audio.** If the team insists, limit it to a clearly labelled background bed and declare it.

## J. What comparable teams used

### Past Space Apps sonification repositories (file trees read through the GitHub API today)

| Project | Year | Stack seen in the repository |
|---|---|---|
| SongSAT (`mcvittal/SongSAT`) | 2018, Most Inspirational | Python: numpy, MIDIUtil, Pillow, matplotlib; three MP3 files committed |
| Galaxy Grooves (`GalaxyGrooves/nasa-galaxygrooves`) | 2023 | Python: numpy, standard-library `wave`, sounddevice, OpenCV, Pillow, Streamlit |
| Sounds-of-Space (`andrii0yerko/Sounds-of-Space`) | 2023 | Python: numpy, scipy, mido, audiolazy, matplotlib |
| cosmic-harmony (`vivekanandba/cosmic-harmony`) | 2023 | Python notebooks: numpy, MIDIUtil, pygame, audiolazy, a text-to-speech package, Pillow, imageio, Streamlit, FFmpeg |
| Cosmic-Harmony-Sonifying-Space (`Dante-Masciotra/...`) | 2023 | Python: numpy, pydub, mido, FluidSynth, pygame, OpenCV, Pillow, moviepy |
| SpaceOudacity (`evandigby/SpaceOudacity`) | 2023 | C# (not scanned further) |
| SPACETUNE | 2022, Global Nominee | Python, librosa, pydub, audiolazy, per its project page (see 01-winners-analysis.md in the team notes); repository not found |
| Arcobaleno | 2023, Global Connection winner | repository and stack not found |

Tally: 5 of 6 scanned repositories are Python; 4 of 6 write MIDI (MIDIUtil or mido); 2 use Streamlit; none uses browser audio.

### 2026 Earth Information Jukebox repositories

Method: a GitHub repository search for "earth information jukebox" (name, description or README; created since 2026-11-01) returned 148 hits at about 18:55 UTC today (an upper bound; a few are unrelated). GitHub's primary-language labels: JavaScript 44, TypeScript 44, HTML 23, Python 19, none 13, other 5. I scanned 46 of them (the 38 most recently pushed with at least 30 kB of content, plus 8 whose descriptions mention EIC frames or that the team notes name), reading manifests, the README and up to 22 source files each and matching library names with regular expressions. Counts are therefore "at least", and a string match is not proof of use.

| Signal | Repositories (of 46) |
|---|---|
| ARIA attributes in markup | 40 |
| Mentions `svs.gsfc.nasa.gov` | 30 |
| Raw Web Audio API (`AudioContext`, `createOscillator`) | 29 |
| Canvas `getImageData` | 25 (17 of them also mention SVS) |
| Vite / React | 22 / 19 |
| Web Speech API (spoken output) | 20 |
| Tone.js | 19 (13 Tone only, 23 raw only, 6 both, 4 neither) |
| Python numpy / Pillow / OpenCV / FastAPI | 19 / 12 / 8 / 9 |
| Audio files committed | 18 (11 with ten or more) |
| Mentions of time-series sources (GISTEMP, sea ice, NOAA, POWER) | 27 |
| `navigator.vibrate` | 12 |
| LLM API references (OpenAI, Anthropic, Gemini) | 12 |
| three.js or WebGL | 10 |
| Python `wave` / scipy / STRAUSS | 6 / 6 / 2 |
| `requestVideoFrameCallback` | 2 |
| AI music services | 1 |
| EXR or TIFF files, MIDI files, soundfonts, WebCodecs, opencv.js, MediaPipe, ffmpeg.wasm, smplr, Strudel, Magenta.js, p5, Howler | 0 |

What this says:

- The popular stack is "web app, Web Audio or Tone.js, canvas pixels, speech". Choosing it does not set us apart; executing it better does.
- More than half the sample also mentions time-series datasets, which is off the official brief (frames, not series).
- Nobody commits EXR or TIFF frames, and almost nobody syncs to the video frame. Offline processing of the original frame sets plus frame-accurate sync is open ground.
- Accessibility features are near-universal. A measured listening test is not something a repository scan can show, and is likely rare.

## Top dozen candidates compared

| Candidate | Runs on Windows / in browser | Licence | Est. hours to first result | Data fidelity control | Musical result | Risk this weekend | Verdict |
|---|---|---|---|---|---|---|---|
| Web Audio API | n/a / yes | built in | 1 | total | what you build | medium: more code | fallback to Tone.js |
| Tone.js 15.1.22 | n/a / yes | MIT | 0.5 | total | good synths, effects, scales by hand | low | **use** |
| tonal 6.5.1 | n/a / yes | MIT | 0.3 | n/a | scale and chord lookups | low | optional |
| smplr 1.2.0 | n/a / yes | MIT + sample licences | 0.5 | total | realistic instruments | medium: network and sample licences | optional, one instrument |
| Canvas 2D | n/a / yes | built in | 0.5 | pixels of same-origin frames only | n/a | low | use for self-hosted frames |
| `requestVideoFrameCallback` | n/a / yes | built in | 0.5 | frame-accurate timing | n/a | low | **use** |
| numpy + `wave` | yes / no | BSD + PSF | 0.5 | total, reproducible | plain unless shaped | low | **use** for WAV renders |
| Pillow | yes / no | MIT-CMU | 0.3 | reads real frames | n/a | low | **use** |
| imageio-ffmpeg or PyAV | yes / no | BSD | 0.5 | every video frame | n/a | low | **use** one |
| opencv-python | yes / no | Apache-2.0 | 1 to 2 | motion and shape features | n/a | low | only if needed |
| STRAUSS | yes / no | Apache-2.0 (repo) | 2 to 3 | high, series-based | chord-constrained, spatial | medium: heavy install, new concepts | optional for polished renders |
| MIDI route (`MIDIUtil` or `mido`, then FluidSynth) | yes with extra install / no | MIT + LGPL-2.1 + soundfont licence | 2 to 3 | notes only | realistic instruments | high: native install on Windows | skip |

## Three stacks

**Stack 1: static web app, Tone.js plus precomputed features.** GitHub Pages; `index.html`, vendored Tone.js, `features/<svs-id>.json`, the SVS video in a `<video>` tag.
- Pros: a judge clicks a link and hears it; interactive (tempo, solo a layer, scrub); small repository; live captions and speech are easy.
- Cons: browser audio differs slightly per device, so it is a weaker base for a controlled listening test; no downloadable audio unless you add `Tone.Offline`; needs a click before sound.
- Effort: about 12 to 18 person-hours for four visualizations, once the features exist.

**Stack 2: Python offline renderer plus a gallery page.** numpy writes one WAV per visualization, FFmpeg attaches it to the video, a plain HTML page lists the clips with text descriptions.
- Pros: lowest technical risk; identical audio for every listener; fully reproducible (`python render.py 5313`); the challenge explicitly accepts "a curated collection of original, generated audio files".
- Cons: not interactive; it reads as a playlist, which fits "Art & Technology" less well; files are large (5.29 MB per mono minute as WAV, so encode to MP3 or OGG for the page).
- Effort: about 8 to 12 person-hours.

**Stack 3: hybrid (recommended).** One Python script per visualization emits both `features.json` and a reference WAV from the **same mapping table**; the web app plays the features live with Tone.js and offers the WAV as a download and as the fallback when audio is blocked.
- Pros: both deliverable forms; the WAVs feed the listening test and the 30-second demo video; the live app carries the accessibility story.
- Cons: the mapping exists twice (Python and JavaScript). Keep its numbers in one shared `mapping.json` (ranges, scale, instruments) that both sides read.
- Effort: about 16 to 24 person-hours across four people; the offline half is done first, so there is always something to submit.

### Single recommendation for this team

Build Stack 3 in this order, so that every stage is submittable:

1. (Hours 0 to 4) Person A: Python frame pipeline for two visualizations (night lights 5313 from its movie, and 5533 air quality or 3912 ocean currents from their PNG frame sets), output `features.json`. Person B: Tone.js prototype driven by fake features. Person C: page skeleton with keyboard control, ARIA live region and speech. Person D: numpy renderer producing the first WAV; start `REFERENCES.md`. Business member: listening-test protocol and recruiting.
2. (Hours 4 to 12) Join real features to the synth; sync with `requestVideoFrameCallback`; agree the mapping table; render stimuli for the test, including the spectrogram baseline.
3. (Hours 12 to 22) Run the test; add two to four more visualizations; write the mapping legend.
4. (Last hours) Demo video from the rendered WAVs, references, AI declaration, licence file.

Skip React, a backend, a database, live pixel analysis of SVS media, MIDI, and AI audio.

## Licence table for the recommended stack (what to cite)

List each line in the submission's references with its URL. Versions are the ones seen today; record the versions you actually install.

| Component | Version | Licence | Role | Reference line must include |
|---|---|---|---|---|
| Tone.js | 15.1.22 | MIT | browser synthesis and scheduling | name, version, repository URL, MIT; keep the licence notice with the vendored file |
| tonal (optional) | 6.5.1 | MIT | scale lookups | name, version, URL |
| smplr (optional) | 1.2.0 | MIT (per npm) | sample player | name, version, URL, plus each sample set used |
| Salamander Grand Piano samples (optional, served from `tonejs.github.io/audio/salamander/`) | n/a | CC BY 3.0, Alexander Holm (licence seen in search snippets only) | piano timbre | author, title, licence, source URL |
| FluidR3_GM pre-rendered soundfont (optional, via `gleitz/midi-js-soundfonts`) | n/a | Creative Commons Attribution 3.0 per that repository's README | GM instruments | soundfont name, licence, repository URL |
| Splendid Grand Piano samples (optional, via smplr) | n/a | public domain per the `sfzinstruments/SplendidGrandPiano` README | piano timbre | name, source URL, and that our audio derives from it (the README asks for this) |
| VCSL samples (optional, via smplr `Mallet`) | n/a | CC0 per the `sgossner/VCSL` repository | mallet timbres | name and source URL (credit is not required, but the rules want every resource listed) |
| numpy | 2.5.x | BSD-3-Clause (plus bundled components) | arrays and synthesis | name, version, URL |
| Pillow | 13.0.0 | MIT-CMU | image reading | name, version, URL |
| imageio / imageio-ffmpeg | 2.38.1 / 0.8.1 | BSD-2-Clause; the bundled FFmpeg executable is LGPL or GPL depending on its build (not checked) | video frames, muxing | both names, and "FFmpeg" as the tool that decoded and encoded |
| PyAV (if used) | 19.0.2 | BSD-3-Clause | video frames | name, version, URL |
| OpenEXR (if used) | 3.5.4 | BSD-3-Clause | EXR frames | name, version, URL |
| opencv-python (if used) | 5.0.0.93 | Apache 2.0 | motion and shape features | name, version, URL |
| STRAUSS (if used) | 1.0.3 | Apache-2.0 in the repository (PyPI metadata says MIT) | offline sonification | name, version, URL, and its paper (arXiv 2311.16847) |
| Python standard library (`wave`, `json`) | 3.14 | PSF licence | WAV writing | "Python 3.14" |
| Browser built-ins (Web Audio, Web Speech, Canvas, Vibration, `requestVideoFrameCallback`) | n/a | none | platform | describe in the method text; no licence line needed |
| NASA SVS visualizations | per page | see 01-where-the-sounds-come-from.md | the data | SVS ID, title, URL and the credit line from each page |
| Audacity / Sonic Visualiser / Virtual ANS (if used for checking or the baseline clip) | 4.0.2 / 5.2.1 / 3.0.4 | GPLv3 / GPL v2+ / not stated | inspection, baseline | name, version, what it was used for |
| AI assistants and any AI-generated asset | n/a | n/a | declared use | tool name and what it produced, in the AI field |

Notes. Using a GPL program as a tool (Audacity, FFmpeg) does not put our code or our audio under the GPL; linking a GPL library into the app does (standard reading, not legal advice, not re-verified today). MIT, Apache-2.0, BSD, ISC, MPL-2.0, LGPL, GPL and AGPL are all on the OSI list read today, so a GPL or AGPL dependency is permitted by the rules, but it would decide our own licence for us; the recommended stack avoids that. Of the 148 search hits, 106 show no licence in GitHub's listing (25 MIT, 9 Apache-2.0, 2 GPL-3.0, 6 unrecognised), so a clean licence and reference list is itself a small edge.

## Open questions / unverified

- Salamander piano licence (CC BY 3.0, Alexander Holm) was read in search-result snippets of the sfzinstruments pages, not on the page itself.
- FluidR3_GM is CC BY 3.0 according to the `gleitz/midi-js-soundfonts` README; other distributions of that soundfont may state different terms.
- smplr: npm says MIT; the GitHub API reports no detected licence file. STRAUSS: PyPI says MIT, the repository file is Apache-2.0. Cite what the repository states.
- Not tested in a browser: `requestVideoFrameCallback` on SVS-hosted video; that `crossorigin="anonymous"` breaks SVS media loading; the WebGL cross-origin rule; the Tone.js snippet. CDN URLs returned HTTP 200 but were not loaded in a page.
- pydub on Python 3.14: its source imports `audioop`, STRAUSS declares `audioop-lts` for Python 3.13+, and `import audioop` fails on this laptop's Python 3.14.6 (measured); pydub itself was not installed to confirm the failure; that MP3 export needs FFmpeg is from memory.
- VCSL is CC0 per its repository, but which VCSL instruments smplr's `Mallet` exposes was not listed there. The TidalCycles Windows component list comes from a search summary of its install page.
- Whether `soundfile` and `sounddevice` wheels bundle their native libraries on Windows; whether FluidSynth publishes ready Windows binaries for 2.6.2; whether moviepy runs with Pillow 13; whether pixasonics installs on 3.14.
- The licence of the FFmpeg build inside `imageio-ffmpeg` (matters only if we redistribute the executable).
- Highcharts: its education page and its EULA appear to disagree about free coursework use (search summary); irrelevant if we skip it.
- Lyria RealTime pricing and terms; Suno, Udio, ElevenLabs Music: not researched. BandLab's terms of use and the licence of GarageBand and Logic Pro loops were not read.
- Arcobaleno (2023 winner) and SPACETUNE (2022) repositories were not found, so their stacks are unconfirmed here.
- The 46-repository scan matches strings in at most 22 files per repository; treat counts as indicative. Release years for Sonic Pi v5.0.0 (7 August) and FluidSynth 2.6.2 (1 November) were not shown on the pages.
- Re-hosting SVS frames or videos in our repository: usage terms are covered in 01, not checked here.
- "Est. hours" figures are judgment, not measurement.

## Sources

Registries and APIs (queried 2026-11-14):

- PyPI JSON API - https://pypi.org/pypi/numpy/json (same pattern for every Python package named above) - version, upload date, licence, `requires_python`, dependency pins and wheel tags
- npm registry - https://registry.npmjs.org/tone (same pattern for every npm package named above) - version, publish date, licence, repository, dist-tags
- jsDelivr data API - https://data.jsdelivr.com/v1/packages/npm/tone@15.1.22 (same pattern for the other packages) - exact file paths and sizes behind the script tags
- GitHub REST API - https://api.github.com/repos/Tonejs/Tone.js (same pattern for other repositories) - licence, last push, archived flag, stars
- GitHub repository search API - https://api.github.com/search/repositories - the 148-hit list of 2026 Jukebox repositories and their language labels
- Local EIC crawl - spaceapps-eic-evidence/framesets.json and media.json - frame-set and media format counts

Official project pages as given in that registry metadata (the URLs were read from PyPI or npm today; the pages themselves were not all opened):

- numpy - https://numpy.org - project site
- scipy - https://scipy.org/ - project site
- soundfile - https://github.com/bastibe/python-soundfile - repository
- sounddevice - https://python-sounddevice.readthedocs.io/ - documentation
- librosa - https://librosa.org - project site
- pyo - https://github.com/belangeo/pyo - repository
- mido - https://mido.readthedocs.io - documentation
- MIDIUtil - https://github.com/MarkCWirt/MIDIUtil - repository
- music21 - https://www.music21.org/music21docs/ - documentation
- scamp - http://scamp.marcevanstein.com/ - documentation
- pyfluidsynth - https://github.com/nwhitehead/pyfluidsynth - repository
- pydub - http://pydub.com - project site
- DawDreamer - https://github.com/DBraun/DawDreamer - repository
- python-osc - https://github.com/attwad/python-osc - repository
- astronify - https://github.com/spacetelescope/astronify - repository
- sonecules and pya - https://github.com/interactive-sonification/sonecules/ and https://github.com/interactive-sonification/pya - repositories
- miditime - https://github.com/mikejcorey/miditime - repository
- Pillow - https://python-pillow.org - project site
- opencv-python - https://github.com/opencv/opencv-python - repository
- scikit-image - https://scikit-image.org - project site
- imageio - https://github.com/imageio/imageio - repository
- PyAV - https://pyav.basswood.io - documentation
- OpenEXR - https://openexr.com - project site
- tifffile - https://www.cgohlke.com - author's site
- Howler.js - https://howlerjs.com - project site
- soundfont-player - https://github.com/danigb/soundfont-player - repository
- @tonejs/midi - https://github.com/Tonejs/Midi - repository
- Strudel source - https://codeberg.org/uzu/strudel - repository
- opencv.js on npm - https://github.com/TechStark/opencv-js - repository
- mp4box - https://github.com/gpac/mp4box.js - repository
- Mediabunny - https://mediabunny.dev/ - project site
- SignalFlow (used by pixasonics) - https://signalflow.dev/ - project site

Browser audio and sonification:

- Tone.js repository and README - https://github.com/Tonejs/Tone.js - install, MIT, `Tone.start()` rule, Transport, Sampler with the Salamander base URL
- Tone.js API docs, Offline - https://tonejs.github.io/docs/15.1.22/functions/Offline.html - `Tone.Offline` signature
- Tone.js build on jsDelivr - https://cdn.jsdelivr.net/npm/tone@15.1.22/build/Tone.js - script URL returns 200
- Salamander sample file - https://tonejs.github.io/audio/salamander/C4.mp3 - sample host answers with `access-control-allow-origin: *`
- Salamander Grand Piano - https://sfzinstruments.github.io/pianos/salamander - licence and author (search snippet)
- smplr - https://github.com/danigb/smplr - instruments, import URL, kits, `renderOffline`, sample sources
- smplr module on unpkg - https://unpkg.com/smplr@1.2.0/dist/index.mjs - import URL returns 200
- midi-js-soundfonts - https://github.com/gleitz/midi-js-soundfonts - soundfont licences and hosted URL pattern
- Hosted soundfont file - https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3.js - file exists (2.6 MB)
- Splendid Grand Piano - https://github.com/sfzinstruments/SplendidGrandPiano - samples described as public domain, originally from Akai
- VCSL - https://github.com/sgossner/VCSL - CC0 statement for the sample library behind smplr's `Mallet` and `Versilian`
- smplr sample host - https://smpldsnds.github.io/drum-machines/TR-808/dm.json - host answers with `access-control-allow-origin: *`
- GeneralUser GS licence file - https://raw.githubusercontent.com/mrbumpy409/GeneralUser-GS/HEAD/documentation/LICENSE.txt - version 2.0.3, licence v2.0 terms
- Chart2Music README - https://raw.githubusercontent.com/julianna-langston/chart2music/HEAD/README.md - script tag, `c2mChart`, attachment to an `<img>`
- WebAudioFont - https://github.com/surikov/webaudiofont - GPL-3.0, script URLs
- Strudel project start - https://strudel.cc/technical-manual/project-start/ - script tag, `initStrudel`, AGPL summary
- tonal - https://github.com/tonaljs/tonal - browser script and example calls
- p5.sound reference - https://p5js.org/reference/p5.sound/ - class list
- Elementary Audio docs - https://www.elementary.audio/docs - description, packages, MIT
- faustwasm - https://github.com/grame-cncm/faustwasm - description and install
- Magenta.js - https://github.com/magenta/magenta-js - models, Apache-2.0
- Highcharts sonification - https://www.highcharts.com/docs/sonification/getting-started - script URLs and features
- Highcharts shop - https://shop.highcharts.com/ - licence types and prices
- Chart2Music docs - https://www.chart2music.com/docs/ - purpose, keyboard use, MIT
- Erie documentation - https://see-mike-out.github.io/erie-documentation/ - channels and limits
- Erie paper - https://arxiv.org/abs/2402.00156 - CHI 2024 reference
- TwoTone - https://github.com/sonifydata/twotone - MPL-2.0, paused status, mapping, export formats
- TwoTone site - https://twotone.io/ - still online

Browser platform:

- MDN, CORS-enabled images - https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image - tainted canvas rule
- MDN, requestVideoFrameCallback - https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback - signature, metadata, Baseline status
- MDN, WebCodecs API - https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API - no demuxing; Mediabunny named
- MDN, OfflineAudioContext - https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext - offline rendering, availability
- MDN, Web Audio best practices - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices - user-gesture rule
- ffmpeg.wasm overview - https://ffmpegwasm.netlify.app/docs/overview - packages and bundled FFmpeg version
- opencv.js build - https://docs.opencv.org/4.x/opencv.js - file size
- MediaPipe image segmenter, web guide - https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter/web_js - npm install line, WebAssembly files from jsDelivr, image and video modes
- GitHub Pages limits - https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits - 1 GB site, 100 GB bandwidth
- GitHub large files - https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github - 50 and 100 MiB limits
- OSI licence list - https://opensource.org/licenses - which licences are OSI-approved

Python:

- STRAUSS docs - https://strauss.readthedocs.io/en/latest/ and https://strauss.readthedocs.io/en/latest/detailed.html - concepts, generators, channels, input types
- STRAUSS repository - https://github.com/james-trayford/strauss - Apache-2.0 licence file
- Astronify docs - https://astronify.readthedocs.io/en/latest/ and https://astronify.readthedocs.io/en/latest/astronify/install.html - scope and install caveats
- sonoUno desktop - https://github.com/sonoUnoTeam/sonoUno-desktop - MIT licence file
- sonoUno paper - https://joss.theoj.org/papers/10.21105/joss.05819 - description (search result)
- pixasonics - https://github.com/balintlaczko/pixasonics - README concepts, GPLv3
- herakoi - https://github.com/lucadimascolo/herakoi - README, MIT
- ViSound - https://github.com/dheerajshenoy/ViSound - no licence file found
- OpenEXR on PyPI - https://pypi.org/project/OpenEXR/ - read example, BSD-3-Clause, wheels
- imageio-ffmpeg - https://github.com/imageio/imageio-ffmpeg - bundled executable, API names, PyAV advice
- pretty_midi - https://github.com/craffel/pretty-midi - `synthesize` and `fluidsynth` methods
- FluidSynth releases - https://github.com/FluidSynth/fluidsynth/releases - 2.6.2
- OpenCV forum, EXR reading - https://forum.opencv.org/t/imread-openexr-file/10268 - environment variable (search result)
- Pillow image file formats - https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html - supported formats; OpenEXR is not among them
- Local check on the team laptop - `python -I -c "import audioop"` on Python 3.14.6 - `ModuleNotFoundError`

Live coding, DAWs, image-to-sound applications:

- Sonic Pi - https://sonic-pi.net/ and https://github.com/sonic-pi-net/sonic-pi/releases - v5.0.0, platforms, OSC and MIDI
- SuperCollider downloads - https://supercollider.github.io/downloads - 3.14.1
- Pure Data - https://msp.ucsd.edu/software.html - 0.57-0
- plugdata - https://plugdata.org/ - description, GPL-3.0
- RNBO - https://cycling74.com/products/rnbo - export targets, trial
- ChucK - https://chuck.stanford.edu/ and https://github.com/ccrma/chuck - version, dual licence, WebChucK
- Csound download - https://csound.com/download.html - 7.0.0, LGPL, WebAssembly
- TidalCycles docs - https://tidalcycles.org/docs/ and https://tidalcycles.org/docs/getting-started/windows_install - description; Windows components (search result)
- VCV Rack - https://vcvrack.com/Rack - 2.6.6, Free and Pro
- TouchDesigner download - https://derivative.ca/download - build and licence tiers
- Audacity manual, Import - https://manual.audacityteam.org/man/file_menu_import.html - Import Raw Data options
- Audacity download - https://www.audacityteam.org/download/ - 4.0.2
- REAPER purchase - https://www.reaper.fm/purchase.php - evaluation and prices
- Ableton trial - https://www.ableton.com/en/trial/ - 30-day Suite trial
- GarageBand - https://www.apple.com/mac/garageband/ - platforms
- Logic Pro - https://www.apple.com/logic-pro/ - platforms, prices, trial
- BandLab - https://www.bandlab.com/ - description, free Studio, royalty-free loops claim
- LMMS download - https://lmms.io/download - versions
- Sonic Visualiser download - https://www.sonicvisualiser.org/download.html - 5.2.1, GPL
- SoX - https://sourceforge.net/projects/sox/ - 14.4.2, licence, last update
- FFmpeg download and legal - https://ffmpeg.org/download.html and https://ffmpeg.org/legal.html - versions, Windows builds, licence
- Photosounder - https://photosounder.com/ - version, price, demo limits
- Virtual ANS - https://warmplace.ru/soft/ans/ - version, platforms
- ARSS - https://arss.sourceforge.net/ - description, superseded note
- Coagula - https://www.abc.se/~re/Coagula/Coagula.html - mapping, freeware
- AudioPaint listing - https://www.440audio.com/en/software/v4442-Nicolas-Fournel-AudioPaint - description (search result)
- The vOICe - https://www.seeingwithsound.com/ and https://www.seeingwithsound.com/manual/The_vOICe_Training_Manual.htm - mapping and training statements

AI audio:

- AudioCraft - https://github.com/facebookresearch/audiocraft - licences, requirements
- Stable Audio Open 1.0 model card - https://huggingface.co/stabilityai/stable-audio-open-1.0 - licence, training data, output length, gating
- Magenta RealTime - https://github.com/magenta/magenta-realtime and https://huggingface.co/google/magenta-realtime - hardware, install, licences, output-rights sentence
- Lyria RealTime docs - https://aistudio.google.com/docs/realtime-music-generation - model ID, controls, output format, watermark sentence

Past Space Apps repositories:

- SongSAT - https://github.com/mcvittal/SongSAT - 2018 stack
- Galaxy Grooves - https://github.com/GalaxyGrooves/nasa-galaxygrooves - 2023 stack
- Sounds-of-Space - https://github.com/andrii0yerko/Sounds-of-Space - 2023 stack
- cosmic-harmony - https://github.com/vivekanandba/cosmic-harmony - 2023 stack
- Cosmic-Harmony-Sonifying-Space - https://github.com/Dante-Masciotra/Cosmic-Harmony-Sonifying-Space - 2023 stack
- SpaceOudacity - https://github.com/evandigby/SpaceOudacity - 2023, C#
