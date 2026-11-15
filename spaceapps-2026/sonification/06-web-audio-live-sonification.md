# 06 - Live sonification in the browser: Web Audio, Tone.js, video frames, CORS, deployment

> Status: researched 2026-11-14; content fact-checked the same day by a second worker (185 items, fixes applied, skeleton run in Chromium). The link and licence check did NOT finish.

Scope: the engineering guide for an interactive web jukebox with a public demo link. Sound design lives in 03-sonification-mapping-and-synthesis.md and 04-making-it-musical.md, frame analysis in 02-frame-analysis-algorithms.md, full programs in 08-recipes-python.md and 09-recipes-browser.md.

"Measured" below means: taken on 2026-11-14 between 18:49 and 19:16 GMT from the team laptop (Windows 11), with `curl` and with a Chromium 156 engine (the desktop app's built-in browser pane). That pane was hidden during the tests and does not enforce the autoplay policy, so timings are indicative and autoplay must be re-tested in real Chrome and Safari.

## TL;DR

- **A web page cannot read the pixels of files hot-linked from svs.gsfc.nasa.gov.** Every SVS response (video, frame PNG, still, API JSON) carries the fixed header `access-control-allow-origin: https://tempo.multiverse.music`. Measured in a browser: the image or video displays, but `getImageData` throws `SecurityError`; with `crossorigin="anonymous"` the file does not load at all; `fetch()` of the API fails.
- **Fix: copy what you need into your own site.** Self-host small H.264 MP4 clips (no audio track, about 1 Mbit/s, under 10 MB each) and precompute per-frame features into JSON with Python. GitHub Pages serves files with `Access-Control-Allow-Origin: *` and byte ranges (measured), so pixels are readable and seeking works. Locally, `python -m http.server` does not answer byte ranges and Chromium then cannot seek the video at all (measured); use the Node `serve.js` from 09-recipes-browser.md.
- **Architecture: build pattern B first (precomputed timeline), then add pattern C (live probe).** The video element is the clock; a Tone.js Transport tick reads `video.currentTime`, looks up the features, and plays notes. The probe lets a user move a pointer or the arrow keys over the frame and hear the brightness under it. Skip the fully live pattern A as the main path.
- **Use Tone.js 15.1.22** (MIT licence, the npm `latest` tag, 345,500 bytes, about 80 kB gzipped). Pin the exact version; the `next` tag (15.5.72, published today) is a pre-release channel.
- **Audio only starts inside a click or key press**: `await Tone.start()`. On iPhone the silent switch mutes Web Audio by default (WebKit bug 237322); the fix a WebKit engineer gives there is `navigator.audioSession.type = "playback"` (Safari-only, experimental, not tested on a device here).
- **Never assign a parameter value every frame; ramp it** (`param.rampTo(value, 0.1)`). Throttle analysis to 10 to 15 Hz, cap polyphony at about 8 voices, and leave at least 6 dB of headroom through instrument volumes: the limiter at the end of the chain will not save you (measured: `Tone.Limiter(-1)` is almost transparent; an 8-voice full-velocity chord that peaks at 3.13 without it still peaks at 2.84 with it).
- **Export the playlist with `Tone.Offline`** (4 s rendered in 0.8 s here) plus a 20-line WAV encoder; use `Tone.Recorder` only to capture a live performance.
- A 122-line skeleton for patterns B + C is at the end; it passed `node --check` and ran end to end in Chromium 156.

## Decisions for the Jukebox build

Ranked. Each line says what to do, why, and what it costs.

1. **Self-host downsampled, audio-stripped copies of 6 to 10 EIC clips in the repo.** Why: the only way to get readable pixels, working seek and an offline demo. Cost: someone installs ffmpeg (not on this machine), about 50 to 100 MB in the repo, and each clip needs its SVS credit line.
2. **Precompute features offline into one small JSON per clip (pattern B).** Why: heavy analysis (optical flow, colour-bar inversion) is possible in Python, the result is deterministic and documentable (the Validity criterion), and the browser part becomes trivial. Cost: a new clip needs a pipeline run; it is not "live" for arbitrary video.
3. **Add the live probe (pattern C) once B plays.** Why: it is the feature that turns a playlist into an instrument and gives blind and low-vision (BVI) users agency; it is about 30 lines. Cost: requires decision 1 (same-origin video).
4. **Tone.js 15.1.22, vendored** (copy `build/Tone.js` into `vendor/`), not raw Web Audio and not a CDN-only dependency. Why: Transport, synths, effects and offline rendering for free; no network dependency at judging time. Cost: 345 kB; list it in the references.
5. **The muted `<video>` is the master clock; sound follows it.** Why: seek, pause, loop and speed then need four event handlers and no drift correction. Cost: time resolution is one musical step (0.31 s at 96 BPM in the skeleton), fine for slowly changing Earth data.
6. **Deploy on GitHub Pages.** Why: already planned, HTTPS, permissive CORS, 1 GB site and 100 GB/month. Cost: 100 MiB per-file block, about 10 minutes of browser caching after each deploy.
7. **Render the audio playlist with `Tone.Offline`, normalise, save WAV, then compress.** Why: reproducible files from the same mapping code as the live page (notes and timing repeat exactly; a `Tone.Reverb` tail differs from render to render, see section 9, so publish the rendered files). Cost: the graph-building code must be a function you can call in both contexts.
8. **Skip this weekend:** AudioWorklet (custom DSP), WebCodecs, OffscreenCanvas workers, HRTF 3D panning, any CORS proxy, a service worker for video, and Netlify's free plan (every production deploy costs credits).

## 1. CORS and the tainted canvas (make or break)

### Terms

- **Origin**: scheme + host + port, for example `https://team.github.io`. Two URLs with different origins are "cross-origin".
- **CORS** (Cross-Origin Resource Sharing): the server opts in to cross-origin reading by sending `Access-Control-Allow-Origin: <origin or *>`.
- **Tainted canvas**: MDN: "As soon as you draw into a canvas any data that was loaded from another origin without CORS approval, the canvas becomes tainted." Then `getImageData()`, `toBlob()`, `toDataURL()` and `captureStream()` throw `SecurityError`.
- To read cross-origin pixels you need both: the server header, and `crossorigin="anonymous"` on the `<img>` or `<video>`. MDN on `<img>`: if the attribute is set and the server does not allow your origin, "the browser blocks the image from loading".

### Measured response headers (curl -sI, three runs each: no Origin, `Origin: https://example.org`, `Origin: http://localhost:8000`; identical in all three)

| Target | URL path | Status | `access-control-allow-origin` | GMT |
|---|---|---|---|---|
| SVS movie (webm) | `/vis/a000000/a004900/a004950/GEDI_FL_1080p60.webm` | 200 | `https://tempo.multiverse.music` | 18:49:35 |
| SVS movie (mp4) | `/vis/a000000/a005400/a005425/perpetual_ocean2_CLOSE_095_equator_holdout_1080p30.mp4` | 200 | same | 18:49:39 |
| SVS frame PNG in a frames directory | `/vis/a000000/a003900/a003912/frames/1920x1080_16x9_30p/pacific/pacificcurrents.00000.png` | 200 | same | 18:49:43 |
| SVS still JPG | `/vis/a000000/a005300/a005313/nightlights_flat_series_and_change_wZooms_13_EIC.02599_print.jpg` | 200 | same | 18:49:48 |
| SVS still PNG | `/vis/a000000/a005600/a005669/Aerosols_2025-08-19T20_00_00_1920x1080.png` | 200 | same | 18:49:52 |
| SVS API | `/api/5313` | 200 | same, plus `vary: origin,Cookie` | 18:49:56 |
| SVS movie, GET with `Range: bytes=0-1023` | webm above | 206 | same (also when Origin is `https://tempo.multiverse.music`) | 18:51:37 |
| SVS API, OPTIONS preflight | `/api/5313` | 200 | same | 18:51:40 |
| GIBS WMTS tile (gibs.earthdata.nasa.gov) | docs example tile `MODIS_Terra_CorrectedReflectance_TrueColor/default/2012-07-09/250m/6/13/36.jpg` | 200 | `*` | 18:51:01 |
| GIBS WMS GetMap (GET) | docs example | 200 | `*` | 18:51:48 |
| NASA Image and Video Library API (images-api.nasa.gov) | `/search?...` | 200 | `*` | 18:50:32 |
| NASA Image and Video Library asset (images-assets.nasa.gov) | `/image/GSFC_20171208_Archive_e001386/...~medium.jpg` | 200 | header absent | 18:51:11 |
| GitHub Pages (mdn.github.io) | `/shared-assets/videos/flower.mp4` | 200 | `*`, with `Accept-Ranges: bytes`, `Cache-Control: max-age=600` | 19:01:42 |

SVS pages themselves also send `x-frame-options: DENY`, so an SVS page cannot be put in an `<iframe>` either.

### Measured in a browser (Chromium 156, page origin `https://example.org`, 19:00 GMT; SVS rows repeated from `http://127.0.0.1:8765`)

| Resource | `crossOrigin` | Loads | Reading pixels |
|---|---|---|---|
| SVS still JPG, SVS frame PNG | not set | yes | `SecurityError: ... The canvas has been tainted by cross-origin data.` |
| SVS still JPG, SVS frame PNG | `anonymous` | no (`error` event) | not possible |
| SVS mp4, SVS webm | not set | yes (1920x1080) | `SecurityError` once a frame is drawn |
| SVS mp4, SVS webm | `anonymous` | no: `MediaError.code` 4, message `MEDIA_ELEMENT_ERROR: Format error` | not possible |
| GIBS WMTS tile | `anonymous` | yes | OK |
| NASA Image Library asset | not set / `anonymous` | yes / no | `SecurityError` / not possible |
| mp4 on GitHub Pages (mdn.github.io) | `anonymous` | yes | OK |
| `fetch("https://svs.gsfc.nasa.gov/api/5313")` | n/a | rejected, `TypeError: Failed to fetch` | n/a |

Two traps seen in these tests: the CORS failure of a video surfaces as a misleading "Format error" (code 4), and `drawImage(video)` before the video has presented a frame draws nothing (pixels read back as `0,0,0,0`) instead of failing.

YouTube copies are no help: the player is a cross-origin `<iframe>` (the API reference says it replaces your element "with the `<iframe>` element containing the player") and its function list (play, seek, volume, rate, `getCurrentTime`) contains nothing that returns frames or pixels.

### Options

| Option | Pixels readable | Works offline | Effort | Verdict |
|---|---|---|---|---|
| Self-host downsampled copies beside the page | yes | yes | ffmpeg once per clip | **Do this** |
| Precompute features into JSON, page only plays the video | not needed | yes if the video is also local | Python pipeline | **Do this too** (pattern B) |
| Hot-link SVS video for display only (no `crossorigin` attribute) + local JSON | no | no | none | Acceptable fallback for extra clips; no probe; depends on SVS being up |
| Public CORS proxy | yes | no | none | No. cors-anywhere's public demo has needed an opt-in since February 2021 and is rate limited; any third-party proxy can vanish or alter data |
| Own proxy (Cloudflare Worker: free plan 100,000 requests/day, 10 ms CPU per request, no response-size limit) | yes | no | an hour | Unnecessary: adds a runtime dependency, and video range requests burn the quota |
| GIBS tiles live (CORS `*`) | yes | no | none | Optional bonus layer; these are not EIC frames |

### What to self-host: sizes from the local EIC crawl

Of 509 mp4/webm/m4v files with a known size, the median is 39.3 MiB; 221 are at most 25 MiB, 344 at most 100 MiB, 165 larger than 100 MiB. Of 187 frame directories, 98 hold EXR and 19 hold TIFF files, which browsers do not decode (MDN lists TIFF as Safari-only and does not list EXR); 60 hold PNG, 5 JPG. So most frame sets need an offline conversion before a browser can show them, and the PNG ones are too heavy to ship as they are (the 1920x1080 frame probed above is 2.7 MB).

| SVS id (challenge resource) | Smallest browser-ready movie | Action |
|---|---|---|
| 3912 Sea surface currents | `flat_global_ecco2_6840x3420_768p30-b1.webm`, 8.0 MiB, 1368x768, 68.7 s | Host as is, or transcode to MP4 |
| 4950 GEDI forest height | `GEDI_FL_1080p60.webm`, 2.9 MiB, 23.4 s (16 files at most 25 MiB) | Host as is |
| 5196 DYAMOND CO2 | 6.9 MiB file is HEVC; `..._globe_tilt_1080p30.mp4` is 24.5 MiB | Transcode |
| 5425 Perpetual Ocean 2 | the 2.4 to 4.9 MiB files look like overlay layers, judging by their names (`datesOnly`, `SEA_ICE_ONLY`, `equator_holdout`) | Check content, transcode a full version |
| 4960 Atmospheric river | 6.6 MiB file is named `DATE_ONLY`; the full versions are 68 MiB or more | Transcode |
| 5313 Night lights (EIC) | 32.7 MiB, HEVC, 7680x2160, 43.3 s | Must transcode |
| 5533 Air quality | smallest 178.8 MiB | Must transcode |
| 5011 Lightning | smallest 127.0 MiB | Must transcode |
| 5669 GEOS aerosols | no movie, 7 images (the 1920x1080 PNG is 2.6 MiB) | Convert stills to JPEG |
| 13786 Caldwell 73 (sonification example) | `Caldwell73_2K_Final.webm`, 5.6 MiB, 34 s | Reference only |

HEVC (H.265) is a risk: it played on this laptop, but MDN says Chrome needs hardware support for it on Windows, Linux and ChromeOS, Edge on Windows additionally needs the HEVC Video Extensions from the Microsoft Store, and Firefox added it only from version 134 (Windows; 136 on macOS, 137 on Linux and Android). MDN's most compatible choice is "An MP4 container and the AVC (H.264) video codec".

Size budget: megabytes = bitrate in Mbit/s x seconds / 8. SVS's own WebM encodes of up to 1080p run at about 1.0 to 1.5 Mbit/s (79 files in the local crawl: median 0.99, upper quartile 1.47; its MP4 files are far heavier, median 12 Mbit/s), so a 60 s clip at 1 Mbit/s is 7.5 MB and ten clips are 75 MB.

```bash
# 960 px wide, 30 fps, no audio, a keyframe every second (fast scrubbing), metadata first (fast start)
ffmpeg -i in.mp4 -an -vf "scale=960:-2,fps=30" -c:v libx264 -crf 26 -preset slow \
       -pix_fmt yuv420p -g 30 -movflags +faststart media/clip.mp4
# stills for analysis or a slideshow: 10 frames per second, 320 px wide
ffmpeg -i in.mp4 -vf "fps=10,scale=320:-2" frames/f_%05d.jpg
```

`-an` drops the audio track, `scale=960:-2` keeps the aspect ratio with an even height, `-movflags +faststart` moves the index to the start of the file, `-g` sets the group-of-pictures size, that is the keyframe interval (all four confirmed on ffmpeg.org). `-crf` and `-preset` are libx264's quality and speed knobs. In the x264 source the CRF default is 23 on a scale that ends at 51 (it is a nominal quantiser, so lower means better quality and a bigger file), and the presets run `ultrafast`, `superfast`, `veryfast`, `faster`, `fast`, `medium` (default), `slow`, `slower`, `veryslow`, `placebo`. The two commands were not run here (no ffmpeg on this machine), so check one output by eye and by size. The trailing `\` is bash line continuation; in PowerShell or cmd put the command on one line.

### Is redistribution allowed?

- Yes. SVS help page: "All of our content is in the public domain (unless otherwise noted), meaning that it is free to download, use, and redistribute for whatever purposes you see fit." It adds that music in some visualizations is licensed and "not in the public domain". This is one more reason for `-an`; the Space Apps rules forbid copyrighted music anyway.
- NASA media guidelines: NASA materials "generally are not subject to copyright in the United States"; "You may use this material for educational or informational purposes"; "NASA should be acknowledged as the source of the material"; use must not imply endorsement; "The NASA Insignia, Logotype, identifiers, and imagery are not in the public domain." Trim any title card that shows the insignia.
- Credit line: each SVS page has its own "Please give credit for this item to:" line. In the local crawl 79 of 84 saved pages have one; 47 say "NASA's Scientific Visualization Studio", but some differ (3912: "NASA/Goddard Space Flight Center Scientific Visualization Studio"; 13786: "NASA's Goddard Space Flight Center"; six pages: "NASA's Global Modeling and Assimilation Office"). Copy the line from each page you use into the page footer and the project references, with the SVS id and URL. Pages 5669 and 5533 have no "Please give credit" sentence; their credit box (read live today) says "NASA's Global Modeling Assimilation Office (GMAO) and NASA's Scientific Visualization Studio (SVS)" (5669) and "NASA's Scientific Visualization Studio and NASA's Global Modeling and Assimilation Office" (5533).

## 2. Web Audio API in ten minutes

- **AudioContext**: the engine. It owns the audio hardware connection and a clock, `audioContext.currentTime` (seconds since creation, driven by the sound card, not by JavaScript timers).
- **Audio graph**: MDN: "audio nodes ... are linked together to form an audio routing graph". You connect sources to effects to `audioContext.destination` (the speakers).

```
OscillatorNode --> BiquadFilterNode --> GainNode --> StereoPannerNode --+
AudioBufferSourceNode (a sample) --> GainNode --------------------------+--> DynamicsCompressorNode --> destination
```

| Node | What it is | Use in the jukebox |
|---|---|---|
| `OscillatorNode` | "a periodic waveform, which can be sine, square, sawtooth, triangle, or custom" | drones, tones |
| `AudioBufferSourceNode` | plays in-memory audio; "can only be played once", create a new one per hit (cheap) | samples |
| `GainNode` | "a change in volume" | loudness, fades, mixing |
| `BiquadFilterNode` | "a simple low-order filter"; types lowpass, highpass, bandpass, lowshelf, highshelf, peaking, notch, allpass | brightness to cutoff |
| `StereoPannerNode` | "pan an audio stream left or right" (-1 to 1) | horizontal position |
| `PannerNode` | 3D position; `panningModel` `equalpower` (default) or `HRTF` ("convolution with measured impulse responses from human subjects"; meant for headphone listening) | skip, stereo pan is enough |
| `ConvolverNode` | convolution with an impulse response, "often used to achieve a reverb effect" | one shared reverb |
| `DynamicsCompressorNode` | "lowers the volume of the loudest parts of a signal"; defaults threshold -24 dB, knee 30, ratio 12, attack 0.003 s, release 0.25 s | master safety |
| `AnalyserNode` | "real-time frequency and time-domain analysis" | level meter, visual feedback |
| `AudioWorklet` | your own DSP in `process()`, off the main thread, 128 samples per block | skip |

### AudioParam: ramp, do not assign

An **AudioParam** is a controllable number on a node (`gain.gain`, `osc.frequency`, `filter.frequency`). It can be scheduled:

| Method | Effect |
|---|---|
| `setValueAtTime(v, t)` | jump to `v` at time `t` |
| `linearRampToValueAtTime(v, tEnd)` | straight line from the previous event to `v` at `tEnd` |
| `exponentialRampToValueAtTime(v, tEnd)` | exponential curve; `v` must be positive (0 throws), so fade to 0.0001, not 0 |
| `setTargetAtTime(target, t0, tau)` | approach `target` exponentially from `t0`; `tau` is the time constant in seconds |
| `cancelScheduledValues(t)`, `cancelAndHoldAtTime(t)` | clear future events (`cancelAndHoldAtTime` is not implemented in Firefox, per MDN's compatibility data) |

Why ramp: a jump in gain or frequency is a step in the waveform, heard as a click; one jump per video frame is a buzz called zipper noise. Formula for `setTargetAtTime`: value(t) = target + (start - target) x e^(-(t - t0)/tau). After 1 tau the value has covered 63.2% of the distance, after 3 tau 95.0% (MDN table). Worked example: a filter at 500 Hz told to go to 2000 Hz with tau = 0.05 s is at 500 + 1500 x 0.632 = 1448 Hz after 50 ms and at 1925 Hz after 150 ms. MDN's rule of thumb: set tau to one third of the time you want the change to take. Use exponential ramps for frequency ("because of the way the human ear works", MDN) and linear ramps for pan or mix amounts. MDN also warns that while events are scheduled, assignments to `.value` are ignored.

### Two clocks and look-ahead scheduling

JavaScript timers "can easily be skewed by tens of milliseconds or more by layout, rendering, garbage collection" (web.dev). Audio events scheduled with a time argument run on the audio thread at exactly that sample. The standard pattern: a timer wakes every 25 ms and schedules everything due in the next 100 ms of audio time. Tone.js does this for you (its defaults: `lookAhead` 0.1 s, `updateInterval` 0.05 s, timer in a Web Worker). Consequence: every callback gets a `time` argument; pass it on (`synth.triggerAttackRelease(note, dur, time)`), never call "play now" inside a scheduled callback.

## 3. Autoplay, iOS and mobile

- Chrome: "The Web Audio API has been covered by autoplay since Chrome 71." A context created before a user gesture starts in state `suspended`; call `resume()` after the gesture. "Muted autoplay is always allowed", which is why the skeleton's `<video muted>` needs no gesture.
- Tone.js: `Tone.start()` is `context.resume()`. Call it first thing in a `click` or `keydown` handler, `await` it, then build the graph.
- Give the page one obvious "Play" button. Do not start sound on load: besides the policy, WCAG 1.4.2 (Level A) requires that audio playing automatically for more than 3 seconds can be paused or have its own volume control, because screen-reader speech is hard to hear over other audio.
- iOS Safari: `<video playsinline>` is required to play inline on iPhone and `<video muted>` may autoplay (WebKit, iOS 10). When the user leaves the page the context state becomes `interrupted` and "needs to be resumed" (MDN); re-check the state on every Play press (the skeleton calls `Tone.start()` on every press for this reason). The hardware silent switch mutes Web Audio while `<audio>` and `<video>` stay audible (WebKit bug 237322, reported 2022); in that bug a WebKit engineer writes that since iOS 17 `navigator.audioSession.type = "playback"` keeps Web Audio audible (the default type is `ambient`). None of this was tested on a device. MDN marks the Audio Session API experimental and limited-availability, so feature-detect: `if (navigator.audioSession) ...`.
- Mobile performance: create the context with a larger buffer, `Tone.setContext(new Tone.Context({ latencyHint: "playback" }))`, before creating any node; keep polyphony at 4 to 6; use one reverb; analyse at 10 Hz.

## 4. Tone.js 15.1.22 essentials

Load: `<script src="https://cdn.jsdelivr.net/npm/tone@15.1.22/build/Tone.js"></script>` (the same bytes are on unpkg and cdnjs; `integrity="sha384-NWoslxaf/3dYwQk+uGziDYJFdsjBpVlU1WpFRexuDFcIk/5PJpCbpVXia2Uikeix"` with `crossorigin="anonymous"` if you want Subresource Integrity). Better: download that file into `vendor/` and load it locally. The README's `<script src="http://unpkg.com/tone">` is unpinned; do not use it. In version 15 the README and docs use the functions `Tone.getTransport()`, `Tone.getDestination()`, `Tone.getDraw()`, `Tone.getContext()`; the older `Tone.Transport`, `Tone.Destination` and `Tone.Draw` objects that most web tutorials show are still exported by the 15.1.22 build.

**Time**: `Tone.now()` is the audio clock plus `lookAhead`; `Tone.immediate()` is the audio clock itself. Durations can be seconds (`0.25`) or musical values (`"8n"` is an eighth note, `"1m"` one bar).

**Transport** (`Tone.getTransport()`): the musical timeline. BPM (beats per minute) default 120.

| Member | Meaning |
|---|---|
| `bpm.value = 96`, `bpm.rampTo(120, 10)` | tempo, can be ramped |
| `start(time?, offset?)`, `pause()`, `stop()`, `state` | run control |
| `seconds`, `position` | read or set the timeline position (setting jumps) |
| `schedule(cb, time)`, `scheduleOnce(cb, time)` | one callback at a timeline position; returns an id for `clear(id)` |
| `scheduleRepeat(cb, interval, startTime?, duration?)` | repeating callback, `cb(time)` |
| `loop`, `setLoopPoints(start, end)` | loop a region |
| `cancel(after?)` | remove scheduled events |

Event helpers that sit on the Transport: `new Tone.Loop(cb, interval)`, `new Tone.Part(cb, [[time, value], ...])` (a list of timed events, the natural container for a precomputed note list), `new Tone.Sequence(cb, events, subdivision)` (evenly spaced steps), `new Tone.Pattern(cb, values, patternName)` (arpeggiator). Each needs `.start(0)` and a running Transport.

**Instruments** (play with `triggerAttackRelease(note, duration, time?, velocity?)`; `NoiseSynth` has no note argument: `triggerAttackRelease(duration, time?, velocity?)`):

| Class | Sound | Jukebox use |
|---|---|---|
| `Synth` | one oscillator + envelope | default voice |
| `FMSynth`, `AMSynth` | one synth modulates the frequency or amplitude of another | bells, glassy tones |
| `MonoSynth`, `DuoSynth` | oscillator + filter + envelopes; two MonoSynths | bass, leads |
| `NoiseSynth` | noise through an envelope | wind, surf, hiss |
| `MembraneSynth` | "kick and tom sounds" | lightning strikes, pulses |
| `MetalSynth` | inharmonic, metallic | sparkle, city lights |
| `PluckSynth` | Karplus-Strong plucked string | discrete events |
| `PolySynth(Voice)` | voice manager that makes any of the above polyphonic; `maxPolyphony` default 32 | chords; set 8 |
| `Sampler({ urls, baseUrl, onload })` | plays audio files mapped to notes and pitch-shifts them to fill the gaps between the notes you supplied; polyphonic by itself | real instruments |

Sampler files are fetched and decoded, so they must be same-origin or CORS-enabled like the video, and each sample set needs a licence you can list (see 01-where-the-sounds-come-from.md). Wait for `await Tone.loaded()` before playing.

**Effects and components**: `Reverb({ decay, wet })` (a ConvolverNode fed with generated decaying noise; creation is asynchronous, `await reverb.ready`; default decay 1.5 s), `FeedbackDelay(delayTime, feedback)` (echo), `Filter(frequency, type, rolloff)`, `Chorus`, `Panner(pan)`, `Compressor` (thin wrapper on DynamicsCompressorNode), `Limiter(thresholdDb)` ("a Compressor with a fast attack and release and max compression ratio"). Connect with `a.connect(b)`, `a.chain(b, c, d)`, `.toDestination()`.

**Signals**: every parameter (`filter.frequency`, `panner.pan`, `gain.gain`, `synth.volume`) has `rampTo(value, rampTime = 0.1, startTime?)`. In the 15.1.22 source, `rampTo` is exponential for frequency, BPM and decibel parameters and linear for the rest.

**Tone.getDraw()**: Transport callbacks fire up to `lookAhead` early, so do not touch the DOM in them. `Tone.getDraw().schedule(() => { /* update DOM */ }, time)` runs the function on the animation frame nearest to audio time `time`.

**Offline and recording**: `Tone.Offline(callback, duration, channels = 2, sampleRate)` returns a Promise of a `ToneAudioBuffer` (`.get()` gives the raw AudioBuffer); only nodes created inside the callback are rendered, and the callback receives `{ transport }`. `new Tone.Recorder()` wraps the browser's MediaRecorder: connect a node to it, `recorder.start()`, `const blob = await recorder.stop()`.

## 5. Getting pixels out of images and video

```js
const cv = document.createElement("canvas"); cv.width = 64; cv.height = 36;     // analysis size, not display size
const ctx = cv.getContext("2d", { willReadFrequently: true });
ctx.drawImage(video, 0, 0, 64, 36);                 // the browser downsamples for you
const px = ctx.getImageData(0, 0, 64, 36).data;     // Uint8ClampedArray, 4 bytes per pixel: R, G, B, A
```

Drawing onto a small canvas is the cheapest downsample: 64 x 36 = 2,304 pixels, 9,216 bytes per read. `willReadFrequently` "will force the use of a software (instead of hardware accelerated) 2D canvas and can save memory when calling getImageData() frequently" (MDN).

Which callback drives the analysis:

| Trigger | Rate | Notes |
|---|---|---|
| `video.requestVideoFrameCallback(cb)` | "the lower of the video frame rate and the browser paint refresh rate"; gives `metadata.mediaTime` (the exact frame time) | best for pattern A; Baseline since October 2024; one-shot, re-register in the callback |
| `requestAnimationFrame(cb)` | display refresh rate (60 Hz typical) | fine for drawing; frames repeat or are skipped relative to the video |
| `timeupdate` event | "between about 4Hz and 66Hz" (measured here: 3.7 per second) | only for the seek bar |
| Transport or `setInterval` tick | whatever you set | simplest for 10 to 15 Hz analysis |

`requestAnimationFrame` is "paused in most browsers when running in background tabs". Measured in the hidden test pane: 0 rAF and 0 video-frame callbacks in 3 s while `timeupdate` kept firing. Analysis driven by them stops when the tab is hidden, so pause the piece on `visibilitychange`.

Measured cost of `drawImage(video)` + `getImageData` + a mean-brightness loop, source video 960x540, 16-thread laptop, hidden pane (order of magnitude only):

| Canvas | `willReadFrequently: true` | `false` |
|---|---|---|
| 32x18 | 3.0 ms | 1.9 ms |
| 64x36 | 4.3 ms | 2.0 ms |
| 160x90 | 3.9 ms | 1.4 ms |
| 320x180 | 3.7 ms | 1.6 ms |
| 960x540 | 6.2 ms | 5.3 ms |

Reading: the cost is a fixed 1.5 to 4.5 ms per analysed frame up to 320x180 (copying the video frame dominates, not the pixel count). At 15 Hz that is about 3 to 7% of one core. For a video source the software canvas was the slower one here, the opposite of the usual advice, so time both on your target device (it is one flag).

`OffscreenCanvas` (canvas in a Web Worker, Baseline since March 2023) and WebCodecs `VideoDecoder` (decodes encoded chunks you supply; MDN: limited availability) solve problems you will not have at 64x36 and 15 Hz. Skip both.

## 6. Architecture patterns

### A. Fully live

```
<video, same origin> --frame callback--> 64x36 canvas --getImageData--> features --smoothing--> synth params + notes --> limiter --> speakers
```

- Sync: implicit, the sound is computed from the frame on screen. Seek, pause and speed work without code.
- Latency: up to one frame (33 ms at 30 fps) + Tone `lookAhead` (100 ms) + output latency (measured 40 ms on laptop speakers; Bluetooth is higher, unverified). Sound trails the picture by roughly 140 to 175 ms on this laptop. ITU-R BT.1359-1 puts the detectability threshold at 125 ms for late sound (45 ms for early sound), so this is noticeable on sharp events.
- Failure modes: tainted canvas if the video is not same-origin; stops in background tabs; only cheap features (means, histograms, centroids) fit the budget; jitter on slow phones; not reproducible sample for sample.

### B. Precomputed timeline

```
offline:  video or frames --Python (08-recipes-python.md)--> features.json  { hz, bright[], warm[], motion[], cx[] }
browser:  <video muted> = clock --video.currentTime--> Transport tick --lookup + interpolate--> notes + ramps --> limiter --> speakers
```

- Sync: each tick asks "what media time will be on screen when this tick is heard?": `t = video.currentTime + (time - Tone.immediate()) * video.playbackRate`. Because the future of the timeline is known, the look-ahead costs no lag. No drift can build up: every tick re-reads the video clock.
- Latency: the residual error is the jitter of `video.currentTime` plus output latency, a few tens of ms.
- Failure modes: JSON and video out of step (wrong fps or trimmed clip: store `hz` and the clip duration in the JSON and assert them at load); the video file stalls on bad Wi-Fi (self-host and keep clips small); nothing interactive beyond transport controls.
- Size: 4 features x 10 Hz x 60 s = 2,400 numbers, about 19 kB of JSON (measured 7.9 bytes per number).

### C. Hybrid: B plus a live probe

```
B as above
pointer or arrow keys --> (column, row) --> drawImage(video) --> 1 pixel --> blip: pitch = brightness, pan = x --> limiter
                                                                         \--> aria-live text: "Column 9 of 16, row 5 of 9, brightness 55 percent"
```

- Sync: the probe reads the frame currently displayed, playing or paused. Paused + probe = explore a still image by ear, the BVI use case.
- Latency: one event handler plus `lookAhead`, about 0.1 to 0.15 s; fine for exploration.
- Failure modes: needs readable pixels (same-origin video); reads `0,0,0,0` before the first frame is presented; pointer events flood, so rate-limit (80 ms in the skeleton).

**Recommendation: C, built in the order B then probe.** B alone is a safe demo by Saturday night; the probe is the differentiator and costs about 30 lines. Use A only as a labelled "live mode" experiment if time remains.

## 7. Sync, scrubbing, looping, speed

| User action | Event | What the audio side does |
|---|---|---|
| Play | `play` | `Tone.getTransport().start()`, fade the pad in over 0.3 s |
| Pause | `pause` | `Transport.pause()`, `synth.releaseAll()`, fade the pad out over 0.1 s |
| Seek while playing | `seeked` | `synth.releaseAll()`; the next tick reads the new time by itself |
| Scrub while paused | `seeked` | play one step for that position (an audible preview of any moment) |
| Speed 0.5x, 2x | `ratechange` | `bpm.value = BPM * video.playbackRate` |
| Loop | `loop` attribute | nothing, the tick keeps reading `currentTime` |
| Tab hidden | `visibilitychange` | `video.pause()` |

Play, pause, scrub preview, speed change and looping were exercised on the skeleton (2x speed gave 192 BPM; no notes while paused; one preview note per scrub). The fact-check repeated this with a same-origin local clip and added seek-while-playing and the loop wrap (Chromium 156 fires `seeking` and `seeked` at every wrap, as the HTML standard specifies, and the notes carry on from the new position); the hidden-tab pause was not exercised. Do not route the video's own audio through Web Audio: keep the video muted and without an audio track.

For offline rendering there is no video: the Transport is the clock, use `transport.seconds` as the media time.

## 8. Keeping it smooth

- **Throttle analysis** to 10 to 15 Hz. Earth animations change slowly; 30 Hz doubles the cost for no audible gain.
- **Smooth every continuous feature** before it reaches a parameter. One-pole filter: `y += a * (x - y)` with `a = 1 - exp(-dt / tau)`. Example: dt = 1/15 s, tau = 0.2 s gives a = 0.28. Or let the audio engine do it: `param.rampTo(x, 0.25)` on each tick.
- **Gate events.** Trigger a note only when a feature crosses a threshold, with a minimum gap (80 to 120 ms), so a noisy frame cannot fire 30 notes per second.
- **Limit polyphony**: `synth.maxPolyphony = 8` and releases of at most about 1 s. Unbounded voices are the usual cause of crackle.
- **Avoid garbage-collection pauses**: build all nodes once at boot, never per note or per frame; reuse arrays in the analysis loop. `getImageData` allocates 9 kB per call at 64x36, which is harmless at 15 Hz.
- **Master bus**: everything goes through one `Tone.Limiter(-1)` into the destination, but do not count on it to stop clipping. It is a soft-knee compressor (Tone keeps the 30 dB default knee), not a brick wall, and almost transparent. Re-measured with offline renders in Chromium 156 (anything above 1.0 clips): a sine at twice full scale came out at 1.94, and eight simultaneous full-velocity `Synth` voices peaked at 2.84 with it against 3.13 without. A hard-knee `new Tone.Compressor({ threshold: -12, ratio: 20, knee: 0, attack: 0.003, release: 0.1 })` held a steady sine of up to four times full scale below 0.7 but still let that chord's attacks reach 1.16, and it raises quiet passages (0.25 in, 0.55 out). So control level by gain staging: with the synth at -12 dB the same chord peaks at 0.79 with no limiter at all, and the skeleton's own mix (melody at -8 dB, one note per step) peaked near 0.45, or 0.9 with probe blips on top, at the slider's 0 dB end. Keep instrument volumes around -8 to -12 dB, check the peak of every offline render, and expose a volume slider.
- **Late or dropped audio** on weak devices: raise `lookAhead` (for example `Tone.getContext().lookAhead = 0.2`) or use `latencyHint: "playback"`.

## 9. Exporting audio and video

| Goal | Method | Result |
|---|---|---|
| Playlist of generated files | `Tone.Offline` + WAV encoder | same notes and timing on every run, faster than real time (measured: 4 s in 0.8 s including the reverb). Not sample-identical while a `Tone.Reverb` is in the graph, because its impulse response is fresh random noise each time (measured: two renders differed by up to 0.06 at a peak of 0.31; without the reverb by 6e-8) |
| Capture a live session including the probe | `Tone.Recorder` (MediaRecorder on a `MediaStreamAudioDestinationNode`) | real time; Chromium here supports `audio/webm;codecs=opus` and `audio/mp4`, not WAV or Ogg; check `MediaRecorder.isTypeSupported(type)` |
| 30-second demo video | OBS Studio (free, open source, Windows 10/11) capturing the browser window and desktop audio | most reliable; add English subtitles afterwards |
| Demo video from inside the page | `canvas.captureStream(30)` video track + recorder audio track into one `MediaRecorder` | needs an origin-clean canvas, so again self-hosted video |

Offline render, shape of the code (the full version belongs in 09-recipes-browser.md):

```js
const buffer = await Tone.Offline(async ({ transport }) => {
  const limiter = new Tone.Limiter(-1).toDestination();
  const reverb = new Tone.Reverb({ decay: 3, wet: 0.3 }).connect(limiter);
  await reverb.ready;                                   // nested offline render, must be awaited
  const synth = new Tone.PolySynth(Tone.Synth).connect(reverb);
  synth.volume.value = -10;
  transport.bpm.value = 96;
  transport.scheduleRepeat((time) => {
    const t = transport.seconds;                        // offline: the Transport is the media clock
    synth.triggerAttackRelease(noteFor(t), "8n", time, velocityFor(t));
  }, "8n");
  transport.start(0);
}, durationSeconds);
const wav = wavBlob(buffer.get());                      // 16-bit PCM encoder: 44-byte header + samples
```

Checks done: the 4 s render gave 192,000 frames at 48 kHz stereo, the encoded WAV was 768,044 bytes (44 + 192,000 x 2 channels x 2 bytes) and decoded back correctly. Normalise before encoding (scale so the peak is about 0.9). WAV at 48 kHz stereo 16-bit is 192 kB per second, 11.5 MB per minute: keep WAV masters out of the Pages site and publish compressed copies (Opus or MP3; conversion in 08-recipes-python.md). Ship a `playlist.json` listing, per track: title, SVS id and URL, credit line, mapping description, duration, file name. That file is the "explanation of the creative process" the challenge asks for, in machine-readable form.

## 10. Accessibility hooks at the platform level

Details and test protocol: 07-accessibility-and-listening-tests.md. Platform facts only:

- Use native controls: `<button>` for play, `<input type="range">` for position and volume, `<select>` for speed. They are keyboard-operable and announced correctly without ARIA. Give each a visible label.
- If you build a custom slider, the WAI-ARIA slider pattern requires `role="slider"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and arrow keys, Home and End. `aria-valuetext` turns "0.722" into "4 of 5 seconds" (the skeleton sets it on the native range input).
- Announce state through one `role="status"` / `aria-live="polite"` element, and keep messages short so speech does not fight the music.
- A toggle button exposes its state with `aria-pressed`; MDN suggests `role="switch"` for audio on/off buttons.
- Volume control independent of the system volume and an immediate pause satisfy WCAG 1.4.2.
- `@media (prefers-reduced-motion: reduce)`: do not auto-play animation for these users; offer the still frame plus the probe.
- Captions and transcript: `<track kind="captions" src="captions.vtt">` inside `<video>` for any speech; provide a text description of each mapping ("pitch rises with the share of warm colours"). A `<track>` file must be same-origin unless the parent `<video>` carries a `crossorigin` attribute, in which case the caption host must allow your origin through CORS (MDN, HTML standard); self-host it.
- The probe area in the skeleton uses `tabindex="0"` and `role="application"` so arrow keys reach the script. Test that choice with NVDA or VoiceOver before relying on it.

## 11. Deployment

| Host (free tier, read 2026-11-14) | Limits that matter for media | Verdict |
|---|---|---|
| GitHub Pages | published site at most 1 GB; soft 100 GB bandwidth per month; soft 10 builds per hour; deployment timeout 10 minutes; GitHub blocks files over 100 MiB and warns over 50 MiB; browser upload limit 25 MiB; Git LFS cannot be used with Pages; HTTPS automatic on github.io | **Use** |
| Cloudflare Pages | 500 builds per month; 20,000 files; 25 MiB per file; no bandwidth figure on the limits page | Good backup; mind the per-file cap |
| Vercel (Hobby) | 100 deployments per day; 100 MB source upload via CLI; first 100 GB data transfer per month | Fine |
| Netlify (Free) | credit based: 300 credits per month; a production deploy costs 15 credits, bandwidth 20 credits per GB; when credits run out the projects are paused | Avoid: 20 deploys exhaust it |

- **HTTPS is required** for service workers and several other APIs; `localhost` counts as secure. Develop through a local server, not by opening the file: a `file://` page cannot `fetch()` the JSON (the Fetch standard leaves `file:` URLs undefined and says to return a network error when in doubt; not re-tested today). **Do not serve the site with `python -m http.server`**: measured with Python 3.14.6, it ignores `Range` requests (`200` with the whole file, no `Accept-Ranges`), and Chromium 156 then reports `video.seekable` as 0 to 0 and snaps every seek back to 0, so the seek slider and the scrub preview do nothing. Use a server that answers `206 Partial Content`, for example the 39-line Node `serve.js` in 09-recipes-browser.md (`node serve.js . 8765` in the site folder; measured: `206`, `seekable` covers the whole clip, seeking works). If a port is busy, pick another (8080 was already taken on this laptop).
- **GitHub Pages caches for 10 minutes** (`Cache-Control: max-age=600`, measured). After a deploy, hard-reload before judging, or add `?v=2` to asset URLs.
- **Flaky Wi-Fi plan, cheapest first**: (1) vendor Tone.js and all media, no CDN at runtime; (2) keep a clone of the site on the demo laptop and serve it with the Range-capable local server above; (3) have the rendered playlist and the 30-second video as files. A service worker that caches the app shell (HTML, JS, JSON) is easy (`cache.addAll` on `install`, cache-first on `fetch`), but cached video needs extra work: browsers request media with `Range`, runtime caching of those partial responses "won't work", the full file must be added to the cache ahead of time and served through a range-aware handler (Workbox `RangeRequestsPlugin`). Not worth it this weekend.
- Do not embed secrets or personal data; the repo must be public and under an OSI-approved licence, and Tone.js (MIT), ffmpeg, the SVS media and any samples go in the project references.

## 12. Reference skeleton (patterns B + C)

Files: `index.html` (below), `features.json` (`{ "hz": 10, "bright": [...], "warm": [...], "motion": [...], "cx": [...] }`, all values 0 to 1), `media/clip.mp4`. Checked today: `node --check` on the extracted script (Node v24.15.0), and a full run in Chromium 156 against a CORS-enabled test video with synthetic features: notes fired every 0.3125 s with 49 to 90 ms of scheduling lead, the pad followed brightness and position, the probe announced values, pause, scrub preview and speed change behaved as in section 7, and hot-linking an SVS file produced the two error messages. The fact-check then changed three things (a paused scrub now previews the frame on screen, not a moment 0.1 s later; a throttled probe key press is dropped instead of moving the probe without sound or announcement; `Tone.start()` runs on every Play press) and repeated `node --check` and the full run with a same-origin `media/clip.mp4` behind a Range-capable local server.

Mapping in this skeleton (replace with your documented design): brightness to low-pass cutoff, 200 x 20^b Hz (200 Hz to 4 kHz); horizontal centre of brightness to stereo pan; share of warm colours to pitch on a C major pentatonic scale (no clashing semitones); motion to loudness and to a gate; probe brightness to pitch, 220 x 4^b Hz (two octaves).

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Earth Jukebox skeleton: precomputed timeline + live probe</title>
<script src="https://cdn.jsdelivr.net/npm/tone@15.1.22/build/Tone.js"></script>
</head>
<body>
<h1>Earth Jukebox skeleton</h1>
<button id="play" aria-pressed="false">Play / Pause</button>
<label>Position <input id="seek" type="range" min="0" max="1" step="0.001" value="0"></label>
<label>Speed <select id="rate"><option>0.5</option><option selected>1</option><option>2</option></select></label>
<label>Volume (dB) <input id="vol" type="range" min="-40" max="0" value="-12"></label>
<div id="stage" tabindex="0" role="application" style="max-width:640px"
     aria-label="Sound probe. Arrow keys move the probe; pitch is the brightness under it.">
  <!-- same-origin copy: SVS sends no usable CORS header, so a hot-linked SVS file cannot be read (tainted canvas) -->
  <video id="v" src="media/clip.mp4" crossorigin="anonymous" muted playsinline loop style="width:100%"></video>
</div>
<p id="status" role="status" aria-live="polite">Loading features</p>
<script>
const $ = (id) => document.getElementById(id);
const video = $("v"), statusEl = $("status");
const SCALE = ["C3", "D3", "E3", "G3", "A3", "C4", "D4", "E4", "G4", "A4", "C5"]; // C major pentatonic
const BPM = 96;
let F = null, started = false, booting = null, synth, padFilter, padPan, padGain, probe, probePan;

fetch("features.json")                       // { hz, bright[], warm[], motion[], cx[] }, every value 0..1
  .then((r) => r.json())
  .then((j) => { F = j; statusEl.textContent = "Ready. Press Play."; })
  .catch((e) => { statusEl.textContent = "Could not load features.json: " + e.message; });

function at(col, t) {                        // linear interpolation of one feature column at media time t
  const x = Math.min(Math.max(t * F.hz, 0), col.length - 1), i = Math.floor(x), j = Math.min(i + 1, col.length - 1);
  return col[i] + (col[j] - col[i]) * (x - i);
}

async function boot() {                      // call only from a click or keydown handler (autoplay policy)
  await Tone.start();
  if (navigator.audioSession) navigator.audioSession.type = "playback";  // iOS: sound despite the silent switch
  const limiter = new Tone.Limiter(-1).toDestination();                  // gentle master compressor, NOT a clipping guard: keep volumes low
  const reverb = new Tone.Reverb({ decay: 3, wet: 0.3 }).connect(limiter);
  await reverb.ready;
  synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.02, release: 0.8 } });
  synth.maxPolyphony = 8;                    // cap the voices: bounded CPU, no pile-up
  synth.volume.value = -8;
  synth.connect(reverb);
  padFilter = new Tone.Filter(400, "lowpass");
  padPan = new Tone.Panner(0);
  padGain = new Tone.Gain(0);
  new Tone.Oscillator("C2", "sawtooth").start().chain(padFilter, padPan, padGain, reverb);
  probePan = new Tone.Panner(0).connect(limiter);
  probe = new Tone.Synth({ oscillator: { type: "sine" } }).connect(probePan);
  Tone.getDestination().volume.value = +$("vol").value;
  Tone.getTransport().bpm.value = BPM * video.playbackRate;
  Tone.getTransport().scheduleRepeat((time) => tick(time, false), "8n");
  started = true;
}

function tick(time, force) {                 // time = audio-clock time at which this step will sound
  if (!F || (video.paused && !force)) return;
  const t = video.currentTime + (video.paused ? 0 : Math.max(0, time - Tone.immediate()) * video.playbackRate); // media time heard then
  const b = at(F.bright, t), m = at(F.motion, t);
  padFilter.frequency.rampTo(200 * Math.pow(20, b), 0.25, time);   // brightness -> cutoff, 200 Hz to 4 kHz
  padPan.pan.rampTo(at(F.cx, t) * 2 - 1, 0.25, time);              // where the bright area is -> left/right
  if (m > 0.05 || force) {                                         // motion gates the melody
    const note = SCALE[Math.round(at(F.warm, t) * (SCALE.length - 1))];
    synth.triggerAttackRelease(note, "8n", time, 0.3 + 0.7 * m);   // warm share -> pitch, motion -> loudness
  }
}

$("play").addEventListener("click", async () => {
  await Tone.start();                       // every press: iOS "interrupts" the context when the page is left
  await (booting ||= boot());               // boot once, even on a double click
  if (video.paused) await video.play(); else video.pause();
});
video.addEventListener("play", () => { Tone.getTransport().start(); padGain.gain.rampTo(0.25, 0.3); $("play").setAttribute("aria-pressed", "true"); });
video.addEventListener("pause", () => { Tone.getTransport().pause(); synth.releaseAll(); padGain.gain.rampTo(0, 0.1); $("play").setAttribute("aria-pressed", "false"); });
video.addEventListener("ratechange", () => { if (started) Tone.getTransport().bpm.value = BPM * video.playbackRate; });
video.addEventListener("seeked", () => { if (started) { synth.releaseAll(); if (video.paused) tick(Tone.now(), true); } }); // scrub = audition
video.addEventListener("timeupdate", () => {
  $("seek").value = video.currentTime / video.duration || 0;
  $("seek").setAttribute("aria-valuetext", Math.round(video.currentTime) + " of " + Math.round(video.duration) + " seconds");
});
$("seek").addEventListener("input", (e) => { video.currentTime = e.target.value * video.duration; });
$("rate").addEventListener("change", (e) => { video.playbackRate = +e.target.value; });
$("vol").addEventListener("input", (e) => { if (started) Tone.getDestination().volume.rampTo(+e.target.value, 0.1); });
document.addEventListener("visibilitychange", () => { if (document.hidden) video.pause(); });
video.addEventListener("error", () => { statusEl.textContent = "Video failed to load (missing file or blocked by CORS), code " + (video.error ? video.error.code : "?"); });

// Live probe (pattern C): read the pixel under the pointer or the keyboard cursor from a 64x36 copy of the frame
const COLS = 16, ROWS = 9, cv = document.createElement("canvas");
cv.width = 64; cv.height = 36;
const ctx = cv.getContext("2d", { willReadFrequently: true });
let col = 8, row = 4, lastProbe = 0;
function probeAt(c, r, announce) {
  if (!started || performance.now() - lastProbe < 80) return;      // at most ~12 blips per second; a throttled move is dropped
  col = Math.min(Math.max(c, 0), COLS - 1); row = Math.min(Math.max(r, 0), ROWS - 1);
  lastProbe = performance.now();
  let d;
  try {
    ctx.drawImage(video, 0, 0, 64, 36);
    d = ctx.getImageData(col * 4 + 2, row * 4 + 2, 1, 1).data;     // SecurityError here = tainted canvas (CORS)
  } catch (e) { statusEl.textContent = "Cannot read pixels: " + e.name + ". Host the video on this origin."; return; }
  const lum = (0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]) / 255;
  probePan.pan.rampTo((col / (COLS - 1)) * 2 - 1, 0.03);
  probe.triggerAttackRelease(220 * Math.pow(4, lum), 0.12);        // dark 220 Hz .. bright 880 Hz (two octaves)
  if (announce) statusEl.textContent = "Column " + (col + 1) + " of " + COLS + ", row " + (row + 1) + " of " + ROWS + ", brightness " + Math.round(lum * 100) + " percent";
}
$("stage").addEventListener("pointermove", (e) => {
  const r = video.getBoundingClientRect();
  probeAt(Math.floor(((e.clientX - r.left) / r.width) * COLS), Math.floor(((e.clientY - r.top) / r.height) * ROWS), false);
});
$("stage").addEventListener("keydown", (e) => {
  const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (!step) return;
  e.preventDefault();
  probeAt(col + step[0], row + step[1], true);
});
</script>
</body>
</html>
```

Known limits of the skeleton, on purpose: one clip, no clip picker; the probe reads displayed brightness, not the data value (invert the colour bar offline for that, see 02-frame-analysis-algorithms.md); no touch gestures beyond pointer move; no export button; `||=` needs a 2021-or-later browser.

## Open questions / unverified

- Autoplay behaviour was not observed directly: the test pane started the AudioContext in state `running` without a gesture. Test in desktop Chrome, Firefox and Safari, and on an iPhone, on the deployed HTTPS URL.
- The iPhone silent-switch muting and its fix (`navigator.audioSession.type = "playback"`) are documented in WebKit bug 237322 (the fix in a WebKit engineer's comment, "Since iOS 17"; MDN's compatibility data lists the API from Safari 16.4 and marks it experimental). Neither that nor the resume after an `interrupted` context was tested on a device: try both on an iPhone with the switch set to silent before the demo.
- All timings were taken in a hidden browser pane on one laptop. Re-measure on the demo machine and one phone.
- The two ffmpeg commands were not run (no ffmpeg on this machine); their options were checked against ffmpeg.org and the x264 source only. Typical Bluetooth output latency is from memory, not confirmed today.
- WebM playback on older iPhones was not checked. MP4/H.264 avoids the question.
- `seeked` at every loop wrap is what the HTML standard specifies (a loop is a seek to the start) and what Chromium 156 did; Safari and Firefox were not tested (the skeleton relies on it only to cut hanging notes).
- Cloudflare Pages bandwidth policy was not found on the limits page.
- The limiter and compressor peaks in section 8 are offline renders in one Chromium build; Firefox and Safari were not measured.
- Tone.js docs say `Recorder` is natively supported only in Chrome and Firefox; MDN says MediaRecorder type checks have been available across browsers since April 2021. Trust `Tone.Recorder.supported` at run time.
- Whether showing an SVS clip that contains a NASA logo breaks the "no NASA logos" rule is a rules question, not answered here; trimming such frames is the safe choice.

## Sources

Measurements (own, 2026-11-14): curl header probes and browser tests against the URLs in section 1. Scripts, logs (`probe_svs.log`, `probe_other.log`, `probe_extra.log`) and the tested `skeleton.html` are in `(session scratch folder, not kept)\web-audio` (a temp folder; copy what you need). The fact-check repeated the curl probes and the browser taint tests the same day (19:33 to 20:15 GMT, page origin `http://127.0.0.1:8772`, same results) and added the `http.server` Range test, the limiter renders and the run of the edited skeleton; its scripts and logs are in the sibling folder `work\verify-06-content`.

- Web Audio API (MDN) - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API - node one-line descriptions, routing graph
- AudioParam (MDN) - https://developer.mozilla.org/en-US/docs/Web/API/AudioParam - automation methods, `.value` ignored while events are scheduled
- AudioParam.setTargetAtTime (MDN) - https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime - time constant table (63.2%, 95.0%)
- AudioParam.exponentialRampToValueAtTime (MDN) - https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/exponentialRampToValueAtTime - positive values only, why exponential
- Web Audio API best practices (MDN) - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices - autoplay handling, native controls, `role="switch"`
- Background audio processing using AudioWorklet (MDN) - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet - worklet model, 128-frame blocks
- BaseAudioContext.state (MDN) - https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state - `suspended`, `interrupted`, iOS Safari note
- AudioContext.outputLatency (MDN) - https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency - definition of output latency
- PannerNode and panningModel (MDN) - https://developer.mozilla.org/en-US/docs/Web/API/PannerNode and https://developer.mozilla.org/en-US/docs/Web/API/PannerNode/panningModel - 3D panning, `equalpower` vs `HRTF`
- DynamicsCompressorNode and its constructor (MDN) - https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode and https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode/DynamicsCompressorNode - purpose, default values
- BiquadFilterNode (MDN) - https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode - filter types
- AudioBufferSourceNode (MDN) - https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode - one-shot playback
- MediaStreamAudioDestinationNode (MDN) - https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamAudioDestinationNode - stream for MediaRecorder
- OfflineAudioContext (MDN) - https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext - offline rendering
- MediaRecorder.isTypeSupported (MDN) - https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static - format check
- Autoplay guide (MDN) - https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay - when autoplay is allowed
- Autoplay policy in Chrome - https://developer.chrome.com/blog/autoplay - Web Audio covered since Chrome 71, `resume()`, muted autoplay
- AudioSession.type (MDN) - https://developer.mozilla.org/docs/Web/API/AudioSession/type - `playback` type, experimental status
- WebKit bug 237322 mailing-list entry - https://lists.webkit.org/pipermail/webkit-unassigned/2024-September/1186593.html - Web Audio muted by the iOS ringer switch
- New video policies for iOS (WebKit) - https://webkit.org/blog/6784/new-video-policies-for-ios/ - `playsinline`, muted autoplay
- A tale of two clocks (web.dev) - https://web.dev/articles/audio-scheduling - timer jitter, 25 ms / 100 ms look-ahead
- CORS-enabled images (MDN) - https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image - tainted canvas, methods that throw
- img element (MDN) - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img - `crossorigin` blocks loading without a matching header
- video element (MDN) - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video - `crossorigin`, `muted`, `playsinline`, `<track>` captions
- requestVideoFrameCallback (MDN) - https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback - rate, metadata, Baseline 2024
- HTMLCanvasElement.getContext (MDN) - https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext - `willReadFrequently`
- timeupdate event (MDN) - https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/timeupdate_event - 4 to 66 Hz
- requestAnimationFrame (MDN) - https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame - refresh rate, paused in background tabs
- OffscreenCanvas (MDN) - https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas - worker canvas, Baseline March 2023
- VideoDecoder (MDN) - https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder - WebCodecs, limited availability
- HTMLCanvasElement.captureStream (MDN) - https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream - canvas to MediaStream, SecurityError when not origin-clean
- Video codec guide (MDN) - https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Video_codecs - HEVC support conditions, MP4/H.264 recommendation
- Image file type guide (MDN) - https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types - TIFF Safari-only, no EXR
- Using Service Workers (MDN) - https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers - HTTPS requirement, cache recipes
- Serving cached audio and video (Chrome for Developers) - https://developer.chrome.com/docs/workbox/serving-cached-audio-and-video - range requests and media caching
- prefers-reduced-motion (MDN) - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion - media feature
- Understanding SC 1.4.2 Audio Control (W3C) - https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html - 3-second rule, screen-reader rationale
- Slider pattern (W3C APG) - https://www.w3.org/WAI/ARIA/apg/patterns/slider/ - roles, properties, keys
- Rec. ITU-R BT.1359-1 - https://www.itu.int/dms_pubrec/itu-r/rec/bt/R-REC-BT.1359-1-199811-I!!PDF-E.pdf - audio/video timing thresholds (full text read in the fact-check: detectability about +45 ms to -125 ms, acceptability about +90 ms to -185 ms, plus = sound early; the ITU server rejects plain curl)
- Tone.js README - https://github.com/Tonejs/Tone.js/blob/main/README.md - install, `Tone.start`, Transport, Sampler, signals
- Tone.js 15.1.22 API docs - https://tonejs.github.io/docs/15.1.22/index.html - class and function list
- Tone.js docs: getTransport, Offline, Recorder, Sampler - https://tonejs.github.io/docs/15.1.22/functions/getTransport.html , https://tonejs.github.io/docs/15.1.22/functions/Offline.html , https://tonejs.github.io/docs/15.1.22/classes/Recorder.html , https://tonejs.github.io/docs/15.1.22/classes/Sampler.html - signatures
- Tone.js source at tag 15.1.22 - https://raw.githubusercontent.com/Tonejs/Tone.js/15.1.22/Tone/core/clock/Transport.ts (same path pattern for `core/context/Context.ts`, `core/context/Param.ts`, `core/util/Draw.ts`, `core/Global.ts`, `instrument/PolySynth.ts`, `effect/Reverb.ts`, `component/dynamics/Limiter.ts`) - Transport API, defaults (`lookAhead`, `maxPolyphony`, reverb decay), `rampTo` behaviour, `now` vs `immediate`
- Tone.js licence - https://raw.githubusercontent.com/Tonejs/Tone.js/15.1.22/LICENSE.md - MIT
- npm registry, tone - https://registry.npmjs.org/tone - `latest` 15.1.22 (published 2025-04-27), `next` 15.5.72 (2026-11-14)
- Tone.js build on CDNs - https://cdn.jsdelivr.net/npm/tone@15.1.22/build/Tone.js , https://unpkg.com/tone@15.1.22/build/Tone.js , https://cdnjs.cloudflare.com/ajax/libs/tone/15.1.22/Tone.js - file exists, identical bytes and hash
- SVS help page - https://svs.gsfc.nasa.gov/help/ - public-domain statement, music exception, API endpoints
- NASA images and media usage guidelines - https://www.nasa.gov/nasa-brand-center/images-and-media/ - use, acknowledgment, insignia
- SVS API example - https://svs.gsfc.nasa.gov/api/5313 - header probe target
- GIBS API access basics - https://nasa-gibs.github.io/gibs-api-docs/access-basics/ - example tile and WMS URLs used for the probes
- NASA Image and Video Library API - https://images-api.nasa.gov/search?q=earth%20blue%20marble&media_type=image&page_size=3 - API CORS header and asset URLs
- YouTube IFrame Player API reference - https://developers.google.com/youtube/iframe_api_reference - iframe embedding, no frame access
- CORS Anywhere README - https://github.com/Rob--W/cors-anywhere/blob/master/README.md - public demo restrictions
- Cloudflare Workers limits - https://developers.cloudflare.com/workers/platform/limits/ - free plan quotas
- GitHub Pages limits - https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits - 1 GB, 100 GB/month, 10 builds/hour
- About large files on GitHub - https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github - 50 MiB warning, 100 MiB block, 25 MiB browser upload
- About Git LFS - https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage - LFS not usable with Pages
- Securing GitHub Pages with HTTPS - https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https - HTTPS on github.io
- Cloudflare Pages limits - https://developers.cloudflare.com/pages/platform/limits/ - builds, files, 25 MiB per file
- Vercel limits and fair use - https://vercel.com/docs/limits and https://vercel.com/docs/limits/fair-use-guidelines - Hobby plan numbers
- Netlify pricing and billing FAQ - https://www.netlify.com/pricing/ and https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/ - credit model, pause when credits run out
- ffmpeg documentation - https://ffmpeg.org/ffmpeg.html , https://ffmpeg.org/ffmpeg-formats.html , https://ffmpeg.org/ffmpeg-codecs.html , https://ffmpeg.org/ffmpeg-filters.html - `-an`, `-pix_fmt`, `+faststart`, `-g`, `crf`, `preset`, `scale`, `fps`, `%05d` sequences
- x264 source (GitHub mirror of the VideoLAN repository) - https://raw.githubusercontent.com/mirror/x264/master/common/base.c , https://raw.githubusercontent.com/mirror/x264/master/x264.c , https://raw.githubusercontent.com/mirror/x264/master/x264.h - CRF default 23, scale ends at 51, preset names and default
- HTML Standard, media elements - https://html.spec.whatwg.org/multipage/media.html - a loop is a seek (`seeking`, `seeked`), how `<track>` files are fetched
- track element (MDN) - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/track - `src` must be same-origin unless the media element has `crossorigin`
- AudioParam.cancelAndHoldAtTime (MDN) - https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/cancelAndHoldAtTime - limited availability (no Firefox)
- Fetch Standard - https://fetch.spec.whatwg.org/ - `file:` URLs left undefined
- WebKit bug 237322 - https://bugs.webkit.org/show_bug.cgi?id=237322 - Web Audio muted by the iOS ringer switch; comment 6 (2024-09-25) gives the `audioSession` fix
- OBS Studio - https://obsproject.com/ - free and open source recorder, Windows 10/11
- MDN sample video - https://mdn.github.io/shared-assets/videos/flower.mp4 - CORS-enabled test clip on GitHub Pages
