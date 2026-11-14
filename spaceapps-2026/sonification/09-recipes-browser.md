# 09 - Browser recipes: Tone.js and Web Audio programs for the Earth Information Jukebox

> Status: written and checked by its author on 2026-11-14 (Node tests pass; one muted scripted smoke test in Chromium). Not independently fact-checked; no human has listened to it or tested it in Safari, on a phone, or with a screen reader. The code is also in recipes-browser/.

## TL;DR

- **Architecture that respects the measured CORS limit:** analyse frames ahead of time into a timeline JSON (08-recipes-python.md, or recipe J3 in the browser), then play that timeline in the browser with the sound slaved to `video.currentTime` (J1, J5). The page never reads pixels of the video, so it can show the SVS file straight from svs.gsfc.nasa.gov. Read pixels in the browser only for files served from your own site (J2, J3).
- **Tone.js is pinned to 15.1.22** (npm dist-tag `latest`, MIT licence), loaded from `https://cdn.jsdelivr.net/npm/tone@15.1.22/build/Tone.js` with a Subresource Integrity hash. The npm `next` tag (15.5.72, published today) and the version cdnjs lists as current are pre-release builds: do not use an unpinned URL.
- **One pure function, `scoreWindow`, decides every note.** The live player and the offline WAV renderer both call it, so the downloadable audio files contain exactly the notes people hear on the page. That matters for the listening test and for the "curated playlist" form of the deliverable.
- **All mapping maths is in `sonify-core.js` (no browser APIs) and is unit-tested in Node 24:** 17 tests for the pure functions, 5 tests that drive the real player and offline renderer against a fake Tone.js. The tests caught one real bug (the first note at t = 0 was dropped when Play was pressed) before any browser saw the code.
- **`python -m http.server` cannot serve video for this project in Chrome:** measured on Python 3.14.6, it answers a Range request with `200` and the whole file, and Chrome needs `206 Partial Content` to seek. Use the 39-line `serve.js` below (measured: `206` with `Content-Range`) or GitHub Pages (measured: `206`).
- **Accessibility is in the structure, not added afterwards:** native buttons and sliders, a text description of the mapping before any sound, a "sound legend" button, `aria-live` status messages, a keyboard-driven probe with a debounced spoken read-out, a reference tone, and no sound before a user gesture.
- **Honest status: nobody has listened to it yet.** Syntax and logic are checked in Node. One scripted, muted smoke test in a Chromium-based browser confirmed that the real Tone.js accepts the engine's calls and that the offline render gives non-silent stereo audio (peak -8.57 dBFS), but the picture loop, pointer input, the J3 frame loop and the sound itself are unjudged. First job: open `j1-player.html` (demo mode) and listen.

## Decisions for the Jukebox build

Ranked. Each one says what to do, why, and what it costs.

1. **Build the product as J5 (jukebox shell) on top of J1 (timeline player), with precomputed timelines.** Reason: it is the only design that works with SVS media from any origin, it keeps heavy image analysis out of the browser, and the same timeline gives the same sound every time (needed for a measured listening test, see 07-accessibility-and-listening-tests.md). Cost: someone must produce one timeline JSON per track with 08-recipes-python.md or with J3.
2. **Keep two or three small clips on your own site and hot-link the rest.** The player works with a video URL on svs.gsfc.nasa.gov, but a demo on venue Wi-Fi should not depend on a third server. From the local crawl, these official-resource clips are small: SVS 3912 `flat_global_ecco2_6840x3420_768p30-b1.webm` (8.3 MB), SVS 4950 `GEDI_global_w_colorbar_1080p60.webm` (6.3 MB). GitHub Pages allows a 1 GB site and has a soft limit of 100 GB of traffic per month, so a few clips of this size are fine. Cost: every copied file goes in the references list. If a video fails to load, J1 and J5 fall back to a coarse picture drawn from the timeline grid and the sound carries on.
3. **Use J4's offline render to make the audio files** for the playlist, for the 30-second demo video and as listening-test stimuli. Reason: it is faster than real time, repeatable, and identical to the live sound. Cost: WAV files are large (about 10 MB per stereo minute); convert to a compressed format outside the browser if you publish many.
4. **Use J2 (the probe) as the accessibility showpiece on one or two still frames that contain their colour bar.** Reason: exploring a map by keyboard and hearing the data value, with a spoken read-out, is the clearest "sound as access" moment for judges and for blind and low-vision testers. Cost: the image must be served from your site, and you must give the colour bar position and the data range per image.
5. **Treat J3 (live pixel analysis) as a tool, not as the product.** Use it to make a timeline when nobody has Python video tooling installed, and to show "it really is computed from the frames". Do not make it the main path: it only works on same-origin video, and frame callbacks and decoding differ between browsers.
6. **Slave sound to the picture clock; do not use Tone's Transport.** `Tone.Transport` is a musical clock of its own. Two clocks drift and react differently to pause, seek and speed changes. Polling `video.currentTime` every 25 ms and scheduling 0.12 s ahead handles all of those with one code path (J1).
7. **Skip for this weekend:** sample libraries and soundfonts (licence checks and load time; the synth voices here need no downloads and no attribution beyond Tone.js), AudioWorklets, ES modules and bundlers (classic `<script>` files work on every static host and with Python's server; Python's `mimetypes` maps `.mjs` to `text/plain` on this machine, which browsers refuse for modules), frameworks.
8. **Before the demo:** download Tone.js into the repository (venue network), test in Chrome and in Safari on an iPhone with the silent switch on, and set the "Audio offset" for the room's speakers or Bluetooth output.

## How to use this file

This file is mostly code. It holds six small browser programs (J0 to J5) plus a local web server, all plain HTML and JavaScript with no build step, that turn the timeline JSON made by 08-recipes-python.md into sound in sync with an EIC visualization. Every code block below was generated from the exact file that was checked, so you can copy it as is. Read the TL;DR and the Decisions, copy the files from the sections you need, then use "How the pieces fit" and "Troubleshooting" when something does not work.

## Words used in this file

| Term | Meaning here |
|---|---|
| Origin | Scheme + host + port of a URL, for example `https://yourname.github.io`. Two URLs are "same-origin" only if all three match. |
| CORS | Cross-Origin Resource Sharing. A server opts in to letting pages from other origins read its responses by sending `Access-Control-Allow-Origin`. |
| Tainted canvas | A canvas that has had cross-origin pixels drawn on it without CORS permission. It still displays, but reading pixels back throws `SecurityError`. |
| AudioContext | The Web Audio object that owns the audio clock and the graph of sound-making nodes. Browsers keep it suspended until a user gesture. |
| Gain | A volume multiplier: 1 = unchanged, 0.5 = about 6 dB quieter, 0 = silent. |
| Pan | Left-right position of a sound: -1 = left, 0 = centre, +1 = right. |
| Envelope | How one note's loudness changes over time: attack (rise), decay, sustain level, release (fade after the note ends). |
| Low-pass filter | Removes high frequencies above a cutoff. A low cutoff sounds dull, a high cutoff sounds bright. |
| Limiter | A safety device on the output that turns loud peaks down. |
| MIDI note number | An integer for pitch: 60 = middle C (C4), 69 = A4 = 440 Hz, +12 = one octave higher. Frequency = 440 * 2^((n - 69) / 12). |
| Scale, pentatonic | A subset of the 12 notes per octave. The major pentatonic scale has 5 (C D E G A from C); any combination of its notes sounds consonant, which is why it suits data. |
| Quantize | Snap a continuous value to the nearest allowed step, here to a note of the scale. |
| Time constant (tau) | For exponential smoothing: after tau seconds the output has covered 63.2 % of a sudden change, after 3 tau about 95 %. |
| Look-ahead scheduling | A timer wakes up often (25 ms) and schedules, on the precise audio clock, every sound that starts within the next short window (0.12 s). |
| playbackRate | Speed of a media element: 1 = normal, 2 = double speed. |
| aria-live region | An element whose text changes are spoken by a screen reader without moving the focus. |
| SRI | Subresource Integrity: a hash in the `<script>` tag; the browser refuses the file if its bytes differ. |
| PCM, WAV, dBFS | PCM = raw audio samples. WAV = a file format holding PCM. dBFS = level relative to the loudest value the file can hold (0 dBFS); -6 dBFS is half of that. |

## What was checked, and how

- Machine: Windows 11, Node v24.15.0, Python 3.14.6. The status lines describe these Node checks; a separate scripted browser smoke test is reported in the next section.
- Every script, including each page's inline script after extraction, passed `node --check`.
- `sonify-core.test.js`: 17 tests of the pure functions. `jukebox-engine.test.js`: 5 tests that run the real `createEngine`, `createPlayer` and `renderOffline` against a fake Tone.js that records every call and applies the argument checks the real library applies (finite numbers, pan within -1..1, start times of one voice strictly increasing).
- The WAV encoder's output was also opened with Python's standard `wave` module.
- The checker also confirmed that each page's tags balance, that ids are unique, and that every element id the scripts look up exists in the HTML.
- `serve.js` was started and queried with curl; so was `python -m http.server`.

Full observed output of the checker (file hashes are the first 16 hex digits of the SHA-256 of each checked file):

```text
node --check sonify-core.js               OK  sha256 5e9d9b3e27ba6535    482 lines
node --check jukebox-engine.js            OK  sha256 d37575d898dfd962    265 lines
node --check record-node.js               OK  sha256 a47cffbb5b51a7e5     19 lines
node --check serve.js                     OK  sha256 bc80c15b9f1b97f4     39 lines
node --check sonify-core.test.js          OK  sha256 8c755455ddb311f8    249 lines
node --check jukebox-engine.test.js       OK  sha256 10a01198fc11c125    139 lines
node --check j1-player.inline.js          OK  sha256 5af6682593b196ee     45 lines
   j1-player.html: tags balance, 12 ids, every id used by the script exists, page sha256 3d2373fee40b6164
node --check j2-probe.inline.js           OK  sha256 aef2e72e47f21fef    127 lines
   j2-probe.html: tags balance, 9 ids, every id used by the script exists, page sha256 a915840672d74995
node --check j3-live-video.inline.js      OK  sha256 16672e35f6ec57d3    140 lines
   j3-live-video.html: tags balance, 6 ids, every id used by the script exists, page sha256 bbc87739ad74b3b3
node --check j4-export.inline.js          OK  sha256 1be79218ee87058d     76 lines
   j4-export.html: tags balance, 4 ids, every id used by the script exists, page sha256 e6f30cd861a996a7
node --check j5-jukebox.inline.js         OK  sha256 2169842521291f23     90 lines
   j5-jukebox.html: tags balance, 17 ids, every id used by the script exists, page sha256 5d7ab1bb815b8b49
--- node sonify-core.test.js
ok 1 - clamp, norm, linear and exponential scaling
ok 2 - MIDI <-> frequency and note names
ok 3 - scale tables, value -> note index, quantize
ok 4 - stickyIndex ignores small wobbles across a bin edge
ok 5 - exponential smoothing
ok 6 - Euclidean rhythm and pulse accumulator
ok 7 - demo timeline matches the contract and survives JSON
ok 8 - validateTimeline reports broken input
ok 9 - timeline lookup: index, interpolation, events
ok 10 - grid centroid and pan
ok 11 - planWindow tiles media time without gaps or overlaps, and re-anchors on jumps
   score of the 24 s demo: 38 lead notes, 6 reference blips, 15 drum hits; lead from C4 to A5
ok 12 - scoreWindow: many small live windows give exactly the same notes as one big window
ok 13 - pad targets stay inside their ranges
ok 14 - clip clock behaves like a media element
ok 15 - pixels: brightness, colour-map inversion, probe
ok 16 - frame features and flash detection on a tiny synthetic frame
ok 17 - WAV encoder writes a valid 16-bit PCM file
all 17 tests passed (node v24.15.0)
--- node jukebox-engine.test.js
   10 s of the demo: 12 lead notes, 3 reference blips, 6 drum hits scheduled
ok 1 - live player: every scored note is scheduled once, at the right audio time
ok 2 - live player: pause fades the pad, seek and loop re-anchor without replaying
ok 3 - live player: playbackRate 2 halves the spacing and length of notes; toggles mute layers
ok 4 - live player: offset shifts the sound earlier
ok 5 - offline render schedules the whole score in media time
all 5 tests passed (node v24.15.0)
```

How each API used was confirmed for Tone.js 15.1.22 (source files read from the npm package on jsDelivr, docs at tonejs.github.io/docs/15.1.22):

| Call used in the recipes | Confirmed in |
|---|---|
| `Tone.start()` returns a Promise, resumes the context, must be called from a click or key handler | docs `functions/start.html`; `core/Global.js` |
| `Tone.immediate()` = audio clock time without look-ahead; `Tone.now()` adds `lookAhead` (default 0.1 s) | `index.js`, `core/context/Context.js` |
| `new Tone.Limiter({ threshold })`: a `Compressor` with ratio 20, attack 0.003 s, release 0.01 s; default threshold -12 dB | `component/dynamics/Limiter.js` |
| `new Tone.Gain({ gain })`, `new Tone.Filter({ frequency, type })`, `new Tone.Panner({ pan })` (pan limited to -1..1), `new Tone.Oscillator({ frequency, type })` | `core/context/Gain.js`, `component/filter/Filter.js`, `component/channel/Panner.js`, `source/oscillator/Oscillator.js` |
| `.connect(node)`, `.toDestination()` | `core/context/ToneAudioNode.js` |
| `param.setTargetAtTime(value, startTime, timeConstant)` (asserts timeConstant > 0), `param.setValueAtTime(value, time)`, `param.value` | `core/context/Param.js`; MDN `AudioParam.setTargetAtTime` |
| `new Tone.Synth({ oscillator, envelope })`; `triggerAttackRelease(note, duration, time, velocity)`, `triggerAttack(note, time, velocity)`, `triggerRelease(time)`, `setNote(note, time)`, `portamento`, `volume` | docs `classes/Synth.html`; `instrument/Synth.js`, `instrument/Monophonic.js` |
| `new Tone.MembraneSynth()` (pitch sweeps down from 10 times the note in 0.05 s) | `instrument/MembraneSynth.js` |
| `new Tone.NoiseSynth({ envelope })`, `triggerAttack(time)` | `instrument/NoiseSynth.js` |
| A source restarted while still sounding must get a start time strictly greater than its previous one (assertion) | `source/Source.js` |
| `Tone.Offline(callback, duration, channels = 2, sampleRate)` resolves with a `ToneAudioBuffer`; only nodes created inside the callback are rendered | docs `functions/Offline.html`; `core/context/Offline.js` |
| `buffer.numberOfChannels`, `buffer.getChannelData(c)`, `buffer.sampleRate`, `buffer.duration` | `core/context/ToneAudioBuffer.js` |
| `Tone.Recorder`: static `supported`, `start()` (Promise), `stop()` (Promise of Blob), `state`, `mimeType`; a wrapper around `MediaRecorder` on `createMediaStreamDestination()` | docs `classes/Recorder.html`; `component/channel/Recorder.js` |
| `video.requestVideoFrameCallback(cb)`, `metadata.mediaTime`, feature test `'requestVideoFrameCallback' in HTMLVideoElement.prototype` | MDN (Baseline 2024, across browsers since October 2024) |
| `getImageData` throws `SecurityError` on a tainted canvas; so do `toBlob`, `toDataURL`, `captureStream` | MDN `getImageData`, MDN "Use cross-origin images in a canvas" |
| `canvas.captureStream(frameRate)` returns a MediaStream | MDN (Baseline, widely available since January 2020) |
| `navigator.audioSession.type = 'playback'` | MDN `AudioSession.type` (experimental, limited availability); WebKit bug 237322 |
| `role="status"` with `aria-live="polite"`; live region present and empty at load | MDN "ARIA live regions" |
| `role="application"` hands key handling to the page; Tab must still work | MDN "ARIA: application role" |

## Browser smoke test (extra, beyond the status lines)

The status line of every recipe is the conservative one. In addition, the pages were loaded once from `serve.js` in a Chromium 156 based embedded browser pane on 2026-11-14, with the audio output muted and driven by script, not by a person. The pane was not being displayed, so the browser ran no animation frames or video frame callbacks: nothing visual and nothing audible was judged. What was observed:

| Page | Observed | Not covered |
|---|---|---|
| J4 | Tone.js reported version 15.1.22. `renderOffline` on the demo timeline with the real library returned 2 channels, 44,100 Hz, 25.5 s, 1,124,550 frames in 1.6 s; peak -8.57 dBFS, left-channel RMS 0.0505, left and right differ (pan works); `encodeWav` gave 4,498,244 bytes, the predicted size. No console errors. | The download itself, real-time recording. |
| J1 | Page loaded: status "Ready: demo, 24.0 seconds, 240 analysed frames. Press Play.", 7 legend lines. After a scripted click on Play the real engine was built and notes were scheduled about 0.107 s ahead of the audio clock; changing speed and pausing raised no errors, and no notes were scheduled while paused. | Picture, button label and status updates (they run on animation frames). With the pane hidden its timer was throttled, so only some notes were scheduled: the hidden-tab limitation listed below, seen for real. |
| J2 | Demo image generated and read back. Arrow key: "51% across, 50% down: value 0.302, note A3", the same sentence appeared in the live region; Home and Page Down: "0% across, 100% down: value 0.0952, note D3"; brightness mode and the R key (reference announcement) worked. No console errors. | Mouse and touch (the hidden pane has zero layout size), the sound. |
| J3 | The `<video>` played the `captureStream` demo (320 x 180, `currentTime` advanced) and a 64 x 36 `getImageData` read-back of it succeeded. No console errors. | The analysis loop: no video frame callback fired while hidden. |
| J5 | Loaded with the demo track selected and announced, 4 track buttons, `aria-current` on the first. Choosing the SVS 3912 track announced: "Cannot open ... HTTP 404 for timelines/3912.json. This track needs the file timelines/3912.json next to this page." | Playback of a real track. |
| CORS | From `http://127.0.0.1:8765`: drawing `https://svs.gsfc.nasa.gov/.../sst_ecco2_cbar.png` on a canvas and calling `getImageData` threw `SecurityError`; `fetch('https://svs.gsfc.nasa.gov/api/3912')` was blocked, and the console named the header value `https://tempo.multiverse.music`. | - |

So: the Tone.js calls in the engine, the offline renderer, the WAV path, the keyboard probe and the error paths have run against the real library and a real browser once. Listening, visuals, pointer input, the J3 loop, other browsers and phones are still untested.

## Setup shared by every recipe

### Files

Put everything in one folder (for example `web/` in your repository) and serve that folder:

```text
web/
  serve.js                  local development server (not needed on GitHub Pages)
  sonify-core.js            J0: pure mapping functions (browser and Node)
  sonify-core.test.js       Node tests for J0
  jukebox-engine.js         thin Tone.js / DOM layer shared by J1, J3, J4, J5
  jukebox-engine.test.js    Node tests for the engine and player
  j1-player.html            J1: timeline player
  j2-probe.html             J2: live probe on a still image
  j3-live-video.html        J3: live video analysis
  j4-export.html            J4: export (offline WAV render, real-time recording)
  j5-jukebox.html           J5: accessible jukebox shell
  record-node.js            optional: recording without Tone.js
  timelines/3912.json ...   timeline files made by 08-recipes-python.md or by J3
  media/ ...                optional copies of clips and frames (needed for J2 and J3)
```

Each recipe is one HTML page. Pages load Tone.js from the CDN, then `sonify-core.js`, and (except J2) `jukebox-engine.js`, as classic scripts.

### Tone.js: version, CDN, licence

```html
<script src="https://cdn.jsdelivr.net/npm/tone@15.1.22/build/Tone.js"
        integrity="sha384-NWoslxaf/3dYwQk+uGziDYJFdsjBpVlU1WpFRexuDFcIk/5PJpCbpVXia2Uikeix" crossorigin="anonymous"></script>
```

- Measured on 2026-11-14: npm reports `latest` = 15.1.22 (published 2025-04-27), licence MIT, and `next` = 15.5.72 (published 2026-11-14, a pre-release line). The file `build/Tone.js` of 15.1.22 is 345,500 bytes and byte-identical on jsDelivr, unpkg and cdnjs (same SHA-384; jsDelivr's own API lists the same SHA-256). It is a UMD build that defines the global `Tone`.
- The cdnjs API lists 15.5.72 as the library's current version, so a "latest" URL there would give you a pre-release. Always write the version in the URL.
- For the venue: download the file once and serve it yourself, then the page works without the CDN. `curl -L -o Tone.js https://cdn.jsdelivr.net/npm/tone@15.1.22/build/Tone.js`, then use `<script src="Tone.js"></script>`.
- References entry for the submission: "Tone.js 15.1.22, MIT licence, https://github.com/Tonejs/Tone.js". The synth voices used here are generated by Tone.js oscillators and noise, so there are no samples or soundfonts to credit.

### Running locally: `serve.js`

Port 8000 is taken on the team machine, so the examples use 8765.

```text
node serve.js . 8765
```

Then open `http://127.0.0.1:8765/j1-player.html`. Do not open the pages with a `file://` URL: `fetch` of the timeline and pixel reading both fail there.

`python -m http.server 8765 --bind 127.0.0.1` also works for everything except seeking in video files with Chrome, because it ignores Range requests (measured below). A write-up of the Chrome behaviour (cendyne.dev, 2023) explains that Chrome asks for byte ranges of a video and needs `206 Partial Content` with `Content-Range` to seek.

**File `serve.js`**

```js
// serve.js - static file server for local development with HTTP Range support (Chrome needs it to seek in videos).
// Usage:  node serve.js [folder] [port]      example:  node serve.js . 8765   then open http://127.0.0.1:8765/j1-player.html
// Listens on 127.0.0.1 only: nothing is exposed to the network. Node standard library only, nothing to install.
'use strict';
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(process.argv[2] || '.'), port = +(process.argv[3] || 8765);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.webm': 'video/webm', '.mp4': 'video/mp4', '.wav': 'audio/wav', '.md': 'text/markdown; charset=utf-8',
};

http.createServer((req, res) => {
  const fail = (code, text) => { res.writeHead(code, { 'Content-Type': 'text/plain' }); res.end(text); };
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (err) { return fail(400, 'bad request'); }
  let file = path.join(root, rel);
  if (rel.includes('\0') || (file !== root && !file.startsWith(root + path.sep))) return fail(403, 'forbidden');   // stay inside the folder
  if (req.method !== 'GET' && req.method !== 'HEAD') return fail(405, 'method not allowed');
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) { file = path.join(file, 'index.html'); return fs.stat(file, send); }
    send(err, st);
  });
  function send(err, st) {
    if (err || !st.isFile()) return fail(404, 'not found');
    const head = { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
    let start = 0, end = st.size - 1, status = 200;
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m && (m[1] || m[2])) {
      if (m[1]) { start = +m[1]; if (m[2]) end = Math.min(end, +m[2]); } else start = Math.max(0, st.size - +m[2]);   // "500-", "0-99" or "-200"
      if (start > end) { res.writeHead(416, { 'Content-Range': 'bytes */' + st.size }); return res.end(); }
      status = 206; head['Content-Range'] = 'bytes ' + start + '-' + end + '/' + st.size;
    }
    head['Content-Length'] = st.size === 0 ? 0 : end - start + 1;
    res.writeHead(status, head);
    if (req.method === 'HEAD' || st.size === 0) return res.end();
    fs.createReadStream(file, { start, end }).pipe(res);
  }
}).listen(port, '127.0.0.1', () => console.log('Serving ' + root + ' at http://127.0.0.1:' + port + '/  (Ctrl+C stops it)'));
```

Observed on 2026-11-14 (curl against both servers; `test-tone.wav` is the 88,244-byte file written by the unit tests):

```text
node serve.js . 8765
  GET /j1-player.html              : HTTP/1.1 200 OK;Content-Type: text/html; charset=utf-8;Accept-Ranges: bytes;Content-Length: 5405;
  GET /sonify-core.js              : HTTP/1.1 200 OK;Content-Type: text/javascript; charset=utf-8;Accept-Ranges: bytes;Content-Length: 29592;
  GET /test-tone.wav  Range 0-99   : HTTP/1.1 206 Partial Content;Content-Type: audio/wav;Accept-Ranges: bytes;Content-Range: bytes 0-99/88244;Content-Length: 100;
  GET /test-tone.wav  Range 88200- : HTTP/1.1 206 Partial Content;Content-Type: audio/wav;Accept-Ranges: bytes;Content-Range: bytes 88200-88243/88244;Content-Length: 44;
  GET /test-tone.wav  Range -44    : HTTP/1.1 206 Partial Content;Content-Type: audio/wav;Accept-Ranges: bytes;Content-Range: bytes 88200-88243/88244;Content-Length: 44;
  GET /test-tone.wav  Range 999999-: HTTP/1.1 416 Range Not Satisfiable;Content-Range: bytes */88244;
  GET /nope.html                   : HTTP/1.1 404 Not Found;Content-Type: text/plain;
  GET /..%5C..%5Cwork (escape try) : HTTP/1.1 403 Forbidden;Content-Type: text/plain;
  POST /j1-player.html             : HTTP/1.1 405 Method Not Allowed;Content-Type: text/plain;
  GET via http://localhost:8765    : HTTP/1.1 200 OK;Content-Type: text/html; charset=utf-8;Accept-Ranges: bytes;Content-Length: 5405;
python -m http.server 8766 --bind 127.0.0.1   (Python 3.14.6)
  GET /test-tone.wav  Range 0-99   : HTTP/1.0 200 OK;Content-type: audio/wav;Content-Length: 88244;
  GET /sonify-core.js              : HTTP/1.0 200 OK;Content-type: application/javascript;Content-Length: 29592;
```

GitHub Pages answers Range requests (measured on a github.io site: `206`, `Accept-Ranges: bytes`, `Content-Range: bytes 0-1023/58496`), and so does svs.gsfc.nasa.gov (`206` on the 3912 WebM).

### The CORS constraint, as a table

Measured again on 2026-11-14 19:02 GMT with an `Origin: https://example.github.io` request header: the SVS video, the SVS colour-bar PNG and `https://svs.gsfc.nasa.gov/api/3912` all answered `access-control-allow-origin: https://tempo.multiverse.music`. That header names one other site, so for your page the files count as cross-origin without permission.

| What your page does | File on svs.gsfc.nasa.gov | Copy served from your own site |
|---|---|---|
| Show it: `<video src>`, `<img src>` | works | works |
| `drawImage()` it onto a canvas | works, but the canvas becomes tainted | works |
| `getImageData()`, `toBlob()`, `toDataURL()`, `captureStream()` on that canvas | throws `SecurityError` | works |
| `fetch()` the SVS API or a file from JavaScript | blocked by the browser | works |
| Add `crossorigin="anonymous"` to the tag | the file then fails to load at all (unverified, from how CORS-mode requests work) | works |

Consequences: J1 and J5 only show the video, so they may use SVS URLs. J2 and J3 read pixels, so they need copies in your own folder (`media/`). Anything you want from the SVS API must be fetched by a script outside the browser and saved as a file.

### The timeline JSON contract

Shared with 08-recipes-python.md. Every recipe validates a timeline with `validateTimeline` before using it and reports what is wrong.

```text
{
  "meta": {"source": "<SVS id or file name>", "fps": <frames per second of the source>, "frame_step": <every Nth source frame analysed>,
           "n_frames": <number of analysed frames>, "grid": [rows, cols], "value_range": [min, max], "notes": "<what the values mean>"},
  "frames": [
    {"t": <seconds from start>, "mean": <0..1>, "grid": [<rows*cols numbers in 0..1, row-major, top (north) to bottom, left (west) to right>],
     "motion": <0..1 mean absolute change versus the previous analysed frame>, "events": [{"x": <0..1>, "y": <0..1>, "strength": <0..1>}]}
  ]
}
```

A complete, valid two-frame example (grid of 1 row and 2 columns, values in degrees Celsius from -2 to 32):

```json
{"meta": {"source": "3912", "fps": 30, "frame_step": 15, "n_frames": 2, "grid": [1, 2], "value_range": [-2, 32], "notes": "sea surface temperature in degrees C"},
 "frames": [
  {"t": 0.0, "mean": 0.41, "grid": [0.30, 0.52], "motion": 0.0, "events": []},
  {"t": 0.5, "mean": 0.43, "grid": [0.31, 0.55], "motion": 0.02, "events": [{"x": 0.75, "y": 0.5, "strength": 0.6}]}
 ]}
```

Rules the browser side relies on:

- `t` strictly increases. `mean`, `motion`, every `grid` entry and every event field are finite numbers in 0..1. `grid` has exactly rows * cols entries. `meta.n_frames` equals the number of frames.
- **No `NaN`.** Python's `json.dumps` writes `NaN` for a missing value by default (checked: `json.dumps({'mean': float('nan')})` gives `{"mean": NaN}`), and `JSON.parse` in the browser rejects the whole file (checked in Node: `SyntaxError: Unexpected token 'N'`). Fill gaps before saving and pass `allow_nan=False` so Python fails early.
- Data units are recovered as `value_range[0] + v * (value_range[1] - value_range[0])`. The legend text shown to users is built from that.
- Size guide: 10 analysed frames per second with a 6 x 12 grid is about 56 KB of JSON per 10 seconds of video (measured: the 24 s demo timeline, 240 frames, is 134,591 bytes).

## J0. Shared pure-function module: `sonify-core.js`

**Goal.** One file that holds every decision about how numbers become sound, with no browser API in it, so it can be tested in Node and reused by every page (and read by an AI assistant as the single place where the mapping lives).

**What it demonstrates.**

- Scaling: `clamp`, `norm` (value to 0..1), `scaleLinear`, `scaleExp` (equal ratios, which is how pitch and loudness are heard).
- Pitch: `midiToFreq`, `freqToMidi`, `midiToName`; scale tables (`SCALES`), `buildScale`, `valueToIndex`, `quantizeToScale`, and `stickyIndex` (hysteresis: a noisy value sitting on the border between two notes does not trill).
- Smoothing: `ema` (exponential moving average) and `emaAlpha(dt, tau)`, which turns a time constant in seconds into the right smoothing factor for any update rate.
- Rhythm: `euclid(k, n)` spreads k onsets as evenly as possible over n steps; `pulseStep` is a rate-driven tick generator ("Geiger counter").
- Timeline: `validateTimeline` (the contract check), `frameIndexAt` (binary search), `sampleTimeline` (linear interpolation at any time t), `eventsBetween` (half-open window), `timelineStats`, `buildTimeline`.
- The mapping itself: `DEFAULT_MAPPING`, `scoreWindow` (timeline + time window to a list of note events), `padTargets`, `describeMapping` (the mapping in plain words with this clip's numbers).
- Event-scheduling maths: `planWindow` (which slice of media time to schedule on each timer tick, including seek, loop and speed changes) and `makeClipClock` (a clock object shaped like a `<video>` element, for image sequences and the demo).
- Pixels: `luma`, `invertColormap` (legend lookup), `sampleLegend`, `readPixel`, `frameFeatures`, `detectEvents`, `moveProbe`, `describeReading`.
- Files: `encodeWav` (16-bit PCM), `peakDb`, `extensionForMime`.
- Demo data: `makeDemoTimeline`, `demoField`, `DEMO_RAMP`, so every recipe runs with no other files.

Worked examples of the core formulas:

- MIDI to frequency: note 60 gives 440 * 2^((60 - 69) / 12) = 261.63 Hz (middle C).
- Value to note: the lead uses 11 notes (C major pentatonic, C4 to C6: MIDI 60 62 64 67 69 72 74 76 79 81 84). A value of 0.5 gives index floor(0.5 * 11) = 5, which is MIDI 72 (C5). Each note covers 1/11 = 9.1 % of the value range.
- Smoothing: at 15 updates per second (dt = 0.0667 s) and tau = 0.3 s, alpha = 1 - e^(-0.0667 / 0.3) = 0.199, so each update moves the smoothed value 19.9 % of the way to the new reading.
- Euclidean rhythm: `euclid(3, 8)` returns `[1, 0, 0, 1, 0, 0, 1, 0]`: three notes in eight steps, as evenly spaced as eight steps allow.
- Exponential scaling: `scaleExp(0.5, 100, 400)` = 100 * (400 / 100)^0.5 = 200. Half way is one octave above 100 Hz and one octave below 400 Hz.

**File `sonify-core.js`**

```js
/* sonify-core.js (recipe J0)
 * Pure mapping functions for the Earth Information Jukebox: no DOM, no Web Audio, no Tone.js.
 * Browser: <script src="sonify-core.js"></script> defines the global SonifyCore.
 * Node:    const core = require('./sonify-core.js');
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SonifyCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ---------- numbers ----------
  // NaN counts as the low end, so a broken value can never reach an audio parameter.
  const clamp = (v, lo = 0, hi = 1) => (v !== v ? lo : Math.min(hi, Math.max(lo, v)));
  const lerp = (a, b, w) => a + (b - a) * w;
  const round = (v, digits = 4) => +v.toFixed(digits);
  // Where v sits inside [inMin, inMax], as 0..1 (clamped). A flat range gives 0.5.
  const norm = (v, inMin, inMax) => (inMax === inMin ? 0.5 : clamp((v - inMin) / (inMax - inMin)));
  // 0..1 -> [outMin, outMax] in equal steps.
  const scaleLinear = (u, outMin, outMax) => lerp(outMin, outMax, clamp(u));
  // 0..1 -> [outMin, outMax] in equal ratios, which is how we hear pitch and loudness. Both ends must be > 0.
  const scaleExp = (u, outMin, outMax) => outMin * Math.pow(outMax / outMin, clamp(u));

  // ---------- pitch ----------
  // MIDI note number <-> frequency in Hz. 69 = A4 = 440 Hz; +12 = one octave up = double the frequency.
  const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const freqToMidi = (f) => 69 + 12 * Math.log2(f / 440);
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const midiToName = (m) => { const k = Math.round(m); return NOTE_NAMES[((k % 12) + 12) % 12] + (Math.floor(k / 12) - 1); };

  // Scales as semitone offsets from the root note.
  const SCALES = {
    majorPentatonic: [0, 2, 4, 7, 9],
    minorPentatonic: [0, 3, 5, 7, 10],
    major: [0, 2, 4, 5, 7, 9, 11],
    naturalMinor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    wholeTone: [0, 2, 4, 6, 8, 10],
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  };
  const scaleSteps = (name) => { if (!SCALES[name]) throw new Error('unknown scale: ' + name); return SCALES[name]; };
  // Every note of the scale from rootMidi upward over `octaves` octaves, top root included.
  function buildScale(rootMidi, scaleName, octaves) {
    const notes = [];
    for (let o = 0; o < octaves; o++) for (const s of scaleSteps(scaleName)) notes.push(rootMidi + 12 * o + s);
    notes.push(rootMidi + 12 * octaves);
    return notes;
  }
  // 0..1 -> index into a list of n items, equal-width bins: every note gets the same share of the value range.
  const valueToIndex = (u, n) => Math.min(n - 1, Math.floor(clamp(u) * n));
  // Like valueToIndex, but only leaves the previous bin once the value is `margin` bins past its edge.
  // Stops a noisy value that hovers on a bin edge from trilling between two notes (hysteresis).
  function stickyIndex(prevIndex, u, n, margin = 0.25) {
    const raw = valueToIndex(u, n);
    if (prevIndex === null || prevIndex === undefined || raw === prevIndex) return raw;
    const pos = clamp(u) * n;
    return pos < prevIndex - margin || pos >= prevIndex + 1 + margin ? raw : prevIndex;
  }
  // Snap any MIDI number (fractions allowed) to the nearest note of the scale; ties go down.
  function quantizeToScale(midi, rootMidi, scaleName) {
    const steps = scaleSteps(scaleName), base = Math.floor((midi - rootMidi) / 12);
    let best = null;
    for (let o = base - 1; o <= base + 1; o++) {
      for (const s of steps) {
        const cand = rootMidi + 12 * o + s;
        if (best === null || Math.abs(cand - midi) < Math.abs(best - midi)) best = cand;
      }
    }
    return best;
  }

  // ---------- smoothing ----------
  // One step of an exponential moving average. alpha 0 = frozen, 1 = no smoothing.
  const ema = (prev, x, alpha) => (prev === null || prev === undefined ? x : prev + alpha * (x - prev));
  // alpha for a step of dt seconds and a time constant of tau seconds: the same smoothing at any update rate.
  // After tau seconds the output has covered 63.2 % of a sudden change, after 3 * tau about 95 %.
  const emaAlpha = (dt, tau) => (tau <= 0 ? 1 : 1 - Math.exp(-dt / tau));
  const smoothSeries = (xs, alpha) => { let p = null; return xs.map((x) => (p = ema(p, x, alpha))); };

  // ---------- rhythm ----------
  // Euclidean rhythm: k onsets spread as evenly as possible over n steps (1 = play, 0 = rest).
  // Closed-form version of Bjorklund's algorithm; the result can be a rotation of the textbook pattern.
  function euclid(k, n, rotate = 0) {
    const kk = Math.round(clamp(k, 0, n)), out = [];
    for (let i = 0; i < n; i++) out.push(((((i + rotate) % n) + n) % n * kk) % n < kk ? 1 : 0);
    return out;
  }
  // Geiger-counter rhythm: call once per update with the wanted rate; fires each time the phase passes 1.
  function pulseStep(phase, rateHz, dt) {
    const p = phase + rateHz * dt;
    return p >= 1 ? { phase: p % 1, fire: true } : { phase: p, fire: false };
  }

  // ---------- timeline (contract shared with 08-recipes-python.md) ----------
  // Returns a list of problems; an empty list means the object matches the contract.
  function validateTimeline(tl) {
    const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
    const in01 = (v) => isNum(v) && v >= 0 && v <= 1;
    if (!tl || typeof tl !== 'object') return ['timeline is not an object'];
    const m = tl.meta, fr = tl.frames, bad = [];
    if (!m || typeof m !== 'object') return ['meta missing'];
    if (!Array.isArray(fr) || fr.length === 0) return ['frames missing or empty'];
    const gridOk = Array.isArray(m.grid) && m.grid.length === 2 && m.grid.every((v) => Number.isInteger(v) && v >= 1);
    if (!gridOk) bad.push('meta.grid must be [rows, cols]');
    if (!(isNum(m.fps) && m.fps > 0)) bad.push('meta.fps must be a positive number');
    if (!(Array.isArray(m.value_range) && m.value_range.length === 2 && m.value_range.every(isNum))) bad.push('meta.value_range must be [min, max]');
    if (m.n_frames !== fr.length) bad.push('meta.n_frames is ' + m.n_frames + ' but there are ' + fr.length + ' frames');
    const cells = gridOk ? m.grid[0] * m.grid[1] : -1;
    for (let i = 0; i < fr.length && bad.length < 8; i++) {
      const f = fr[i], at = 'frames[' + i + ']';
      if (!f || !isNum(f.t)) { bad.push(at + '.t must be a number'); continue; }
      if (i > 0 && fr[i - 1] && isNum(fr[i - 1].t) && !(f.t > fr[i - 1].t)) bad.push(at + '.t must be greater than the previous t');
      if (!in01(f.mean)) bad.push(at + '.mean must be a number in 0..1');
      if (!in01(f.motion)) bad.push(at + '.motion must be a number in 0..1');
      if (!(Array.isArray(f.grid) && f.grid.length === cells && f.grid.every(in01))) bad.push(at + '.grid must hold rows*cols numbers in 0..1');
      if (!(Array.isArray(f.events) && f.events.every((e) => e && in01(e.x) && in01(e.y) && in01(e.strength)))) bad.push(at + '.events must be a list of {x, y, strength} in 0..1');
    }
    return bad;
  }
  // Index of the last frame with frame.t <= t (binary search); -1 if t is before the first frame.
  function frameIndexAt(frames, t) {
    let lo = 0, hi = frames.length - 1, ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (frames[mid].t <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return ans;
  }
  // Timeline values at any time t (seconds), linearly interpolated between the two neighbouring frames.
  // Before the first frame and after the last one it holds the edge frame. Events are not interpolated: see eventsBetween.
  function sampleTimeline(tl, t) {
    const fr = tl.frames, i = frameIndexAt(fr, t);
    const a = fr[Math.max(0, i)], b = fr[Math.min(fr.length - 1, i + 1)];
    const w = i < 0 || b === a ? 0 : clamp((t - a.t) / (b.t - a.t));
    const grid = new Array(a.grid.length);
    for (let k = 0; k < grid.length; k++) grid[k] = lerp(a.grid[k], b.grid[k], w);
    return { t, index: Math.max(0, i), weight: w, mean: lerp(a.mean, b.mean, w), motion: lerp(a.motion, b.motion, w), grid };
  }
  // Events of every frame whose time lies in the half-open window (t0, t1], each tagged with its frame time.
  function eventsBetween(frames, t0, t1) {
    const out = [];
    for (let i = frameIndexAt(frames, t0) + 1; i < frames.length && frames[i].t <= t1; i++) {
      for (const e of frames[i].events) out.push({ t: frames[i].t, x: e.x, y: e.y, strength: e.strength });
    }
    return out;
  }
  // Ranges used to fit the mapping to one clip.
  function timelineStats(tl) {
    const fr = tl.frames, n = fr.length;
    let meanMin = Infinity, meanMax = -Infinity, motionMax = 0, events = 0;
    for (const f of fr) {
      meanMin = Math.min(meanMin, f.mean); meanMax = Math.max(meanMax, f.mean);
      motionMax = Math.max(motionMax, f.motion); events += f.events.length;
    }
    const gap = n > 1 ? (fr[n - 1].t - fr[0].t) / (n - 1) : 1 / tl.meta.fps;
    return { meanMin, meanMax, motionMax, events, duration: fr[n - 1].t + gap };
  }
  // Wrap analysed frames into the contract shape (used by recipe J3 to save a timeline made in the browser).
  function buildTimeline(source, frames, rows, cols, notes) {
    const n = frames.length, span = n > 1 ? frames[n - 1].t - frames[0].t : 0;
    return {
      meta: { source, fps: span > 0 ? round((n - 1) / span, 3) : 1, frame_step: 1, n_frames: n, grid: [rows, cols], value_range: [0, 1], notes },
      frames,
    };
  }
  // Brightness-weighted centre of a row-major grid: x 0 = west (left), 1 = east (right); y 0 = north (top).
  function gridCentroid(grid, rows, cols) {
    let sum = 0, sx = 0, sy = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = grid[r * cols + c];
        sum += v; sx += v * (c + 0.5) / cols; sy += v * (r + 0.5) / rows;
      }
    }
    return sum > 1e-9 ? { x: sx / sum, y: sy / sum, total: sum } : { x: 0.5, y: 0.5, total: 0 };
  }
  // x 0..1 -> stereo pan -1 (left) .. +1 (right). width < 1 keeps sounds off the hard extremes;
  // gain > 1 exaggerates small shifts around the centre.
  const panFromX = (x, width = 0.8, gain = 1) => clamp((2 * clamp(x) - 1) * gain, -1, 1) * width;

  // ---------- the mapping: timeline -> musical events ----------
  const DEFAULT_MAPPING = {
    scale: 'majorPentatonic',
    rootMidi: 48,          // C3: root of the pad drone. The lead plays from one octave above (C4).
    leadOctaves: 2,        // lead range C4..C6 = 11 pentatonic notes
    leadRange: 'auto',     // 'auto' = stretch this clip's own min..max of `mean` over the notes; or [lo, hi] in 0..1
    stepSeconds: 0.25,     // lead grid in MEDIA seconds (so it follows playbackRate)
    stepsPerBar: 16,       // one bar = 16 * 0.25 = 4 s of video
    minPulses: 3,          // lead notes per bar when nothing moves ...
    maxPulses: 12,         // ... and at the largest motion found in this clip
    refValue: 0.5,         // reference blip pitch = the note for this position in the lead range
    drumLowMidi: 36,       // C2 for events at the bottom (south) edge, one octave higher at the top
    minEventStrength: 0.1,
    maxEventsPerFrame: 3,
    padMinHz: 250, padMaxHz: 2500,     // pad filter cutoff at the lowest / highest level
    padMinGain: 0.04, padMaxGain: 0.22,
    panGain: 3,            // the centroid of a full map moves little: exaggerate it
  };
  const leadNotes = (map) => buildScale(map.rootMidi + 12, map.scale, map.leadOctaves);
  const leadRange = (map, stats) => (map.leadRange === 'auto' ? [stats.meanMin, stats.meanMax] : map.leadRange);
  // One timeline event -> one drum hit: north = higher drum, strength = loudness, west-east = left-right.
  const drumEvent = (e, map) => ({
    t: e.t, kind: 'drum', midi: map.drumLowMidi + Math.round((1 - clamp(e.y)) * 12),
    vel: round(0.35 + 0.65 * clamp(e.strength)), pan: panFromX(e.x), x: e.x, y: e.y,
  });
  // Every sound-starting event with media time in the half-open window (from, to], sorted by time.
  // Deterministic: the live player and the offline WAV render both call this, so they play the same notes.
  function scoreWindow(tl, map, stats, from, to) {
    const out = [], notes = leadNotes(map), [lo, hi] = leadRange(map, stats);
    const step = map.stepSeconds, n = map.stepsPerBar, [rows, cols] = tl.meta.grid;
    for (let k = Math.max(0, Math.floor(from / step) + 1); k * step <= to && k * step < stats.duration; k++) {
      const t = k * step, pos = k % n;
      if (pos === 0 && map.refValue !== null) out.push({ t, kind: 'ref', midi: notes[valueToIndex(map.refValue, notes.length)] });
      // rhythm: more change in the picture at the start of this bar -> more notes in this bar
      const motionU = norm(sampleTimeline(tl, t - pos * step).motion, 0, stats.motionMax);
      if (!euclid(lerp(map.minPulses, map.maxPulses, motionU), n)[pos]) continue;
      const s = sampleTimeline(tl, t), u = norm(s.mean, lo, hi);
      out.push({
        t, kind: 'lead', midi: notes[valueToIndex(u, notes.length)], u: round(u), vel: pos % 4 === 0 ? 0.9 : 0.6,
        pan: round(panFromX(gridCentroid(s.grid, rows, cols).x, 0.8, map.panGain)), dur: step * 0.8,
      });
    }
    let group = [];
    const flush = () => {
      group.sort((a, b) => b.strength - a.strength);
      for (const e of group.slice(0, map.maxEventsPerFrame)) out.push(drumEvent(e, map));
      group = [];
    };
    for (const e of eventsBetween(tl.frames, from, to)) {
      if (e.strength < map.minEventStrength) continue;
      if (group.length && group[0].t !== e.t) flush();
      group.push(e);
    }
    flush();
    return out.sort((a, b) => a.t - b.t);
  }
  // Continuous (not note-based) settings of the pad for one frame or sample: louder and brighter as the level rises.
  function padTargets(sample, map, stats) {
    const [lo, hi] = leadRange(map, stats), u = norm(sample.mean, lo, hi);
    return { gain: scaleLinear(u, map.padMinGain, map.padMaxGain), cutoff: scaleExp(u, map.padMinHz, map.padMaxHz) };
  }
  // The mapping in plain words, with this clip's numbers: show it before playback and put it in the docs.
  function describeMapping(tl, map, stats) {
    const notes = leadNotes(map), [lo, hi] = leadRange(map, stats), [vmin, vmax] = tl.meta.value_range;
    const units = (u) => +(vmin + u * (vmax - vmin)).toPrecision(3);     // 0..1 -> data units
    const span = (du) => +(du * (vmax - vmin)).toPrecision(2);          // a difference in data units
    const bar = map.stepsPerBar * map.stepSeconds;
    return [
      'What the numbers mean: ' + tl.meta.notes + '.',
      'Lead notes: pitch follows the overall level of the picture. The lowest note (' + midiToName(notes[0]) + ') is ' + units(lo) +
        ' and the highest note (' + midiToName(notes[notes.length - 1]) + ') is ' + units(hi) + '. Pitches are snapped to ' + notes.length +
        ' notes of a ' + map.scale.replace(/([A-Z])/g, ' $1').toLowerCase() + ' scale, so one note step is about ' + span((hi - lo) / notes.length) + '.',
      'Rhythm: the more the picture changes, the more lead notes you hear: from ' + map.minPulses + ' to ' + map.maxPulses + ' notes in every ' + bar + ' seconds of video.',
      'Reference blip: a short pure tone at the start of every ' + bar + ' seconds marks the level ' + units(lerp(lo, hi, map.refValue)) +
        ' (note ' + midiToName(notes[valueToIndex(map.refValue, notes.length)]) + '). Lead notes above it are higher values, below it lower values.',
      'Pad: a soft drone that slowly gets louder and brighter as the overall level rises.',
      'Drum hits: one per detected event (' + stats.events + ' in this clip). Left or right follows west or east, a higher drum is further north, a harder hit is a stronger event.',
      'Stereo: the lead leans towards the side of the picture where most of the signal is.',
    ];
  }

  // ---------- event-scheduling maths ----------
  // Call on every timer tick with the media clock time t (seconds) and its playbackRate.
  // Returns the half-open slice (from, to] of MEDIA time whose events must be scheduled now, looking `ahead`
  // seconds of real time past the playhead, plus the state to pass to the next call.
  // A first call, a backward jump (seek or loop) or a jump past everything already scheduled re-anchors
  // the window just behind the playhead, so nothing old is replayed and nothing floods. It starts lookBack
  // seconds behind because the first poll after Play (or after a loop wrap) arrives a few tens of
  // milliseconds late, and an event at exactly t = 0 must not be lost.
  const NEW_PLAN = { prevT: null, until: 0 };
  function planWindow(state, t, rate, ahead, lookBack = 0.06) {
    const fresh = !state || state.prevT === null;
    const jumped = !fresh && (t < state.prevT - 1e-3 || t > state.until + 1e-3);
    const from = fresh || jumped ? t - lookBack : state.until;
    const to = Math.max(from, t + ahead * Math.max(rate, 0));
    return { from, to, reanchored: fresh || jumped, state: { prevT: t, until: to } };
  }

  // ---------- a clock shaped like a <video> element (for image sequences and the built-in demo) ----------
  // nowSeconds: function returning a monotonic time in seconds, e.g. () => performance.now() / 1000.
  function makeClipClock(duration, nowSeconds) {
    let base = 0, startedAt = null, rate = 1;
    const raw = () => (startedAt === null ? base : base + (nowSeconds() - startedAt) * rate);
    const clock = {
      duration, loop: false, readyState: 4,
      get paused() { return startedAt === null; },
      get ended() { return !clock.loop && raw() >= duration; },
      get currentTime() { const p = raw(); return clock.loop ? ((p % duration) + duration) % duration : clamp(p, 0, duration); },
      set currentTime(v) { base = clamp(v, 0, duration); if (startedAt !== null) startedAt = nowSeconds(); },
      get playbackRate() { return rate; },
      set playbackRate(r) { base = clock.currentTime; if (startedAt !== null) startedAt = nowSeconds(); rate = r; },
      play() {
        if (clock.ended) { base = 0; startedAt = null; }
        if (startedAt === null) { base = clock.currentTime; startedAt = nowSeconds(); }
        return Promise.resolve();
      },
      pause() { base = clock.currentTime; startedAt = null; },
    };
    return clock;
  }
  // 'frames/f_{0000}.jpg', 7 -> 'frames/f_0007.jpg' (the number of zeros sets the padding width).
  const sequenceFrameUrl = (pattern, i) => pattern.replace(/\{(0+)\}/, (_, z) => String(i).padStart(z.length, '0'));
  const sequenceIndexAt = (t, fps, count) => Math.floor(clamp(t * fps + 1e-6, 0, count - 1));

  // ---------- pixels (plain arrays: pass ImageData.data; no canvas is needed here) ----------
  // Brightness 0..1 of one 8-bit RGB pixel. Rec. 709 weights applied to the stored (gamma-encoded) values:
  // a fast stand-in for true luminance, good enough to rank pixels from dark to bright.
  const luma = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  // n colours [r, g, b] interpolated along a short list of anchor colours (a legend from its low end to its high end).
  function makeRamp(anchors, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const p = (i / (n - 1)) * (anchors.length - 1), k = Math.min(anchors.length - 2, Math.floor(p)), w = p - k;
      out.push([0, 1, 2].map((c) => Math.round(lerp(anchors[k][c], anchors[k + 1][c], w))));
    }
    return out;
  }
  const rampColor = (u, stops) => stops[valueToIndex(u, stops.length)];
  // Colour-map inversion: which position 0..1 along the legend has the colour closest to this pixel?
  // stops = [[r, g, b], ...] from the legend's minimum end to its maximum end.
  // dist is the RGB distance to that colour (0..441): a large value means "not a data colour" (coastline, label, land).
  // ponytail: nearest stop only, O(stops) per pixel; use 64+ stops. Fails for legends that reuse a colour (cyclic maps).
  function invertColormap(r, g, b, stops) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i], d = (r - s[0]) ** 2 + (g - s[1]) ** 2 + (b - s[2]) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    }
    return { u: stops.length > 1 ? best / (stops.length - 1) : 0, dist: Math.sqrt(bestD) };
  }
  // Read n legend colours along a straight line across a colour bar inside the image (ends given as fractions 0..1).
  function sampleLegend(data, w, h, x0, y0, x1, y1, n) {
    const stops = [];
    for (let k = 0; k < n; k++) {
      const p = k / (n - 1), x = Math.round(lerp(x0, x1, p) * (w - 1)), y = Math.round(lerp(y0, y1, p) * (h - 1)), i = 4 * (y * w + x);
      stops.push([data[i], data[i + 1], data[i + 2]]);
    }
    return stops;
  }
  // Value under a probe. data = ImageData.data (RGBA bytes, row-major), w = image width in pixels.
  // stops given: colour-map inversion, noData when the colour is further than maxDist from every legend colour.
  // stops null: plain brightness.
  function readPixel(data, w, x, y, stops, maxDist) {
    const i = 4 * (y * w + x), r = data[i], g = data[i + 1], b = data[i + 2];
    if (!stops) return { u: luma(r, g, b), noData: false };
    const hit = invertColormap(r, g, b, stops);
    return { u: hit.u, noData: hit.dist > maxDist };
  }
  // Keyboard movement of a probe on a w*h image: returns the new {x, y} in pixels, or null if the key does not move it.
  function moveProbe(pos, key, big, w, h, step) {
    const d = (big ? 4 : 1) * step;
    const moves = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d], Home: [-w, 0], End: [w, 0], PageUp: [0, -h], PageDown: [0, h] };
    const m = Object.prototype.hasOwnProperty.call(moves, key) ? moves[key] : null;
    return m ? { x: clamp(pos.x + m[0], 0, w - 1), y: clamp(pos.y + m[1], 0, h - 1) } : null;
  }
  // The sentence a screen reader speaks for one probe reading.
  function describeReading(x, y, w, h, reading, valueRange, unit, midi) {
    const where = Math.round(100 * x / (w - 1)) + '% across, ' + Math.round(100 * y / (h - 1)) + '% down';
    if (reading.noData) return where + ': no data here';
    const v = valueRange[0] + reading.u * (valueRange[1] - valueRange[0]);
    return where + ': value ' + +v.toPrecision(3) + (unit ? ' ' + unit : '') + ', note ' + midiToName(midi);
  }
  // Features of one small RGBA frame (ImageData.data of a w*h canvas).
  // prev = the `luma` array returned for the previous analysed frame, or null. rows*cols = grid of the timeline contract.
  function frameFeatures(rgba, w, h, prev, rows, cols) {
    const n = w * h, lum = new Float32Array(n), grid = new Array(rows * cols).fill(0), count = new Array(rows * cols).fill(0);
    let sum = 0, diff = 0, sx = 0, sy = 0, red = 0, blue = 0;
    for (let i = 0; i < n; i++) {
      const r = rgba[4 * i], g = rgba[4 * i + 1], b = rgba[4 * i + 2], v = luma(r, g, b), x = i % w, y = (i - x) / w;
      lum[i] = v; sum += v; sx += v * (x + 0.5) / w; sy += v * (y + 0.5) / h; red += r; blue += b;
      if (prev) diff += Math.abs(v - prev[i]);
      const cell = Math.min(rows - 1, Math.floor(y * rows / h)) * cols + Math.min(cols - 1, Math.floor(x * cols / w));
      grid[cell] += v; count[cell]++;
    }
    for (let k = 0; k < grid.length; k++) grid[k] = count[k] ? grid[k] / count[k] : 0;
    return {
      luma: lum, mean: sum / n, motion: prev ? diff / n : 0, grid,
      cx: sum > 1e-9 ? sx / sum : 0.5, cy: sum > 1e-9 ? sy / sum : 0.5,
      warmth: clamp(0.5 + (red - blue) / (2 * 255 * n)),   // 0 = blue dominates, 0.5 = neutral, 1 = red dominates
    };
  }
  // Flash detector: at most one event per grid cell, where a pixel got brighter by more than `threshold` since the last frame.
  function detectEvents(lum, prev, w, h, rows, cols, threshold, maxEvents) {
    if (!prev) return [];
    const best = new Array(rows * cols).fill(null);
    for (let i = 0; i < lum.length; i++) {
      const up = lum[i] - prev[i];
      if (up <= threshold) continue;
      const x = i % w, y = (i - x) / w;
      const cell = Math.min(rows - 1, Math.floor(y * rows / h)) * cols + Math.min(cols - 1, Math.floor(x * cols / w));
      if (!best[cell] || up > best[cell].up) best[cell] = { up, x: (x + 0.5) / w, y: (y + 0.5) / h };
    }
    return best.filter(Boolean).sort((a, b) => b.up - a.up).slice(0, maxEvents)
      .map((e) => ({ x: round(e.x), y: round(e.y), strength: round(clamp(e.up)) }));
  }

  // ---------- audio files ----------
  // channels: array of Float32Array of equal length, samples in -1..1. Returns an ArrayBuffer: a 16-bit PCM WAV file.
  function encodeWav(channels, sampleRate) {
    const nCh = channels.length, nFrames = channels[0].length, dataBytes = nFrames * nCh * 2;
    const buf = new ArrayBuffer(44 + dataBytes), v = new DataView(buf);
    const str = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + dataBytes, true); str(8, 'WAVE');
    str(12, 'fmt '); v.setUint32(16, 16, true);          // fmt chunk: 16 bytes follow
    v.setUint16(20, 1, true);                            // format 1 = PCM
    v.setUint16(22, nCh, true);
    v.setUint32(24, sampleRate, true);
    v.setUint32(28, sampleRate * nCh * 2, true);         // bytes per second
    v.setUint16(32, nCh * 2, true);                      // bytes per frame (all channels)
    v.setUint16(34, 16, true);                           // bits per sample
    str(36, 'data'); v.setUint32(40, dataBytes, true);
    let off = 44;
    for (let i = 0; i < nFrames; i++) {
      for (let c = 0; c < nCh; c++) {
        const x = channels[c][i], s = x !== x ? 0 : clamp(x, -1, 1);   // NaN -> silence, overshoot -> clipped
        v.setInt16(off, Math.round(s < 0 ? s * 32768 : s * 32767), true);
        off += 2;
      }
    }
    return buf;
  }
  // Loudest sample of a render in dB relative to full scale (0 dBFS = the loudest a WAV can hold; -Infinity = silence).
  function peakDb(channels) {
    let peak = 0;
    for (const ch of channels) for (let i = 0; i < ch.length; i++) peak = Math.max(peak, Math.abs(ch[i]));
    return 20 * Math.log10(peak);
  }
  const extensionForMime = (mime) => (/webm/.test(mime) ? 'webm' : /ogg/.test(mime) ? 'ogg' : /mp4|m4a|aac/.test(mime) ? 'm4a' : /wav/.test(mime) ? 'wav' : 'bin');

  // ---------- built-in demo data (every recipe runs with no other files) ----------
  // Dark blue -> blue -> teal -> yellow -> near white; brightness rises all the way, so brightness mode works on it too.
  const DEMO_RAMP = makeRamp([[8, 16, 80], [20, 90, 170], [40, 170, 160], [240, 200, 60], [250, 250, 220]], 64);
  const DEMO_LAND = [120, 110, 100];
  // Synthetic "data" for the J2 demo image: value 0..1 at a normalised position, or null on a grey "land" patch.
  function demoField(nx, ny) {
    if ((nx - 0.62) ** 2 + (ny - 0.25) ** 2 < 0.01) return null;
    const blob = (cx, cy, s) => Math.exp(-((nx - cx) ** 2 + (ny - cy) ** 2) / (2 * s * s));
    return clamp(0.1 + 0.45 * nx * (1 - ny) + 0.6 * blob(0.3, 0.6, 0.12) + 0.35 * blob(0.85, 0.75, 0.08));
  }
  // Synthetic timeline in the contract shape: a bright patch drifts west -> east while the overall level rises,
  // with one "flash" event every 1.5 s.
  function makeDemoTimeline(seconds = 24, fps = 10, rows = 6, cols = 12) {
    const n = Math.round(seconds * fps), frames = [], frac = (v) => v - Math.floor(v);
    let prev = null;
    for (let i = 0; i < n; i++) {
      const t = i / fps, p = i / (n - 1);
      const level = 0.15 + 0.5 * p + 0.1 * Math.sin(2 * Math.PI * t / 6);
      const bx = 0.1 + 0.8 * p, by = 0.5 + 0.3 * Math.sin(4 * Math.PI * p);
      const grid = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const dx = (c + 0.5) / cols - bx, dy = (r + 0.5) / rows - by;
          grid.push(round(clamp(0.3 * level + (0.3 + 0.7 * level) * Math.exp(-(dx * dx + dy * dy) / 0.03))));
        }
      }
      const mean = round(grid.reduce((a, b) => a + b, 0) / grid.length);
      const motion = prev ? round(grid.reduce((a, b, k) => a + Math.abs(b - prev[k]), 0) / grid.length) : 0;
      const events = i % Math.round(1.5 * fps) === 0 && i > 0
        ? [{ x: round(frac(Math.sin(i * 12.9898) * 43758.5453)), y: round(frac(Math.sin(i * 78.233) * 12345.678)), strength: round(0.4 + 0.6 * frac(Math.sin(i * 3.7) * 999.9)) }]
        : [];
      frames.push({ t: round(t), mean, grid, motion, events });
      prev = grid;
    }
    return {
      meta: { source: 'demo', fps, frame_step: 1, n_frames: n, grid: [rows, cols], value_range: [0, 1], notes: 'synthetic demo data: brightness of a drifting patch, 0 = dark, 1 = bright' },
      frames,
    };
  }

  return {
    clamp, lerp, round, norm, scaleLinear, scaleExp,
    midiToFreq, freqToMidi, midiToName, SCALES, buildScale, valueToIndex, stickyIndex, quantizeToScale,
    ema, emaAlpha, smoothSeries, euclid, pulseStep,
    validateTimeline, frameIndexAt, sampleTimeline, eventsBetween, timelineStats, buildTimeline, gridCentroid, panFromX,
    DEFAULT_MAPPING, leadNotes, leadRange, drumEvent, scoreWindow, padTargets, describeMapping,
    NEW_PLAN, planWindow, makeClipClock, sequenceFrameUrl, sequenceIndexAt,
    luma, makeRamp, rampColor, invertColormap, sampleLegend, readPixel, moveProbe, describeReading, frameFeatures, detectEvents,
    encodeWav, peakDb, extensionForMime,
    DEMO_RAMP, DEMO_LAND, demoField, makeDemoTimeline,
  };
});
```

**File `sonify-core.test.js`**

```js
// sonify-core.test.js - run with:  node sonify-core.test.js
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('./sonify-core.js');

let count = 0;
const test = (name, fn) => { fn(); count++; console.log('ok ' + count + ' - ' + name); };
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, a + ' is not within ' + eps + ' of ' + b);

test('clamp, norm, linear and exponential scaling', () => {
  assert.equal(core.clamp(2), 1); assert.equal(core.clamp(-1), 0); assert.equal(core.clamp(NaN), 0);
  assert.equal(core.norm(5, 0, 10), 0.5); assert.equal(core.norm(3, 3, 3), 0.5); assert.equal(core.norm(99, 0, 10), 1);
  assert.equal(core.scaleLinear(0.25, 100, 200), 125);
  near(core.scaleExp(0.5, 100, 400), 200);            // half way in ratio terms = one octave above 100 Hz
});

test('MIDI <-> frequency and note names', () => {
  assert.equal(core.midiToFreq(69), 440);
  near(core.midiToFreq(60), 261.6255653, 1e-6);       // middle C
  near(core.freqToMidi(880), 81);
  assert.equal(core.midiToName(60), 'C4'); assert.equal(core.midiToName(69), 'A4'); assert.equal(core.midiToName(61), 'C#4');
});

test('scale tables, value -> note index, quantize', () => {
  assert.deepEqual(core.buildScale(60, 'majorPentatonic', 2), [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84]);
  assert.equal(core.valueToIndex(0, 11), 0); assert.equal(core.valueToIndex(0.5, 11), 5); assert.equal(core.valueToIndex(1, 11), 10);
  assert.equal(core.quantizeToScale(61, 60, 'majorPentatonic'), 60);    // tie between 60 and 62 goes down
  assert.equal(core.quantizeToScale(66, 60, 'majorPentatonic'), 67);
  assert.equal(core.quantizeToScale(58.9, 60, 'majorPentatonic'), 60);  // looks into the octave below too
  assert.throws(() => core.buildScale(60, 'nope', 1), /unknown scale/);
});

test('stickyIndex ignores small wobbles across a bin edge', () => {
  assert.equal(core.stickyIndex(null, 0.5, 10), 5);
  assert.equal(core.stickyIndex(3, 0.41, 10), 3);     // 4.1 bins: inside the 0.25 margin, stay on 3
  assert.equal(core.stickyIndex(3, 0.43, 10), 4);     // 4.3 bins: past the margin, move
  assert.equal(core.stickyIndex(3, 0.29, 10), 3);
  assert.equal(core.stickyIndex(3, 0.27, 10), 2);
});

test('exponential smoothing', () => {
  assert.equal(core.ema(null, 5, 0.2), 5); assert.equal(core.ema(0, 10, 0.5), 5);
  near(core.emaAlpha(1, 1), 1 - 1 / Math.E);          // 63.2 % after one time constant
  assert.equal(core.emaAlpha(0.1, 0), 1);
  assert.deepEqual(core.smoothSeries([0, 10, 10], 0.5), [0, 5, 7.5]);
});

test('Euclidean rhythm and pulse accumulator', () => {
  assert.deepEqual(core.euclid(3, 8), [1, 0, 0, 1, 0, 0, 1, 0]);
  assert.deepEqual(core.euclid(4, 16), [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
  assert.deepEqual(core.euclid(3, 8, 1), [0, 0, 1, 0, 0, 1, 0, 1]);
  for (let k = 0; k <= 16; k++) assert.equal(core.euclid(k, 16).reduce((a, b) => a + b, 0), k);
  let phase = 0, fires = 0;
  for (let i = 0; i < 100; i++) { const s = core.pulseStep(phase, 4, 0.01); phase = s.phase; fires += s.fire ? 1 : 0; }
  assert.ok(fires >= 3 && fires <= 4, 'about 4 pulses in 1 s at 4 Hz, got ' + fires);   // 100 * 0.04 lands on 4 only up to rounding
});

const demo = core.makeDemoTimeline();
const stats = core.timelineStats(demo);
const map = core.DEFAULT_MAPPING;

test('demo timeline matches the contract and survives JSON', () => {
  assert.deepEqual(core.validateTimeline(demo), []);
  assert.deepEqual(core.validateTimeline(JSON.parse(JSON.stringify(demo))), []);
  assert.equal(demo.frames.length, 240); assert.equal(demo.frames[0].grid.length, 72);
  near(stats.duration, 24, 1e-9);
  assert.ok(stats.events === 15, 'one event every 1.5 s, got ' + stats.events);
});

test('validateTimeline reports broken input', () => {
  const broken = JSON.parse(JSON.stringify(demo));
  broken.frames[1].grid.pop(); broken.frames[2].mean = null; broken.frames[3].t = 0; broken.meta.n_frames = 7;
  const problems = core.validateTimeline(broken);
  assert.ok(problems.some((p) => /n_frames/.test(p)));
  assert.ok(problems.some((p) => /frames\[1\]\.grid/.test(p)));
  assert.ok(problems.some((p) => /frames\[2\]\.mean/.test(p)));
  assert.ok(problems.some((p) => /frames\[3\]\.t/.test(p)));
  assert.deepEqual(core.validateTimeline(null), ['timeline is not an object']);
  assert.deepEqual(core.validateTimeline({ meta: {}, frames: [] }), ['frames missing or empty']);
});

test('timeline lookup: index, interpolation, events', () => {
  const tl = {
    meta: { source: 't', fps: 1, frame_step: 1, n_frames: 3, grid: [1, 2], value_range: [10, 30], notes: 'test units' },
    frames: [
      { t: 0, mean: 0.0, grid: [0, 0], motion: 0, events: [{ x: 0.1, y: 0.2, strength: 1 }] },
      { t: 1, mean: 0.5, grid: [0, 1], motion: 0.2, events: [] },
      { t: 2, mean: 1.0, grid: [1, 1], motion: 0.4, events: [{ x: 0.9, y: 0.5, strength: 0.5 }, { x: 0.5, y: 0.5, strength: 0.05 }] },
    ],
  };
  assert.deepEqual(core.validateTimeline(tl), []);
  assert.equal(core.frameIndexAt(tl.frames, -1), -1); assert.equal(core.frameIndexAt(tl.frames, 0), 0);
  assert.equal(core.frameIndexAt(tl.frames, 1.99), 1); assert.equal(core.frameIndexAt(tl.frames, 99), 2);
  const s = core.sampleTimeline(tl, 0.5);
  near(s.mean, 0.25); near(s.motion, 0.1); assert.deepEqual(s.grid, [0, 0.5]);
  near(core.sampleTimeline(tl, -5).mean, 0); near(core.sampleTimeline(tl, 99).mean, 1);   // holds the edge frames
  assert.equal(core.eventsBetween(tl.frames, -0.001, 0).length, 1);    // (t0, t1] includes t1 ...
  assert.equal(core.eventsBetween(tl.frames, 0, 1.5).length, 0);       // ... and excludes t0
  assert.equal(core.eventsBetween(tl.frames, 1.5, 2).length, 2);
  const st = core.timelineStats(tl);
  assert.deepEqual([st.meanMin, st.meanMax, st.motionMax, st.events, st.duration], [0, 1, 0.4, 3, 3]);
  const text = core.describeMapping(tl, map, st).join(' ');
  assert.ok(/lowest note \(C4\) is 10 /.test(text) && /highest note \(C6\) is 30/.test(text), text);
  assert.ok(/11 notes of a major pentatonic scale, so one note step is about 1\.8\./.test(text), text);   // (30 - 10) / 11 notes
});

test('grid centroid and pan', () => {
  assert.deepEqual(core.gridCentroid([0, 0, 0, 1], 1, 4), { x: 0.875, y: 0.5, total: 1 });
  assert.deepEqual(core.gridCentroid([0, 0], 1, 2), { x: 0.5, y: 0.5, total: 0 });
  near(core.panFromX(0), -0.8); near(core.panFromX(1), 0.8); near(core.panFromX(0.5), 0);
  near(core.panFromX(0.6, 0.8, 3), 0.48);              // 0.2 off centre * gain 3 * width 0.8
});

test('planWindow tiles media time without gaps or overlaps, and re-anchors on jumps', () => {
  let state = core.NEW_PLAN, last = null;
  for (let i = 0; i < 40; i++) {
    const w = core.planWindow(state, i * 0.025, 1, 0.12);
    if (last) { assert.equal(w.from, last.to); assert.equal(w.reanchored, false); } else assert.equal(w.reanchored, true);
    assert.ok(w.to >= w.from); last = w; state = w.state;
  }
  near(last.to, 39 * 0.025 + 0.12);
  const back = core.planWindow(state, 0.2, 1, 0.12);                   // seek backwards (or loop wrap)
  assert.equal(back.reanchored, true); near(back.from, 0.14); near(back.to, 0.32);   // starts 0.06 s behind the playhead
  const fwd = core.planWindow(back.state, 10, 1, 0.12);                // seek forwards past everything scheduled
  assert.equal(fwd.reanchored, true); near(fwd.from, 9.94);
  const slow = core.planWindow(fwd.state, 10.01, 0.25, 0.12);          // rate drops: horizon moves back, nothing new
  assert.equal(slow.reanchored, false); assert.equal(slow.from, slow.to);
  const first = core.planWindow(core.NEW_PLAN, 0, 1, 0.12);
  assert.ok(first.from < 0, 'an event exactly at t = 0 is inside the first window');
});

test('scoreWindow: many small live windows give exactly the same notes as one big window', () => {
  const whole = core.scoreWindow(demo, map, stats, -1e-3, stats.duration);
  const pieces = [];
  let state = core.NEW_PLAN;
  for (let t = 0; t < stats.duration; t += 0.025) {
    const w = core.planWindow(state, t, 1, 0.12); state = w.state;
    pieces.push(...core.scoreWindow(demo, map, stats, w.from, w.to));
  }
  const key = (e) => e.kind + '@' + e.t.toFixed(4) + ':' + e.midi;
  assert.deepEqual(pieces.map(key).sort(), whole.map(key).sort());
  const kinds = { lead: 0, ref: 0, drum: 0 };
  for (const e of whole) kinds[e.kind]++;
  assert.equal(kinds.ref, 6);                                          // one per 4 s bar in 24 s
  assert.equal(kinds.drum, 15);
  assert.ok(kinds.lead >= 6 * map.minPulses && kinds.lead <= 6 * map.maxPulses, 'lead notes: ' + kinds.lead);
  const notes = core.leadNotes(map);
  for (const e of whole) {
    assert.ok(Number.isFinite(e.t) && e.t >= 0 && e.t < stats.duration);
    if (e.kind === 'lead') { assert.ok(notes.includes(e.midi)); assert.ok(Math.abs(e.pan) <= 0.8); }
    if (e.kind === 'drum') assert.ok(e.midi >= 36 && e.midi <= 48 && e.vel > 0 && e.vel <= 1);
  }
  for (let i = 1; i < whole.length; i++) assert.ok(whole[i].t >= whole[i - 1].t, 'sorted by time');
  const leads = whole.filter((e) => e.kind === 'lead');
  assert.ok(leads[leads.length - 1].midi > leads[0].midi, 'the demo level rises, so the lead ends higher than it starts');
  console.log('   score of the 24 s demo: ' + kinds.lead + ' lead notes, ' + kinds.ref + ' reference blips, ' + kinds.drum + ' drum hits; lead from ' +
    core.midiToName(leads[0].midi) + ' to ' + core.midiToName(leads[leads.length - 1].midi));
});

test('pad targets stay inside their ranges', () => {
  for (const f of demo.frames) {
    const p = core.padTargets(f, map, stats);
    assert.ok(p.gain >= map.padMinGain - 1e-12 && p.gain <= map.padMaxGain + 1e-12);
    assert.ok(p.cutoff >= map.padMinHz - 1e-9 && p.cutoff <= map.padMaxHz + 1e-9);
  }
});

test('clip clock behaves like a media element', () => {
  let wall = 100;
  const c = core.makeClipClock(10, () => wall);
  assert.equal(c.paused, true); assert.equal(c.currentTime, 0);
  c.play(); wall += 2; near(c.currentTime, 2); assert.equal(c.paused, false);
  c.playbackRate = 2; near(c.currentTime, 2); wall += 1; near(c.currentTime, 4);     // no jump when the rate changes
  c.pause(); wall += 5; near(c.currentTime, 4); assert.equal(c.paused, true);
  c.currentTime = 9; c.play(); wall += 1; assert.equal(c.currentTime, 10); assert.equal(c.ended, true);   // rate 2: runs into the end
  c.play(); assert.equal(c.ended, false); near(c.currentTime, 0);                    // play after the end restarts
  c.loop = true; wall += 6; near(c.currentTime, 2);                                  // 12 s of media time wraps to 2
  assert.equal(c.ended, false);
  assert.equal(core.sequenceFrameUrl('frames/f_{0000}.jpg', 7), 'frames/f_0007.jpg');
  assert.equal(core.sequenceIndexAt(0.3, 10, 50), 3); assert.equal(core.sequenceIndexAt(99, 10, 50), 49);
});

test('pixels: brightness, colour-map inversion, probe', () => {
  near(core.luma(255, 255, 255), 1); assert.equal(core.luma(0, 0, 0), 0);          // white is 0.9999999999999999 in floating point
  const stops = core.DEMO_RAMP;
  assert.equal(stops.length, 64); assert.deepEqual(stops[0], [8, 16, 80]); assert.deepEqual(stops[63], [250, 250, 220]);
  for (let i = 1; i < stops.length; i++) assert.ok(core.luma(...stops[i]) > core.luma(...stops[i - 1]), 'ramp brightness rises');
  for (const u of [0, 0.2, 0.5, 0.77, 1]) {
    const back = core.invertColormap(...core.rampColor(u, stops), stops);
    assert.ok(Math.abs(back.u - u) <= 1 / 63 && back.dist === 0, 'round trip of ' + u + ' gave ' + back.u);
  }
  assert.ok(core.invertColormap(...core.DEMO_LAND, stops).dist > 40, 'the land colour is far from every legend colour');
  // a 2 x 1 image: left pixel = lowest legend colour, right pixel = land
  const data = Uint8ClampedArray.from([...stops[0], 255, ...core.DEMO_LAND, 255]);
  assert.deepEqual(core.readPixel(data, 2, 0, 0, stops, 40), { u: 0, noData: false });
  assert.equal(core.readPixel(data, 2, 1, 0, stops, 40).noData, true);
  near(core.readPixel(data, 2, 0, 0, null, 40).u, core.luma(8, 16, 80));
  assert.deepEqual(core.sampleLegend(data, 2, 1, 0, 0, 1, 0, 2), [stops[0], core.DEMO_LAND]);
  assert.deepEqual(core.moveProbe({ x: 5, y: 5 }, 'ArrowLeft', false, 100, 50, 8), { x: 0, y: 5 });
  assert.deepEqual(core.moveProbe({ x: 5, y: 5 }, 'ArrowDown', true, 100, 50, 8), { x: 5, y: 37 });
  assert.deepEqual(core.moveProbe({ x: 5, y: 5 }, 'End', false, 100, 50, 8), { x: 99, y: 5 });
  assert.equal(core.moveProbe({ x: 5, y: 5 }, 'a', false, 100, 50, 8), null);
  assert.equal(core.moveProbe({ x: 5, y: 5 }, 'constructor', false, 100, 50, 8), null);
  assert.equal(core.describeReading(99, 0, 100, 50, { u: 0.5, noData: false }, [0, 30], 'degrees C', 69), '100% across, 0% down: value 15 degrees C, note A4');
  assert.equal(core.describeReading(0, 49, 100, 50, { u: 0, noData: true }, [0, 1], '', 60), '0% across, 100% down: no data here');
  assert.equal(core.demoField(0.62, 0.25), null); assert.ok(core.demoField(0.3, 0.6) > core.demoField(0.05, 0.95));
});

test('frame features and flash detection on a tiny synthetic frame', () => {
  // 4 x 2 pixels: black except a white pixel at x = 3, y = 0
  const rgba = new Uint8ClampedArray(4 * 8); rgba.set([255, 255, 255, 255], 4 * 3);
  const dark = core.frameFeatures(new Uint8ClampedArray(4 * 8), 4, 2, null, 1, 2);
  assert.deepEqual([dark.mean, dark.motion, dark.cx], [0, 0, 0.5]);
  const f = core.frameFeatures(rgba, 4, 2, dark.luma, 1, 2);
  near(f.mean, 1 / 8); near(f.motion, 1 / 8); near(f.cx, 0.875); near(f.cy, 0.25); near(f.warmth, 0.5);
  assert.equal(f.grid[0], 0); near(f.grid[1], 0.25);                    // right half holds 1 white pixel out of 4
  assert.deepEqual(core.detectEvents(f.luma, dark.luma, 4, 2, 1, 2, 0.25, 3), [{ x: 0.875, y: 0.25, strength: 1 }]);
  assert.deepEqual(core.detectEvents(f.luma, null, 4, 2, 1, 2, 0.25, 3), []);
  const red = new Uint8ClampedArray(4 * 8); for (let i = 0; i < 8; i++) red[4 * i] = 255;
  assert.equal(core.frameFeatures(red, 4, 2, null, 1, 2).warmth, 1);
  const tl = core.buildTimeline('clip.webm', [
    { t: 0, mean: 0, grid: [0, 0], motion: 0, events: [] },
    { t: 0.5, mean: core.round(f.mean), grid: f.grid, motion: core.round(f.motion), events: [{ x: 0.875, y: 0.25, strength: 1 }] },
  ], 1, 2, 'browser brightness');
  assert.deepEqual(core.validateTimeline(tl), []); assert.equal(tl.meta.fps, 2);
});

test('WAV encoder writes a valid 16-bit PCM file', () => {
  const left = Float32Array.from([0, 1, -1, 2, NaN, 0.5]), right = Float32Array.from([0, 0, 0, 0, 0, -0.5]);
  const buf = core.encodeWav([left, right], 44100), v = new DataView(buf), tag = (o) => String.fromCharCode(...new Uint8Array(buf, o, 4));
  assert.equal(buf.byteLength, 44 + 6 * 2 * 2);
  assert.deepEqual([tag(0), tag(8), tag(12), tag(36)], ['RIFF', 'WAVE', 'fmt ', 'data']);
  assert.deepEqual([v.getUint32(4, true), v.getUint32(16, true), v.getUint16(20, true), v.getUint16(22, true)], [36 + 24, 16, 1, 2]);
  assert.deepEqual([v.getUint32(24, true), v.getUint32(28, true), v.getUint16(32, true), v.getUint16(34, true), v.getUint32(40, true)], [44100, 176400, 4, 16, 24]);
  const samples = []; for (let o = 44; o < buf.byteLength; o += 2) samples.push(v.getInt16(o, true));
  assert.deepEqual(samples, [0, 0, 32767, 0, -32768, 0, 32767, 0, 0, 0, 16384, -16384]);   // clipped, NaN silenced, interleaved L R
  near(core.peakDb([Float32Array.from([0.5, -0.25])]), -6.0206, 1e-4);
  assert.equal(core.extensionForMime('audio/webm;codecs=opus'), 'webm'); assert.equal(core.extensionForMime('audio/mp4'), 'm4a');
  // half a second of a 440 Hz stereo tone, written to disk so another program can check it
  const n = 22050, tone = new Float32Array(n);
  for (let i = 0; i < n; i++) tone[i] = 0.5 * Math.sin(2 * Math.PI * 440 * i / 44100);
  const out = path.join(__dirname, 'test-tone.wav');
  fs.writeFileSync(out, Buffer.from(core.encodeWav([tone, tone], 44100)));
  assert.equal(fs.statSync(out).size, 44 + n * 4);
});

console.log('all ' + count + ' tests passed (node ' + process.version + ')');
```

**How to run it.** `node sonify-core.test.js` in the folder. It needs no packages. The output is in "What was checked, and how" above (17 tests). The last test writes `test-tone.wav`; another program then opened it:

```text
python -I: wave.open("test-tone.wav") -> channels=2 sampwidth=2 bytes framerate=44100 nframes=22050 comptype=NONE
first 4 frames as (left, right) 16-bit integers: (0, 0, 1026, 1026, 2049, 2049, 3063, 3063)
```

**What you should hear.** Nothing: this file makes no sound. `test-tone.wav` is half a second of a 440 Hz tone if you play it.

**How to adapt it.**

- Change the musical character in `DEFAULT_MAPPING`: `scale` (any key of `SCALES`), `rootMidi`, `leadOctaves` (more octaves = finer value steps but a wider, less singable range), `stepSeconds` (0.25 = four notes per second of video at most), `minPulses` and `maxPulses`.
- Fix the value range instead of fitting it to each clip: set `leadRange: [0.2, 0.9]`. With `'auto'` every clip uses its full pitch range (more musical, and the legend text states the real minimum and maximum); with a fixed range the same pitch means the same value in every clip (more faithful when comparing clips). Decide this per project and say which one you chose.
- Follow one region instead of the whole picture: in `scoreWindow`, replace `s.mean` by one grid cell, for example `s.grid[row * cols + col]`, or by the mean of a few cells.
- Add a scale: add a line to `SCALES` with semitone offsets from the root, for example `lydian: [0, 2, 4, 6, 7, 9, 11]`.

**Accessibility notes.** `describeMapping` and `describeReading` are here on purpose: the words a screen-reader user hears are generated from the same numbers that drive the sound, so the text cannot drift away from the audio. Keep them in step when you change the mapping.

STATUS: syntax-checked with node --check and pure functions unit-tested in Node 24 on 2026-11-14; not yet run in a browser

## The shared audio layer: `jukebox-engine.js`

This is not a recipe of its own; J1, J3, J4 and J5 load it. It contains everything that touches Tone.js or the page:

- `createEngine(Tone, core, map)`: builds the instruments and the output chain in the current audio context and returns `start`, `setMaster`, `setPad` and `play(event, time, rate)`.
- `createPlayer(Tone, core, engine, toggles)`: the 25 ms loop that slaves the engine to a media clock.
- `renderOffline(Tone, core, timeline, map, toggles)`: the same score rendered with `Tone.Offline`.
- `openVisual(core, video, canvas, spec, timeline)`: picks the picture source (video URL, image sequence, or the demo animation) and returns `{ clock, draw }`.
- `createTransport(Tone, core, map, say)`: wires the standard controls, starts audio on the first Play, runs the picture loop.
- `drawDemoFrame`, `saveBlob`: small helpers.

The sound design, in words:

| Voice | Made of | Driven by | Why |
|---|---|---|---|
| Pad | Two sawtooth oscillators a fifth apart (C3 and G3) into a low-pass filter and a gain | `mean`: gain 0.04 to 0.22 and cutoff 250 to 2500 Hz, gliding with a 0.6 s time constant | A slow, continuous sound for the slow trend. Its fixed pitch also anchors the key. |
| Lead | Triangle-wave synth with a short envelope, through a panner | `mean` picks the note (11 pentatonic notes), `motion` picks how many notes per bar, the grid's centre of brightness picks the pan | Discrete, clearly pitched notes are easy to compare; the pentatonic scale keeps any sequence pleasant. |
| Reference blip | Sine synth, 60 ms | Fixed note for the middle of the range, at the start of every bar (every 4 s of video) | A constant pitch to compare the lead against, and a time marker. |
| Drums | Three membrane (kick-like) synths, each with its own panner | One hit per timeline event: x to pan, y to drum pitch (north is higher), strength to loudness | Percussion reads as "something happened here", separate from the pitched layers. |

Output chain: all voices go to a master gain (0.5 by default, set by the volume slider squared) and then to `Tone.Limiter(-3)`. In Tone.js 15.1.22 the limiter is a compressor with ratio 20, 3 ms attack and 10 ms release; it does not override the compressor's 30 dB knee, so treat it as a safety net that softens loud peaks, not as a hard ceiling. The real protection is the conservative levels of the voices.

How the sync works (the part worth understanding):

1. Every 25 ms `player.tick()` reads the picture clock: `t = clock.currentTime` and `rate = clock.playbackRate`, and the audio clock: `now = Tone.immediate()`.
2. `planWindow` returns the slice of media time `(from, to]` that has not been scheduled yet, up to 0.12 s of real time ahead of the playhead. In steady playback the slices join up exactly. If `t` moved backwards (seek, loop) or jumped past everything scheduled (seek forward, a stalled timer), the slice restarts 0.06 s behind the playhead.
3. `scoreWindow` lists the notes in that slice. Each one is scheduled at audio time `now + (event.t - t) / rate`. Example: playhead at t = 10.00 s, rate 2, a note at media time 10.20 s is 0.20 media seconds ahead, which is 0.10 real seconds, so it is scheduled at `now + 0.10`.
4. The pad is set from `sampleTimeline(timeline, t)` with `setTargetAtTime`, which glides instead of jumping.
5. If the clock is paused, ended or buffering (`readyState < 3`), the pad fades out in about 0.15 s and the plan is reset.

Because the loop only reads the clock's state and never listens for play, pause or seek events, it behaves the same for buttons, keyboard, scripts, looping and buffering. Timing cannot drift, because every tick re-reads both clocks.

**File `jukebox-engine.js`**

```js
/* jukebox-engine.js - the thin Tone.js / DOM layer shared by recipes J1, J3, J4 and J5.
 * Every musical decision lives in sonify-core.js; this file only builds the audio graph and plays what it is told.
 * Browser: load Tone.js 15.1.22 and sonify-core.js first, then this file; it defines the global JukeboxEngine.
 * Tone and core are passed in as arguments, so the functions can be exercised in Node with a fake Tone.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.JukeboxEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PAD_TAU = 0.6;   // seconds. The pad glides to each new target with this time constant (about 95 % there after 3 * PAD_TAU).
  const AHEAD = 0.12;    // seconds of real time that notes are scheduled ahead of the playhead

  // Builds the instruments in the CURRENT Tone context: the live one, or the offline one inside Tone.Offline.
  // Signal path: pad, lead, reference blip, drums -> master gain -> limiter -> speakers.
  function createEngine(Tone, core, map) {
    const limiter = new Tone.Limiter({ threshold: -3 }).toDestination();
    const master = new Tone.Gain({ gain: 0.5 }).connect(limiter);

    // pad: two sawtooth oscillators a fifth apart -> low-pass filter (brightness) -> gain (loudness)
    const padGain = new Tone.Gain({ gain: 0 }).connect(master);
    const padFilter = new Tone.Filter({ frequency: map.padMinHz, type: 'lowpass' }).connect(padGain);
    const padOscs = [0, 7].map((semitones) =>
      new Tone.Oscillator({ frequency: core.midiToFreq(map.rootMidi + semitones), type: 'sawtooth' }).connect(padFilter));

    const leadPan = new Tone.Panner({ pan: 0 }).connect(master);
    const lead = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.25, release: 0.25 },
    }).connect(leadPan);
    lead.volume.value = -6;

    const ref = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.06, sustain: 0, release: 0.05 },
    }).connect(master);
    ref.volume.value = -14;

    // three drum voices, each with its own panner, so simultaneous events can sit at different places
    const drums = [0, 1, 2].map(() => {
      const pan = new Tone.Panner({ pan: 0 }).connect(master);
      const synth = new Tone.MembraneSynth().connect(pan);
      synth.volume.value = -8;
      return { synth, pan, last: -1 };
    });
    const leadVoice = { last: -1 }, refVoice = { last: -1 };
    let nextDrum = 0;
    // Tone asserts that the start times of one voice strictly increase: never hand a voice the same time twice.
    const after = (voice, time) => (voice.last = Math.max(time, voice.last + 0.005));

    return {
      limiter,
      start(time) { padOscs.forEach((o) => o.start(time)); },
      setMaster(gain, time) { master.gain.setTargetAtTime(gain, time, 0.03); },
      setPad(targets, time, tau = PAD_TAU) {
        padGain.gain.setTargetAtTime(targets.gain, time, tau);
        if (targets.cutoff !== undefined) padFilter.frequency.setTargetAtTime(targets.cutoff, time, tau);
      },
      // ev: one item from SonifyCore.scoreWindow. time: audio-clock seconds. rate: playbackRate (shortens the notes).
      play(ev, time, rate = 1) {
        const hz = core.midiToFreq(ev.midi);
        if (ev.kind === 'lead') {
          const t = after(leadVoice, time);
          leadPan.pan.setValueAtTime(ev.pan, t);
          lead.triggerAttackRelease(hz, Math.max(0.03, ev.dur / rate), t, ev.vel);
        } else if (ev.kind === 'ref') {
          ref.triggerAttackRelease(hz, 0.06, after(refVoice, time), 0.9);
        } else if (ev.kind === 'drum') {
          const d = drums[nextDrum++ % drums.length], t = after(d, time);
          d.pan.pan.setValueAtTime(ev.pan, t);
          d.synth.triggerAttackRelease(hz, 0.1, t, ev.vel);
        }
      },
    };
  }

  // Slaves the engine to a media clock: a <video> element, or SonifyCore.makeClipClock for image sequences and the demo.
  // The clock is polled every 25 ms. Nothing here listens to play / pause / seek events, so every way of moving
  // the playhead (buttons, keyboard, scripts, looping, buffering) goes through the same few lines.
  // toggles: { pad, lead, ref, drum } booleans, read on every tick (flip them from checkboxes).
  function createPlayer(Tone, core, engine, toggles) {
    let clock = null, tl = null, stats = null, map = null, plan = core.NEW_PLAN, wasPlaying = false, timer = null;
    const player = {
      offset: 0,   // seconds; positive = sound earlier. Calibration knob for slow outputs such as Bluetooth headphones.
      setSource(newClock, timeline, mapping) {
        clock = newClock; tl = timeline; map = mapping; stats = core.timelineStats(tl); plan = core.NEW_PLAN;
      },
      tick() {
        if (!clock || !tl) return;
        const now = Tone.immediate();                       // audio clock, seconds
        const playing = !clock.paused && !clock.ended && clock.readyState >= 3;
        if (!playing) {
          if (wasPlaying) engine.setPad({ gain: 0 }, now, 0.05);   // the drone stops with the picture
          wasPlaying = false; plan = core.NEW_PLAN;
          return;
        }
        wasPlaying = true;
        const rate = Math.max(0.1, clock.playbackRate || 1);
        const t = clock.currentTime + player.offset * rate; // media clock, seconds
        const win = core.planWindow(plan, t, rate, AHEAD);
        plan = win.state;
        for (const ev of core.scoreWindow(tl, map, stats, win.from, win.to)) {
          // media time -> audio time: an event (ev.t - t) media seconds ahead is (ev.t - t) / rate real seconds ahead
          if (toggles[ev.kind]) engine.play(ev, now + Math.max(0, (ev.t - t) / rate), rate);
        }
        engine.setPad(toggles.pad ? core.padTargets(core.sampleTimeline(tl, t), map, stats) : { gain: 0 }, now);
      },
      start() { if (timer === null) timer = setInterval(player.tick, 25); },
      stop() { clearInterval(timer); timer = null; },
    };
    return player;
  }

  // Renders a whole timeline to audio, faster than real time. Same score and same engine as the live player.
  // Resolves with a ToneAudioBuffer: use numberOfChannels, getChannelData(c), sampleRate and duration.
  function renderOffline(Tone, core, tl, map, toggles, sampleRate = 44100, tail = 1.5) {
    const stats = core.timelineStats(tl);
    return Tone.Offline(() => {
      const engine = createEngine(Tone, core, map);   // only nodes created inside this callback are rendered
      engine.start(0);
      for (const f of tl.frames) engine.setPad(toggles.pad ? core.padTargets(f, map, stats) : { gain: 0 }, f.t);
      engine.setPad({ gain: 0 }, stats.duration, 0.3);
      for (const ev of core.scoreWindow(tl, map, stats, -1e-3, stats.duration)) {
        if (toggles[ev.kind]) engine.play(ev, ev.t, 1);
      }
    }, stats.duration + tail, 2, sampleRate);
  }

  // ---------- DOM helpers ----------
  // Draws the built-in demo picture for media time t: the timeline grid as coloured cells, events as fading white discs.
  function drawDemoFrame(core, g, w, h, tl, t) {
    const [rows, cols] = tl.meta.grid, s = core.sampleTimeline(tl, t), cw = w / cols, ch = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        g.fillStyle = 'rgb(' + core.rampColor(s.grid[r * cols + c], core.DEMO_RAMP).join(',') + ')';
        g.fillRect(c * cw, r * ch, cw + 1, ch + 1);
      }
    }
    for (const e of core.eventsBetween(tl.frames, t - 0.4, t)) {
      g.fillStyle = 'rgba(255,255,255,' + (1 - (t - e.t) / 0.4).toFixed(2) + ')';
      g.beginPath(); g.arc(e.x * w, e.y * h, 0.06 * h, 0, 2 * Math.PI); g.fill();
    }
  }

  // Picture source for one track. Returns { clock, draw(t) }; call draw from requestAnimationFrame.
  //   spec.video  : URL of a video file. It may be cross-origin (for example svs.gsfc.nasa.gov) because
  //                 this code only shows it and never reads its pixels.
  //   spec.frames : { pattern: 'frames/f_{0000}.jpg', count, fps, first } for an image sequence.
  //   neither     : the built-in demo animation drawn from the timeline grid.
  function openVisual(core, video, canvas, spec, tl) {
    const g = canvas.getContext('2d'), nowSeconds = () => performance.now() / 1000;
    video.pause(); video.removeAttribute('src'); video.load();   // let go of the previous clip
    video.hidden = !spec.video; canvas.hidden = !!spec.video;
    if (spec.video) {
      video.muted = true;                                         // some SVS clips carry narration: the sonification replaces it
      video.src = spec.video;
      return { clock: video, draw() {} };
    }
    if (spec.frames) {
      const f = spec.frames, cache = new Map();   // ponytail: keeps every decoded frame; fine up to a few hundred small frames
      const get = (i) => {
        if (!cache.has(i)) { const im = new Image(); im.src = core.sequenceFrameUrl(f.pattern, (f.first || 0) + i); cache.set(i, im); }
        return cache.get(i);
      };
      return {
        clock: core.makeClipClock(f.count / f.fps, nowSeconds),
        draw(t) {
          const i = core.sequenceIndexAt(t, f.fps, f.count), im = get(i);
          if (i + 1 < f.count) get(i + 1);                        // warm the next frame
          if (im.complete && im.naturalWidth) g.drawImage(im, 0, 0, canvas.width, canvas.height);
        },
      };
    }
    return {
      clock: core.makeClipClock(core.timelineStats(tl).duration, nowSeconds),
      draw(t) { drawDemoFrame(core, g, canvas.width, canvas.height, tl, t); },
    };
  }

  // Hands a Blob to the user as a download.
  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  // Wires the standard controls to a clock, creates the audio engine on the first Play, and redraws the picture
  // once per display frame. Expects elements with the ids play, seek, rate, loop, vol, offset and checkboxes
  // carrying data-layer="pad|lead|ref|drum". say(text) receives short status messages for an aria-live region.
  function createTransport(Tone, core, map, say) {
    const $ = (id) => document.getElementById(id);
    const toggles = { pad: true, lead: true, ref: true, drum: true };
    let cur = null, engine = null, player = null, audioReady = null, dragging = false, wasPaused = true, lastUi = 0;
    const volumeGain = () => Math.pow(+$('vol').value / 100, 2);   // squared, so the slider feels even to the ear

    async function startAudio() {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';   // iOS 17+: stay audible with the ring switch on silent
      await Tone.start();                                                     // resumes the AudioContext
      engine = createEngine(Tone, core, map);
      engine.start(Tone.immediate());
      engine.setMaster(volumeGain(), Tone.immediate());
      player = createPlayer(Tone, core, engine, toggles);
      player.offset = +$('offset').value / 1000;
      if (cur) player.setSource(cur.clock, cur.tl, cur.map);
      player.start();
      return engine;
    }
    // Audio is created on the first click or key press, never before: browsers block sound without a user gesture.
    const ensureAudio = () => (audioReady = audioReady || startAudio());

    $('play').addEventListener('click', () => {
      if (!cur) return;
      const c = cur.clock, media = c.paused || c.ended ? c.play() : c.pause();   // both calls run inside the user gesture
      Promise.all([ensureAudio(), media]).catch((err) => say('Playback failed: ' + err.message));
    });
    // The controls only change the clock; the player follows the clock.
    $('seek').addEventListener('pointerdown', () => { dragging = true; });
    addEventListener('pointerup', () => { dragging = false; });
    $('seek').addEventListener('input', () => { if (cur) cur.clock.currentTime = +$('seek').value; });
    $('rate').addEventListener('change', () => { if (cur) cur.clock.playbackRate = +$('rate').value; });
    $('loop').addEventListener('change', () => { if (cur) cur.clock.loop = $('loop').checked; });
    $('vol').addEventListener('input', () => { if (engine) engine.setMaster(volumeGain(), Tone.immediate()); });
    $('offset').addEventListener('change', () => { if (player) player.offset = +$('offset').value / 1000; });
    for (const box of document.querySelectorAll('[data-layer]')) {
      box.addEventListener('change', () => { toggles[box.dataset.layer] = box.checked; });
    }

    // Picture and control read-outs, once per display frame. The sound does not depend on this loop.
    function frame(ms) {
      requestAnimationFrame(frame);
      if (!cur) return;
      const c = cur.clock, t = c.currentTime, paused = c.paused || c.ended;
      const total = Number.isFinite(c.duration) ? c.duration : cur.stats.duration;
      cur.draw(t);
      if (paused !== wasPaused) {
        wasPaused = paused;
        $('play').textContent = paused ? 'Play' : 'Pause';
        say(paused ? 'Paused at ' + Math.round(t) + ' seconds.' : 'Playing.');
      }
      if (!dragging && ms - lastUi > 500) {
        lastUi = ms;
        $('seek').max = total.toFixed(1); $('seek').value = t.toFixed(1);
        $('seek').setAttribute('aria-valuetext', Math.round(t) + ' of ' + Math.round(total) + ' seconds');
      }
    }
    requestAnimationFrame(frame);

    return {
      ensureAudio,
      // visual: { clock, draw } from openVisual. Call again to switch to another track.
      load(visual, tl, trackMap) {
        if (cur) cur.clock.pause();
        cur = { clock: visual.clock, draw: visual.draw, tl, map: trackMap, stats: core.timelineStats(tl) };
        cur.clock.loop = $('loop').checked; cur.clock.playbackRate = +$('rate').value;
        wasPaused = true; $('play').textContent = 'Play'; lastUi = 0;
        if (player) player.setSource(cur.clock, tl, trackMap);
      },
    };
  }

  return { PAD_TAU, AHEAD, createEngine, createPlayer, renderOffline, drawDemoFrame, openVisual, saveBlob, createTransport };
});
```

**File `jukebox-engine.test.js`**

```js
// jukebox-engine.test.js - run with:  node jukebox-engine.test.js
// Drives the real engine, player and offline renderer against a fake Tone that records every call and
// applies the same argument checks Tone.js 15.1.22 applies (finite numbers, pan range, strictly increasing start times).
'use strict';
const assert = require('node:assert/strict');
const core = require('./sonify-core.js');
const { createEngine, createPlayer, renderOffline, AHEAD } = require('./jukebox-engine.js');

let count = 0;
const test = async (name, fn) => { await fn(); count++; console.log('ok ' + count + ' - ' + name); };
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, a + ' is not within ' + eps + ' of ' + b);

function makeFakeTone() {
  const log = [], made = {};
  const finite = (...xs) => xs.forEach((x) => assert.ok(typeof x === 'number' && Number.isFinite(x), 'not a finite number: ' + x));
  class Param {
    constructor(owner, min, max) { this.owner = owner; this.min = min; this.max = max; this.value = 0; }
    check(v, t) { finite(v, t); assert.ok(v >= this.min && v <= this.max, this.owner + ' value out of range: ' + v); }
    setTargetAtTime(v, t, tau) { this.check(v, t); assert.ok(tau > 0, 'timeConstant must be > 0'); log.push({ node: this.owner, call: 'target', v, t }); return this; }
    setValueAtTime(v, t) { this.check(v, t); log.push({ node: this.owner, call: 'set', v, t }); return this; }
  }
  class Node {
    constructor(kind) { made[kind] = (made[kind] || 0) + 1; this.id = kind + '#' + (made[kind] - 1); }
    connect() { return this; }
    toDestination() { return this; }
  }
  class Limiter extends Node { constructor(o) { super('Limiter'); finite(o.threshold); } }
  class Gain extends Node { constructor(o) { super('Gain'); this.gain = new Param(this.id + '.gain', 0, 4); this.gain.value = o.gain; } }
  class Filter extends Node { constructor(o) { super('Filter'); assert.equal(o.type, 'lowpass'); this.frequency = new Param(this.id + '.frequency', 0, 22050); } }
  class Panner extends Node { constructor() { super('Panner'); this.pan = new Param(this.id + '.pan', -1, 1); } }
  class Oscillator extends Node {
    constructor(o) { super('Oscillator'); finite(o.frequency); }
    start(t) { finite(t); log.push({ node: this.id, call: 'start', t }); return this; }
  }
  class Synth extends Node {
    constructor(options, kind = 'Synth') { super(kind); this.volume = new Param(this.id + '.volume', -100, 6); this.last = -Infinity; }
    triggerAttackRelease(hz, dur, t, vel) {
      finite(hz, dur, t, vel);
      assert.ok(hz > 20 && hz < 5000 && dur > 0 && vel > 0 && vel <= 1, 'bad note: ' + [hz, dur, vel]);
      assert.ok(t > this.last, this.id + ': start time must be strictly greater than previous start time');
      this.last = t; log.push({ node: this.id, call: 'note', hz, dur, t, vel });
      return this;
    }
  }
  class MembraneSynth extends Synth { constructor(options) { super(options, 'MembraneSynth'); } }
  const Tone = {
    Limiter, Gain, Filter, Panner, Oscillator, Synth, MembraneSynth, log, now: 0,
    immediate: () => Tone.now,
    Offline(callback, duration, channels, sampleRate) { callback({}); return Promise.resolve({ duration, numberOfChannels: channels, sampleRate }); },
  };
  return Tone;
}

const tl = core.makeDemoTimeline(), stats = core.timelineStats(tl), map = core.DEFAULT_MAPPING;
const allOn = () => ({ pad: true, lead: true, ref: true, drum: true });
const notesOf = (Tone, id) => Tone.log.filter((e) => e.call === 'note' && e.node.startsWith(id));

(async () => {
  await test('live player: every scored note is scheduled once, at the right audio time', () => {
    const Tone = makeFakeTone(), engine = createEngine(Tone, core, map), player = createPlayer(Tone, core, engine, allOn());
    let wall = 50;                                           // the picture clock and the audio clock start at different values
    const clock = core.makeClipClock(stats.duration, () => wall);
    player.setSource(clock, tl, map); clock.play();
    for (let i = 0; i <= 400; i++) { Tone.now = 1000 + i * 0.025; wall = 50 + i * 0.025; player.tick(); }   // 10 s in 25 ms ticks
    const expected = core.scoreWindow(tl, map, stats, -1e-3, 10 + AHEAD);
    const lead = notesOf(Tone, 'Synth#0'), ref = notesOf(Tone, 'Synth#1'), drums = notesOf(Tone, 'MembraneSynth');
    assert.equal(lead.length, expected.filter((e) => e.kind === 'lead').length);
    assert.equal(ref.length, expected.filter((e) => e.kind === 'ref').length);
    assert.equal(drums.length, expected.filter((e) => e.kind === 'drum').length);
    expected.filter((e) => e.kind === 'lead').forEach((e, i) => {
      near(lead[i].t, 1000 + e.t);                           // media time e.t plays at audio time 1000 + e.t
      near(lead[i].hz, core.midiToFreq(e.midi));
    });
    assert.ok(Tone.log.some((e) => e.node === 'Gain#1.gain' && e.call === 'target' && e.v > 0), 'pad gain follows the level');
    console.log('   10 s of the demo: ' + lead.length + ' lead notes, ' + ref.length + ' reference blips, ' + drums.length + ' drum hits scheduled');
  });

  await test('live player: pause fades the pad, seek and loop re-anchor without replaying', () => {
    const Tone = makeFakeTone(), engine = createEngine(Tone, core, map), player = createPlayer(Tone, core, engine, allOn());
    let wall = 0;
    const clock = core.makeClipClock(stats.duration, () => wall);
    clock.loop = true; player.setSource(clock, tl, map); clock.play();
    const run = (seconds) => { for (let i = 0; i < seconds / 0.025; i++) { wall += 0.025; Tone.now += 0.025; player.tick(); } };
    run(2);
    clock.pause(); const before = Tone.log.length; run(1);
    const quiet = Tone.log.slice(before);
    assert.deepEqual(quiet.map((e) => [e.node, e.call, e.v]), [['Gain#1.gain', 'target', 0]]);   // one fade-out, then silence
    clock.currentTime = 20; clock.play(); run(1);            // seek forward: nothing between 2 s and 20 s is played
    assert.equal(notesOf(Tone, 'Synth#0').filter((e) => e.t < Tone.now - 1.2).length, core.scoreWindow(tl, map, stats, -1e-3, 2 + AHEAD).filter((e) => e.kind === 'lead').length);
    run(4.5);                                                // runs through the end of the 24 s clip and wraps to the start
    assert.ok(clock.currentTime < 2, 'looped, now at ' + clock.currentTime);
    const all = notesOf(Tone, 'Synth#0');
    for (let i = 1; i < all.length; i++) assert.ok(all[i].t > all[i - 1].t);
  });

  await test('live player: playbackRate 2 halves the spacing and length of notes; toggles mute layers', () => {
    const Tone = makeFakeTone(), engine = createEngine(Tone, core, map), toggles = allOn();
    const player = createPlayer(Tone, core, engine, toggles);
    let wall = 0;
    const clock = core.makeClipClock(stats.duration, () => wall);
    clock.playbackRate = 2; toggles.drum = false; toggles.pad = false;
    player.setSource(clock, tl, map); clock.play();
    for (let i = 0; i <= 200; i++) { Tone.now = i * 0.025; wall = i * 0.025; player.tick(); }                 // 5 s real = 10 s of media
    const expected = core.scoreWindow(tl, map, stats, -1e-3, 10 + 2 * AHEAD).filter((e) => e.kind === 'lead');
    const lead = notesOf(Tone, 'Synth#0');
    assert.equal(lead.length, expected.length);
    expected.forEach((e, i) => { near(lead[i].t, e.t / 2); near(lead[i].dur, e.dur / 2); });
    assert.equal(notesOf(Tone, 'MembraneSynth').length, 0);
    assert.ok(Tone.log.filter((e) => e.node === 'Gain#1.gain').every((e) => e.v === 0), 'pad stays silent when switched off');
  });

  await test('live player: offset shifts the sound earlier', () => {
    const Tone = makeFakeTone(), engine = createEngine(Tone, core, map), player = createPlayer(Tone, core, engine, allOn());
    let wall = 0;
    const clock = core.makeClipClock(stats.duration, () => wall);
    player.offset = 0.1; player.setSource(clock, tl, map); clock.currentTime = 1; clock.play();
    for (let i = 0; i <= 80; i++) { Tone.now = i * 0.025; wall = i * 0.025; player.tick(); }
    const first = notesOf(Tone, 'Synth#0').find((e) => e.t > 0.2);
    const k = Math.round((first.t + 1 + 0.1) / map.stepSeconds);
    near(first.t, k * map.stepSeconds - 1 - 0.1);            // a grid note at media time k * 0.25 sounds 0.1 s early
  });

  await test('offline render schedules the whole score in media time', async () => {
    const Tone = makeFakeTone();
    const buf = await renderOffline(Tone, core, tl, map, allOn());
    assert.deepEqual(buf, { duration: stats.duration + 1.5, numberOfChannels: 2, sampleRate: 44100 });
    const expected = core.scoreWindow(tl, map, stats, -1e-3, stats.duration);
    const lead = notesOf(Tone, 'Synth#0');
    assert.equal(lead.length, expected.filter((e) => e.kind === 'lead').length);
    expected.filter((e) => e.kind === 'lead').forEach((e, i) => near(lead[i].t, e.t));
    assert.equal(notesOf(Tone, 'MembraneSynth').length, stats.events);
    assert.equal(Tone.log.filter((e) => e.call === 'start').length, 2);                    // the two pad oscillators
    assert.equal(Tone.log.filter((e) => e.node === 'Gain#1.gain').length, tl.frames.length + 1);   // one target per frame + the final fade
    const drumTimes = notesOf(Tone, 'MembraneSynth#0').map((e) => e.t);
    assert.ok(drumTimes.length === 5 && drumTimes.every((t, i) => i === 0 || t > drumTimes[i - 1]));
  });

  console.log('all ' + count + ' tests passed (node ' + process.version + ')');
})().catch((err) => { console.error(err); process.exit(1); });
```

Run it with `node jukebox-engine.test.js` (5 tests, output above). The fake Tone in that file is also a compact list of every Tone.js call the engine makes.

## J1. Timeline player: `j1-player.html`

**Goal.** Play a timeline JSON in sync with a picture on the same page: a `<video>`, an image sequence, or (with no parameters) a generated demo animation.

**What it demonstrates.**

- A pad that follows the slow trend, a scale-quantized lead on the key variable (`mean`) with an optional reference tone, percussion on events, pan from x.
- Correct behaviour for play, pause, seek, speed (0.5x, 1x, 2x) and loop, by slaving sound to the clock instead of reacting to events.
- A fallback when the video cannot be loaded or decoded: the timeline's own grid is drawn as a coarse picture and the sound continues.
- The mapping explained in words before any sound, generated from the timeline's own numbers.

**File `j1-player.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>J1 Timeline player - Earth Information Jukebox recipe</title>
<style>
  body { font: 1rem/1.5 system-ui, sans-serif; max-width: 52rem; margin: 1rem auto; padding: 0 1rem; color: #111; background: #fff; }
  video, canvas { display: block; width: 100%; max-width: 640px; height: auto; background: #000; }
  [hidden] { display: none !important; }
  button, select, input { font: inherit; }
  button { padding: 0.5rem 0.9rem; }
  :focus-visible { outline: 3px solid #1a5fb4; outline-offset: 3px; }
  .row { display: flex; flex-wrap: wrap; gap: 0.5rem 1.2rem; align-items: center; margin: 0.7rem 0; }
</style>
</head>
<body>
<h1>J1 - Timeline player</h1>
<p id="status" role="status" aria-live="polite">Loading...</p>

<section aria-labelledby="h-listen">
  <h2 id="h-listen">How to listen</h2>
  <ul id="legend"></ul>
</section>

<section aria-labelledby="h-player">
  <h2 id="h-player">Player</h2>
  <video id="video" playsinline muted hidden></video>
  <canvas id="canvas" width="640" height="320" role="img" hidden></canvas>
  <div class="row">
    <button id="play" type="button">Play</button>
    <label for="seek">Position</label>
    <input id="seek" type="range" min="0" max="1" step="0.1" value="0">
  </div>
  <div class="row">
    <label>Speed
      <select id="rate">
        <option value="0.5">0.5x</option>
        <option value="1" selected>1x</option>
        <option value="2">2x</option>
      </select>
    </label>
    <label><input id="loop" type="checkbox" checked> Loop</label>
    <label>Volume <input id="vol" type="range" min="0" max="100" value="70"></label>
    <label>Audio offset (ms) <input id="offset" type="number" min="-300" max="300" step="10" value="0"></label>
  </div>
  <fieldset>
    <legend>Layers</legend>
    <label><input type="checkbox" data-layer="pad" checked> Pad (slow trend)</label>
    <label><input type="checkbox" data-layer="lead" checked> Lead notes (level)</label>
    <label><input type="checkbox" data-layer="ref" checked> Reference blip</label>
    <label><input type="checkbox" data-layer="drum" checked> Drums (events)</label>
  </fieldset>
</section>

<script src="https://cdn.jsdelivr.net/npm/tone@15.1.22/build/Tone.js"
        integrity="sha384-NWoslxaf/3dYwQk+uGziDYJFdsjBpVlU1WpFRexuDFcIk/5PJpCbpVXia2Uikeix" crossorigin="anonymous"></script>
<script src="sonify-core.js"></script>
<script src="jukebox-engine.js"></script>
<script>
(async function () {
  'use strict';
  const core = SonifyCore, $ = (id) => document.getElementById(id);
  const say = (msg) => { $('status').textContent = msg; };
  const q = new URLSearchParams(location.search), map = core.DEFAULT_MAPPING;
  if (typeof Tone === 'undefined') { say('Tone.js did not load. Check the network, or serve a local copy of Tone.js.'); return; }

  // 1. Timeline: ?timeline=timelines/3912.json (same origin as this page), otherwise the built-in demo.
  let tl;
  try {
    if (q.get('timeline')) {
      const res = await fetch(q.get('timeline'));
      if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + q.get('timeline'));
      tl = await res.json();
    } else tl = core.makeDemoTimeline();
    const problems = core.validateTimeline(tl);
    if (problems.length) throw new Error('it does not match the contract: ' + problems.join('; '));
  } catch (err) { say('Could not load the timeline: ' + err.message); return; }
  const stats = core.timelineStats(tl);

  // 2. Picture: ?video=URL, or ?frames=frames/f_{0000}.jpg&count=120&fps=6[&first=1], otherwise the demo animation.
  const spec = q.get('video') ? { video: q.get('video') }
    : q.get('frames') ? { frames: { pattern: q.get('frames'), count: +q.get('count'), fps: +q.get('fps'), first: +(q.get('first') || 0) } }
      : {};
  if (spec.frames && !(spec.frames.count > 0 && spec.frames.fps > 0)) { say('An image sequence needs count and fps, for example ?frames=frames/f_{0000}.jpg&count=120&fps=6'); return; }
  const video = $('video'), canvas = $('canvas');
  const visual = JukeboxEngine.openVisual(core, video, canvas, spec, tl);
  const label = 'Visualization: ' + tl.meta.source + '. The sound is described under How to listen.';
  video.setAttribute('aria-label', label); canvas.setAttribute('aria-label', label);

  // 3. The mapping in words, before any sound.
  for (const line of core.describeMapping(tl, map, stats)) $('legend').appendChild(document.createElement('li')).textContent = line;

  // 4. Controls, audio start on the first Play, and the picture loop all live in JukeboxEngine.createTransport.
  const transport = JukeboxEngine.createTransport(Tone, core, map, say);
  transport.load(visual, tl, map);
  say('Ready: ' + tl.meta.source + ', ' + stats.duration.toFixed(1) + ' seconds, ' + tl.frames.length + ' analysed frames. Press Play.');

  // 5. If the video cannot be loaded or decoded, keep the sound: show a coarse picture drawn from the timeline grid instead.
  video.addEventListener('error', () => {
    if (!video.getAttribute('src')) return;
    transport.load(JukeboxEngine.openVisual(core, video, canvas, {}, tl), tl, map);
    say('The video could not be loaded or decoded (try a WebM or H.264 MP4 file). Showing a coarse picture drawn from the timeline instead; the sound is unchanged.');
  });
})();
</script>
</body>
</html>
```

**How to run it.**

- Demo, no other files: `node serve.js . 8765`, open `http://127.0.0.1:8765/j1-player.html`, press Play.
- A real clip shown straight from SVS, with your timeline: `http://127.0.0.1:8765/j1-player.html?timeline=timelines/3912.json&video=https://svs.gsfc.nasa.gov/vis/a000000/a003900/a003912/flat_global_ecco2_6840x3420_768p30-b1.webm`
- A copy of the clip on your site: `?timeline=timelines/3912.json&video=media/3912.webm`
- An image sequence (for visualizations that only offer frames or a codec your browser cannot play): `?timeline=timelines/5313.json&frames=media/5313/f_{0000}.jpg&count=120&fps=6&first=1`. `{0000}` is replaced by the frame number padded to four digits; `first` is the number of the first file.

**What you should hear (demo).** A low drone on C and G that starts almost silent and dull, and over 24 seconds becomes louder and brighter. Plucked notes that begin on C4, sparse (three per four seconds), and climb towards A5 as the patch brightens, moving from the left ear to the right ear as the patch drifts east. A short pure blip on C5 every four seconds. A drum hit every 1.5 seconds, each at a different left-right position and pitch. Counted by the unit tests: 38 lead notes, 6 reference blips and 15 drum hits in the 24 seconds. Pause stops everything within about 0.15 seconds; dragging the Position slider or changing Speed takes effect at once; with Loop on, the first note plays again at each restart.

**How to adapt it.**

- Mapping: edit `DEFAULT_MAPPING` in `sonify-core.js` or pass your own object as `map`.
- Timbre: edit `createEngine` (oscillator `type`: `'sine'`, `'triangle'`, `'sawtooth'`, `'square'`; envelope times in seconds; `volume` in dB).
- More drum voices for dense events (lightning): raise `maxEventsPerFrame` and the number of drum voices in `createEngine` together.
- Narrated clips: `openVisual` mutes the video. Remove `video.muted = true` if you want the original audio.
- Bluetooth or a slow output device: type a positive number into "Audio offset (ms)". The sound is then scheduled that much earlier.

**Accessibility notes.**

- All controls are native elements with visible labels; the Position slider gets `aria-valuetext` ("12 of 24 seconds"), updated twice a second so a screen reader is not flooded.
- Status messages ("Playing.", "Paused at 12 seconds.", errors) go to one `role="status"` `aria-live="polite"` paragraph that exists in the page from the start, as MDN recommends.
- The "How to listen" list is filled before Play is possible and is plain text, so it works with a screen reader, a braille display and translation tools.
- No sound starts without a press on Play. The Layers checkboxes let a listener hear one layer at a time, which is how you teach the mapping.
- The picture has a text label, but J1 has no rich description of the visualization. J5 adds one per track.

STATUS: syntax-checked with node --check and pure functions unit-tested in Node 24 on 2026-11-14; not yet run in a browser

## J2. Live probe: `j2-probe.html`

**Goal.** Let a person explore one still image by moving a probe with the mouse, a finger or the arrow keys, and hear the value under the probe.

**What it demonstrates.**

- Two ways to turn a pixel into a value: plain brightness, or **colour-map inversion** (find the legend colour closest to the pixel and report its position along the legend, which recovers the data value the colour stood for). Pixels that match no legend colour (coastlines, labels, land) are reported as "no data".
- Value to scale-quantized pitch (16 notes, C3 to C6) with hysteresis; x to pan; value to timbre brightness (filter cutoff 500 to 6000 Hz), which can be switched off.
- Reference tones (lowest, middle, highest note) on a button and on the R key.
- A spoken read-out of position, value and note through an `aria-live` region, debounced so it speaks once when the movement settles.
- Full keyboard operation and a visible focus indicator.
- The same-origin rule in practice: the page reads pixels, so the image must be served from your site. The demo image is generated on the canvas, so the page runs with no other files.

**File `j2-probe.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>J2 Live probe - Earth Information Jukebox recipe</title>
<style>
  body { font: 1rem/1.5 system-ui, sans-serif; max-width: 52rem; margin: 1rem auto; padding: 0 1rem; color: #111; background: #fff; }
  canvas { display: block; width: 100%; max-width: 640px; height: auto; background: #000; touch-action: none; cursor: crosshair; }
  button, select, input { font: inherit; }
  button { padding: 0.5rem 0.9rem; }
  :focus-visible { outline: 3px solid #1a5fb4; outline-offset: 3px; }
  #map:focus-visible { outline-width: 5px; outline-offset: 5px; }
  .row { display: flex; flex-wrap: wrap; gap: 0.5rem 1.2rem; align-items: center; margin: 0.7rem 0; }
</style>
</head>
<body>
<h1>J2 - Live probe</h1>
<p id="status" role="status" aria-live="polite">Loading...</p>
<p id="help">Move the probe over the map to hear the value under it. A higher note means a higher value, and the sound moves
left and right with the probe. Keyboard: put the focus on the map, then use the arrow keys (hold Shift for bigger steps),
Home and End for the left and right edge, Page Up and Page Down for the top and bottom, Space to repeat the reading,
and R for the reference tones. A short hiss means there is no data at that spot.</p>

<canvas id="map" width="640" height="320" tabindex="0" role="application" aria-label="Sound map" aria-describedby="help"></canvas>
<p id="now" aria-hidden="true">&nbsp;</p>
<p id="live" role="status" aria-live="polite"></p>

<div class="row">
  <button id="ref" type="button">Play reference tones: low, middle, high</button>
  <label>Value from
    <select id="mode">
      <option value="legend">colour legend</option>
      <option value="brightness">brightness</option>
    </select>
  </label>
  <label><input id="timbre" type="checkbox" checked> Brighter sound for higher values</label>
  <label>Volume <input id="vol" type="range" min="0" max="100" value="70"></label>
</div>

<script src="https://cdn.jsdelivr.net/npm/tone@15.1.22/build/Tone.js"
        integrity="sha384-NWoslxaf/3dYwQk+uGziDYJFdsjBpVlU1WpFRexuDFcIk/5PJpCbpVXia2Uikeix" crossorigin="anonymous"></script>
<script src="sonify-core.js"></script>
<script>
(function () {
  'use strict';
  const core = SonifyCore, $ = (id) => document.getElementById(id);
  const say = (msg) => { $('status').textContent = msg; };
  const q = new URLSearchParams(location.search);
  const cv = $('map'), g = cv.getContext('2d', { willReadFrequently: true }), W = cv.width, H = cv.height;
  const NOTES = core.buildScale(48, 'majorPentatonic', 3);   // C3..C6, 16 notes
  const NO_DATA_DIST = 40;                                   // RGB distance beyond which a pixel is "not a legend colour"
  const STEP = 8;                                            // pixels per arrow-key press (Shift: 4 times as far)
  const valueRange = [+(q.get('min') || 0), +(q.get('max') || 1)], unit = q.get('unit') || '';
  let pixels = null, stops = null, pos = { x: W >> 1, y: H >> 1 }, idx = null, voice = null, audioReady = null, liveTimer = null;
  if (typeof Tone === 'undefined') { say('Tone.js did not load. Check the network, or serve a local copy of Tone.js.'); return; }

  // ----- picture: the built-in demo image, or ?image=path for a file served from this site -----
  function ready(legendStops) {
    try { pixels = g.getImageData(0, 0, W, H); }             // throws SecurityError on a tainted canvas
    catch (err) {
      say(err.name === 'SecurityError'
        ? 'This image comes from another origin without CORS permission, so the browser will not let this page read its pixels. Put a copy of the image next to this page.'
        : 'Could not read the image: ' + err.message);
      return;
    }
    const L = (q.get('legend') || '').split(',').map(Number);   // ?legend=x0,y0,x1,y1: ends of the colour bar as fractions of the image
    stops = legendStops || (L.length === 4 && L.every((v) => v >= 0 && v <= 1) ? core.sampleLegend(pixels.data, W, H, L[0], L[1], L[2], L[3], 64) : null);
    if (!stops) { $('mode').value = 'brightness'; $('mode').options[0].disabled = true; }
    draw();
    say('Ready. Click the map, or focus it and press an arrow key, to start the sound.');
  }
  if (q.get('image')) {
    const im = new Image();
    if (q.get('cors')) im.crossOrigin = 'anonymous';         // only for servers that allow this site with Access-Control-Allow-Origin
    im.onload = () => { g.drawImage(im, 0, 0, W, H); ready(null); };
    im.onerror = () => say('Could not load the image ' + q.get('image') + '.');
    im.src = q.get('image');
  } else {
    const img = g.createImageData(W, H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const v = core.demoField(x / (W - 1), y / (H - 1)), c = v === null ? core.DEMO_LAND : core.rampColor(v, core.DEMO_RAMP);
        img.data.set([c[0], c[1], c[2], 255], 4 * (y * W + x));
      }
    }
    g.putImageData(img, 0, 0);
    ready(core.DEMO_RAMP);
  }
  function draw() {                                          // picture + a two-tone ring that shows on any colour
    g.putImageData(pixels, 0, 0);
    for (const [width, colour] of [[5, '#000'], [2, '#fff']]) {
      g.lineWidth = width; g.strokeStyle = colour;
      g.beginPath(); g.arc(pos.x, pos.y, 11, 0, 2 * Math.PI); g.stroke();
    }
  }

  // ----- sound: one sustained voice -> low-pass filter (brightness) -> panner (left-right) -> gain -> limiter -----
  const volumeGain = () => Math.pow(+$('vol').value / 100, 2);
  async function startAudio() {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';   // iOS 17+: stay audible with the ring switch on silent
    await Tone.start();
    const limiter = new Tone.Limiter({ threshold: -3 }).toDestination();
    const master = new Tone.Gain({ gain: volumeGain() }).connect(limiter);
    const pan = new Tone.Panner({ pan: 0 }).connect(master);
    const filter = new Tone.Filter({ frequency: 1500, type: 'lowpass' }).connect(pan);
    const synth = new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.02, decay: 0.1, sustain: 0.7, release: 0.25 } }).connect(filter);
    synth.portamento = 0.03; synth.volume.value = -8;        // 30 ms glide between notes while the probe moves
    const ref = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.1 } }).connect(master);
    ref.volume.value = -10;
    const hiss = new Tone.NoiseSynth({ envelope: { attack: 0.005, decay: 0.08, sustain: 0 } }).connect(master);
    hiss.volume.value = -20;
    voice = { master, pan, filter, synth, ref, hiss, held: false, release: null, hissAt: -1, refUntil: -1 };
  }
  const ensureAudio = () => (audioReady = audioReady || startAudio().catch((err) => say('Audio could not start: ' + err.message)));

  function sound(reading) {
    const now = Tone.immediate();
    clearTimeout(voice.release);
    if (reading.noData) {
      if (voice.held) { voice.synth.triggerRelease(now); voice.held = false; }
      if (now - voice.hissAt > 0.2) { voice.hiss.triggerAttack(now); voice.hissAt = now; }
      return;
    }
    const hz = core.midiToFreq(NOTES[idx]);
    voice.pan.pan.setTargetAtTime(core.panFromX(pos.x / (W - 1)), now, 0.02);
    voice.filter.frequency.setTargetAtTime($('timbre').checked ? core.scaleExp(reading.u, 500, 6000) : 2500, now, 0.03);
    if (voice.held) voice.synth.setNote(hz, now);
    else { voice.synth.triggerAttack(hz, now, 0.8); voice.held = true; }
    voice.release = setTimeout(() => { voice.synth.triggerRelease(Tone.immediate()); voice.held = false; }, 900);   // falls silent 0.9 s after the last move
  }
  function playReference() {
    if (!voice) return;
    const now = Tone.immediate();
    if (now < voice.refUntil) return;
    [0, NOTES.length >> 1, NOTES.length - 1].forEach((k, j) => voice.ref.triggerAttackRelease(core.midiToFreq(NOTES[k]), 0.25, now + 0.05 + 0.45 * j, 0.7));
    voice.refUntil = now + 1.6;
    announce('Reference tones: lowest value, middle value, highest value.');
  }

  // ----- probe -----
  function announce(text) {                                  // debounced: a screen reader gets one sentence when the movement settles
    clearTimeout(liveTimer);
    $('live').textContent = '';
    liveTimer = setTimeout(() => { $('live').textContent = text; }, 350);
  }
  function moveTo(x, y) {
    if (!pixels) return;
    pos = { x: Math.round(core.clamp(x, 0, W - 1)), y: Math.round(core.clamp(y, 0, H - 1)) };
    const useLegend = stops && $('mode').value === 'legend';
    const reading = core.readPixel(pixels.data, W, pos.x, pos.y, useLegend ? stops : null, NO_DATA_DIST);
    if (!reading.noData) idx = core.stickyIndex(idx, reading.u, NOTES.length);
    draw();
    if (voice) sound(reading);
    const text = core.describeReading(pos.x, pos.y, W, H, reading, valueRange, unit, NOTES[idx === null ? 0 : idx]);
    $('now').textContent = text;
    announce(text);
  }
  const toCanvas = (e) => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) * W / b.width, (e.clientY - b.top) * H / b.height]; };
  cv.addEventListener('pointerdown', (e) => { const p = toCanvas(e); cv.focus(); ensureAudio().then(() => moveTo(p[0], p[1])); });
  cv.addEventListener('pointermove', (e) => { const p = toCanvas(e); moveTo(p[0], p[1]); });
  cv.addEventListener('keydown', (e) => {
    const next = core.moveProbe(pos, e.key, e.shiftKey, W, H, STEP);
    if (next) { e.preventDefault(); ensureAudio().then(() => moveTo(next.x, next.y)); }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); ensureAudio().then(() => moveTo(pos.x, pos.y)); }
    else if (e.key === 'r' || e.key === 'R') ensureAudio().then(playReference);
  });
  $('ref').addEventListener('click', () => ensureAudio().then(playReference));
  $('mode').addEventListener('change', () => moveTo(pos.x, pos.y));
  $('vol').addEventListener('input', () => { if (voice) voice.master.gain.setTargetAtTime(volumeGain(), Tone.immediate(), 0.03); });
})();
</script>
</body>
</html>
```

**How to run it.**

- Demo: `http://127.0.0.1:8765/j2-probe.html`. Click the map or press Tab until the map has the focus ring, then use the arrow keys.
- Your own frame, brightness only: `?image=media/nightlights_2023.jpg`
- Your own frame with its colour bar, in data units: `?image=media/sst_frame.png&legend=0.30,0.95,0.70,0.95&min=-2&max=32&unit=degrees%20C`. `legend` gives the two ends of the colour bar inside the image as fractions of its width and height, low end first (here: a horizontal bar from 30 % to 70 % of the width, at 95 % of the height). The page samples 64 colours along that line.
- The canvas is 640 x 320. For an image with another shape, change the `width` and `height` attributes of the canvas to the same proportions.

**What you should hear (demo).** Silence until the first click or key press. Then a sustained buzzy tone that follows the probe: low and dull in the bottom-left corner (value about 0.10), rising as you move right and up (0.55 in the top-right corner), highest and brightest on the "hill" left of centre at about 30 % across and 60 % down (0.75). The tone moves between your ears as the probe moves left and right. It stops 0.9 seconds after the last movement. Over the grey patch near 62 % across, 25 % down you hear a short hiss instead of a tone and the read-out says "no data here". "Play reference tones" plays three sine notes: C3, G4, C6.

**How to adapt it.**

- Notes: change `NOTES` (root, scale, octaves). Fewer notes are easier to tell apart; more notes resolve smaller differences.
- Step size: `STEP` pixels per key press. For a grid-like data set, set it to the cell size.
- "No data" threshold: `NO_DATA_DIST` is a distance in RGB space (0 to 441). Raise it if compressed JPEG frames produce false "no data"; lower it if labels are read as data.
- For frames of a video: export the frame as an image first (08-recipes-python.md), or grab it in J3 from a same-origin video.

**Accessibility notes.**

- The canvas is focusable (`tabindex="0"`) and has `role="application"`, a name and a description (`aria-describedby` points at the instructions). That role tells screen readers to pass the arrow keys to the page; in exchange the page must handle the keys itself and must never trap Tab. Tab is not intercepted here.
- Keys: arrows move 8 pixels, Shift + arrows 32 pixels, Home and End jump to the left and right edge, Page Up and Page Down to the top and bottom, Space or Enter repeats the reading, R plays the reference tones. The single-letter key only works while the map has focus.
- The read-out says position as "37% across, 62% down", the value in data units and the note name. It is written to the live region 350 ms after the last movement; a visible copy updates immediately.
- "No data" is a sound (hiss) and a sentence, never silence: silence would be ambiguous.
- The focus ring is a 5 px outline; the probe is drawn as a black-and-white double ring so it shows on any colour. Colour alone carries no information.
- Touch: `touch-action: none` lets a finger drag the probe instead of scrolling the page. Screen-reader touch gestures (VoiceOver, TalkBack) are not handled; on phones, test with a real device.

STATUS: syntax-checked with node --check and pure functions unit-tested in Node 24 on 2026-11-14; not yet run in a browser

## J3. Live video analysis loop: `j3-live-video.html`

**Goal.** Compute the sound from the video frames while they play: frame callback, shrink the frame to 64 x 36, compute features, smooth them, steer the synths.

**What it demonstrates.**

- `requestVideoFrameCallback` (runs once per presented video frame and passes the frame's media time), with a `requestAnimationFrame` fallback. MDN lists it as Baseline 2024, available across browsers since October 2024.
- Throttling to 15 analyses per second. 64 x 36 is 2,304 pixels, so one analysis is cheap.
- Features (pure functions in J0): mean brightness, motion (mean absolute brightness change since the previous analysed frame), brightness-weighted centre (x for pan), warmth (red versus blue), a 6 x 12 grid, and flash events.
- Smoothing with a 0.3 s time constant before any value reaches a synth, then `setTargetAtTime` ramps on the audio parameters, so nothing jumps or clicks.
- Detecting the tainted-canvas `SecurityError` and falling back to a precomputed timeline.
- Recording what was analysed as a timeline JSON in the contract shape. This is a way to make timelines for J1 and J5 without Python.

How the tainted-canvas problem shows up, and how the page handles it:

1. `drawImage(video, ...)` always succeeds. If the video is cross-origin without CORS permission, the canvas silently becomes tainted.
2. The next `getImageData` throws a `DOMException` whose `name` is `'SecurityError'`. The page catches exactly that name.
3. The page then stops pixel analysis, says why in the status line, and if the URL has `&timeline=...` it loads that file and takes the same features from the timeline at `video.currentTime` instead. Without a timeline it stays silent and says what to add.
4. A tainted canvas stays tainted, so the page creates a new analysis canvas whenever the source changes.

**File `j3-live-video.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>J3 Live video analysis - Earth Information Jukebox recipe</title>
<style>
  body { font: 1rem/1.5 system-ui, sans-serif; max-width: 52rem; margin: 1rem auto; padding: 0 1rem; color: #111; background: #fff; }
  video { display: block; width: 100%; max-width: 640px; height: auto; background: #000; }
  button, input { font: inherit; }
  button { padding: 0.5rem 0.9rem; }
  :focus-visible { outline: 3px solid #1a5fb4; outline-offset: 3px; }
  .row { display: flex; flex-wrap: wrap; gap: 0.5rem 1.2rem; align-items: center; margin: 0.7rem 0; }
</style>
</head>
<body>
<h1>J3 - Live video analysis</h1>
<p id="status" role="status" aria-live="polite">Loading...</p>
<p>The sound is computed from the video frames while they play. Pad: louder when the picture is brighter overall, and
brighter in tone when the picture is redder. Plucked notes: higher when the picture is brighter, faster when more of the
picture is changing, placed left or right where the bright areas are. Drum: a spot that suddenly lights up.</p>

<video id="video" playsinline muted loop aria-label="The video being analysed"></video>
<div class="row">
  <button id="play" type="button">Play</button>
  <button id="rec" type="button">Record a timeline</button>
  <label>Volume <input id="vol" type="range" min="0" max="100" value="70"></label>
</div>
<p id="meter" aria-hidden="true">&nbsp;</p>

<script src="https://cdn.jsdelivr.net/npm/tone@15.1.22/build/Tone.js"
        integrity="sha384-NWoslxaf/3dYwQk+uGziDYJFdsjBpVlU1WpFRexuDFcIk/5PJpCbpVXia2Uikeix" crossorigin="anonymous"></script>
<script src="sonify-core.js"></script>
<script src="jukebox-engine.js"></script>
<script>
(function () {
  'use strict';
  const core = SonifyCore, $ = (id) => document.getElementById(id);
  const say = (msg) => { $('status').textContent = msg; };
  const q = new URLSearchParams(location.search), video = $('video'), map = core.DEFAULT_MAPPING;
  const W = 64, H = 36;            // size the frame is shrunk to before analysis (2304 pixels)
  const ROWS = 6, COLS = 12;       // grid stored in a recorded timeline
  const HZ = 15;                   // analyses per second at most
  const NOTES = core.leadNotes(map);
  let small = null, sctx = null, prevLuma = null;
  let mode = 'pixels', tl = null, engine = null, audioReady = null, recording = null;
  let lastMs = 0, lastT = -1, sm = {}, range = null, phase = 0, idx = null;
  if (typeof Tone === 'undefined') { say('Tone.js did not load. Check the network, or serve a local copy of Tone.js.'); return; }

  function reset() {               // a canvas that was tainted once stays tainted, so every source gets a new one
    small = document.createElement('canvas'); small.width = W; small.height = H;
    sctx = small.getContext('2d', { willReadFrequently: true });
    prevLuma = null; sm = {}; range = { lo: Infinity, hi: -Infinity, motion: 1e-6 }; idx = null; lastT = -1;
  }
  reset();

  // ----- source: ?video=path (a file served from this site), otherwise a generated demo stream -----
  if (q.get('video')) {
    video.src = q.get('video');    // no crossorigin attribute: a cross-origin file still plays, but its pixels are off limits
    video.addEventListener('error', () => say('The browser could not load or decode this video. Try a WebM or H.264 MP4 file.'));
  } else {
    const demo = core.makeDemoTimeline(), dur = core.timelineStats(demo).duration;
    const cv = document.createElement('canvas'); cv.width = 320; cv.height = 180;
    const g = cv.getContext('2d');
    (function paint() {
      JukeboxEngine.drawDemoFrame(core, g, cv.width, cv.height, demo, (performance.now() / 1000) % dur);
      requestAnimationFrame(paint);
    })();
    video.srcObject = cv.captureStream(30);   // a live video made from a canvas of this page: same origin, pixels readable
  }
  say('Ready. Press Play.');

  // ----- features of the frame on screen: from its pixels, or from a precomputed timeline when pixels are blocked -----
  function features(t) {
    if (mode === 'timeline') {
      const s = core.sampleTimeline(tl, t), c = core.gridCentroid(s.grid, tl.meta.grid[0], tl.meta.grid[1]);
      const events = lastT >= 0 && t > lastT && t - lastT < 1 ? core.eventsBetween(tl.frames, lastT, t) : [];
      return { mean: s.mean, motion: s.motion, grid: s.grid, cx: c.x, warmth: 0.5, events };
    }
    sctx.drawImage(video, 0, 0, W, H);                                                       // shrink the current frame
    const f = core.frameFeatures(sctx.getImageData(0, 0, W, H).data, W, H, prevLuma, ROWS, COLS);   // SecurityError if tainted
    f.events = core.detectEvents(f.luma, prevLuma, W, H, ROWS, COLS, 0.25, 3);
    prevLuma = f.luma;
    return f;
  }

  async function blocked() {
    mode = 'blocked';
    if (engine) engine.setPad({ gain: 0 }, Tone.immediate(), 0.05);
    const url = q.get('timeline');
    say('The browser will not give this page the pixels of the video: it comes from another origin without CORS permission (tainted canvas, SecurityError). ' +
      (url ? 'Loading the precomputed timeline instead.' : 'Add &timeline=your-file.json to play a precomputed timeline, or serve a copy of the video from this site.'));
    if (!url) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
      const obj = await res.json(), problems = core.validateTimeline(obj);
      if (problems.length) throw new Error(problems.join('; '));
      tl = obj; reset(); mode = 'timeline';
      say('The pixels of this video are blocked, so the sound now comes from the precomputed timeline ' + url + '.');
    } catch (err) { say('The pixels are blocked and the timeline could not be loaded: ' + err.message); }
  }

  // ----- one analysis step: features -> smoothing -> sound -----
  function analyse(t) {
    const ms = performance.now();
    if (mode === 'blocked' || !engine || ms - lastMs < 1000 / HZ) return;      // throttle
    const dt = Math.min(0.5, (ms - lastMs) / 1000), now = Tone.immediate();
    lastMs = ms;
    let f;
    try { f = features(t); }
    catch (err) {
      if (err.name !== 'SecurityError') throw err;
      blocked(); return;
    }
    lastT = t;
    const a = core.emaAlpha(dt, 0.3);                                          // 0.3 s time constant whatever the frame rate
    sm.mean = core.ema(sm.mean, f.mean, a); sm.motion = core.ema(sm.motion, f.motion, a); sm.cx = core.ema(sm.cx, f.cx, a);
    // ponytail: the value range is learned while playing and never shrinks; reload the page for a new clip
    range.lo = Math.min(range.lo, sm.mean); range.hi = Math.max(range.hi, sm.mean); range.motion = Math.max(range.motion, sm.motion);
    const u = core.norm(sm.mean, range.lo, range.hi);
    engine.setPad({ gain: core.scaleLinear(u, map.padMinGain, map.padMaxGain), cutoff: core.scaleExp(f.warmth, map.padMinHz, map.padMaxHz) }, now, 0.15);
    idx = core.stickyIndex(idx, u, NOTES.length);
    const beat = core.pulseStep(phase, core.scaleExp(core.norm(sm.motion, 0, range.motion), 1, 8), dt);   // 1 to 8 notes per second
    phase = beat.phase;
    if (beat.fire) engine.play({ kind: 'lead', midi: NOTES[idx], vel: 0.7, pan: core.panFromX(sm.cx, 0.8, map.panGain), dur: 0.12 }, now);
    for (const e of f.events) engine.play(core.drumEvent(e, map), now);
    if (recording && mode === 'pixels' && (recording.length === 0 || t > recording[recording.length - 1].t + 1e-3)) {
      recording.push({ t: core.round(t, 3), mean: core.round(f.mean), grid: f.grid.map((v) => core.round(v)), motion: core.round(f.motion), events: f.events });
    }
    $('meter').textContent = 'level ' + sm.mean.toFixed(3) + ' | change ' + sm.motion.toFixed(4) + ' | note ' + core.midiToName(NOTES[idx]) +
      ' | source ' + mode + (recording ? ' | recording ' + recording.length + ' frames' : '');
  }

  // ----- the loop: once per presented video frame where the browser supports it, else once per display frame -----
  const hasRVFC = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
  function onFrame(_now, meta) {
    if (!video.paused && !video.ended) analyse(meta ? meta.mediaTime : video.currentTime);
    if (hasRVFC) video.requestVideoFrameCallback(onFrame); else requestAnimationFrame(() => onFrame());
  }
  onFrame();
  const hush = () => { if (engine) engine.setPad({ gain: 0 }, Tone.immediate(), 0.05); };
  for (const name of ['pause', 'ended', 'waiting']) video.addEventListener(name, hush);

  // ----- controls -----
  const volumeGain = () => Math.pow(+$('vol').value / 100, 2);
  async function startAudio() {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';   // iOS 17+: stay audible with the ring switch on silent
    await Tone.start();
    engine = JukeboxEngine.createEngine(Tone, core, map);
    engine.start(Tone.immediate());
    engine.setMaster(volumeGain(), Tone.immediate());
  }
  $('play').addEventListener('click', () => {
    const media = video.paused ? video.play() : video.pause();              // both calls run inside the user gesture
    Promise.all([audioReady = audioReady || startAudio(), media]).catch((err) => say('Playback failed: ' + err.message));
  });
  video.addEventListener('play', () => { $('play').textContent = 'Pause'; if (mode === 'pixels') say('Playing. The sound is computed from the frames as they are shown.'); });
  video.addEventListener('pause', () => { $('play').textContent = 'Play'; });
  $('vol').addEventListener('input', () => { if (engine) engine.setMaster(volumeGain(), Tone.immediate()); });
  $('rec').addEventListener('click', () => {
    if (!recording) {
      recording = []; $('rec').textContent = 'Stop and download the timeline';
      say('Recording a timeline. Let the clip play through once, then press the button again.');
      return;
    }
    const frames = recording;
    recording = null; $('rec').textContent = 'Record a timeline';
    if (frames.length < 2) { say('Nothing was recorded. Press Play first; the video must be readable (same origin).'); return; }
    const out = core.buildTimeline(q.get('video') || 'demo-stream', frames, ROWS, COLS,
      'brightness measured in the browser by recipe J3, 0 = black, 1 = white; fps is the analysis rate, not the frame rate of the file');
    JukeboxEngine.saveBlob(new Blob([JSON.stringify(out)], { type: 'application/json' }), 'timeline.json');
    say('Saved timeline.json with ' + frames.length + ' frames. Contract check: ' + (core.validateTimeline(out).join('; ') || 'passed') + '.');
  });
})();
</script>
</body>
</html>
```

**How to run it.**

- Demo, no other files: `http://127.0.0.1:8765/j3-live-video.html`, press Play. The page paints the demo animation on a hidden canvas and feeds it to the `<video>` element with `canvas.captureStream(30)`, so the whole chain (video element, frame callback, pixel read-back) is exercised.
- A clip from your own site: `?video=media/3912.webm`. Use `serve.js`, not Python's server, so seeking and looping work in Chrome.
- See the block and the fallback: `?video=https://svs.gsfc.nasa.gov/vis/a000000/a003900/a003912/flat_global_ecco2_6840x3420_768p30-b1.webm&timeline=timelines/3912.json`. The video plays, the status line reports the `SecurityError`, and the sound comes from the timeline.
- Make a timeline: open the page with a same-origin clip, press "Record a timeline", press Play, let it run through once, press the button again. Save the downloaded `timeline.json` as `timelines/<name>.json`.

**What you should hear (demo).** A drone that swells as the picture brightens. Plucked notes whose pitch rises with overall brightness and whose rate changes between one and eight per second with how much the picture is changing. A drum when a white disc flashes (every 1.5 s). The line under the buttons shows the smoothed numbers and the current note. Because the value range is learned while playing, the first second or two can jump around.

**How to adapt it.**

- Analysis size and rate: `W`, `H`, `HZ`. Larger frames find smaller flashes and cost more.
- Flash sensitivity: the `0.25` in `detectEvents` is the brightness increase (0..1) that counts as an event; `3` is the most events per frame.
- Colour to sound: `warmth` currently sets the pad's filter. For "colour to chord" (suggested in the challenge text) pick the scale from it, for example minor pentatonic below 0.45 and major pentatonic above 0.55, with a dead zone between so it does not flip back and forth.
- Region of interest: crop in `drawImage` by using its nine-argument form (source rectangle, then destination rectangle).

**Accessibility notes.** Same control pattern as J1 (native buttons, one polite status line). The mapping is written as text above the video. The numeric meter is `aria-hidden` because it changes 15 times a second. When pixels are blocked the reason is announced in words, not left as a silent failure. This page has no per-layer switches; use J1 or J5 for teaching the sounds.

STATUS: syntax-checked with node --check and pure functions unit-tested in Node 24 on 2026-11-14; not yet run in a browser

## J4. Export: `j4-export.html`

**Goal.** Get audio files out: (A) render a whole timeline to a WAV file offline, (B) record what is being heard in real time.

**What it demonstrates.**

- **A. Offline render.** `Tone.Offline(callback, duration, 2, 44100)` creates an `OfflineAudioContext`, runs the callback (which builds the same engine and schedules the same score in media time), renders faster than real time and resolves with a buffer. `encodeWav` turns the two channels into a 16-bit PCM WAV; the page reports the peak level in dBFS and the file size. No user gesture is needed and nothing is played aloud.
- **B. Real-time recording.** `Tone.Recorder` is, in 15.1.22, a small wrapper: it creates a `MediaStreamAudioDestinationNode` and records its stream with `MediaRecorder`. The page taps the signal after the limiter, records one pass of the timeline and downloads the result. The format is whatever the browser's `MediaRecorder` produces (the Tone.js docs mention WebM in Chrome); the file extension is chosen from the reported MIME type.
- Loading a timeline from disk with a file input: no server round trip, nothing uploaded.
- A pure-JavaScript WAV encoder (`encodeWav` in J0) with tests: header fields, clipping of values outside -1..1, silence for NaN, channel interleaving, and a file that Python's `wave` module reads back as 2 channels, 16 bit, 44,100 Hz.

WAV layout written by `encodeWav` (all numbers little-endian): bytes 0-3 `RIFF`, 4-7 file size minus 8, 8-11 `WAVE`, 12-15 `fmt `, 16-19 the number 16, 20-21 format 1 (PCM), 22-23 channels, 24-27 sample rate, 28-31 bytes per second, 32-33 bytes per frame, 34-35 bits per sample, 36-39 `data`, 40-43 data size, then the samples, left and right alternating, as signed 16-bit integers. Size = 44 + seconds * 44,100 * 4 bytes for stereo: the 24 s demo plus its 1.5 s tail is 4,498,244 bytes.

**File `j4-export.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>J4 Export - Earth Information Jukebox recipe</title>
<style>
  body { font: 1rem/1.5 system-ui, sans-serif; max-width: 52rem; margin: 1rem auto; padding: 0 1rem; color: #111; background: #fff; }
  button, input { font: inherit; }
  button { padding: 0.5rem 0.9rem; }
  :focus-visible { outline: 3px solid #1a5fb4; outline-offset: 3px; }
  .row { display: flex; flex-wrap: wrap; gap: 0.5rem 1.2rem; align-items: center; margin: 0.7rem 0; }
</style>
</head>
<body>
<h1>J4 - Export the sound</h1>
<p id="status" role="status" aria-live="polite">Loading...</p>

<div class="row">
  <label>Timeline file (JSON, optional; the demo is used otherwise) <input id="file" type="file" accept="application/json,.json"></label>
</div>
<h2>A. Render the whole timeline to a WAV file (offline, faster than real time, silent)</h2>
<div class="row">
  <button id="render" type="button">Render to WAV and download</button>
</div>
<h2>B. Record what you hear (real time)</h2>
<div class="row">
  <button id="rec" type="button">Play and record</button>
</div>

<script src="https://cdn.jsdelivr.net/npm/tone@15.1.22/build/Tone.js"
        integrity="sha384-NWoslxaf/3dYwQk+uGziDYJFdsjBpVlU1WpFRexuDFcIk/5PJpCbpVXia2Uikeix" crossorigin="anonymous"></script>
<script src="sonify-core.js"></script>
<script src="jukebox-engine.js"></script>
<script>
(function () {
  'use strict';
  const core = SonifyCore, $ = (id) => document.getElementById(id);
  const say = (msg) => { $('status').textContent = msg; };
  const map = core.DEFAULT_MAPPING, toggles = { pad: true, lead: true, ref: true, drum: true };
  let tl = core.makeDemoTimeline(), stats = core.timelineStats(tl);
  let engine = null, player = null, clock = null, recorder = null, audioReady = null;
  if (typeof Tone === 'undefined') { say('Tone.js did not load. Check the network, or serve a local copy of Tone.js.'); return; }
  const safeName = () => String(tl.meta.source).replace(/[^\w.-]+/g, '_');
  say('Ready: the demo timeline is loaded (' + stats.duration.toFixed(1) + ' seconds).');

  // Load a timeline straight from disk: nothing is uploaded anywhere.
  $('file').addEventListener('change', async () => {
    const f = $('file').files[0];
    if (!f) return;
    try {
      const obj = JSON.parse(await f.text()), problems = core.validateTimeline(obj);
      if (problems.length) throw new Error(problems.join('; '));
      tl = obj; stats = core.timelineStats(tl);
      say('Loaded ' + f.name + ': ' + stats.duration.toFixed(1) + ' seconds, ' + tl.frames.length + ' frames.');
    } catch (err) { say('That file is not a valid timeline: ' + err.message); }
  });

  // A. Offline render: Tone.Offline builds the same instruments in an OfflineAudioContext and computes the samples.
  $('render').addEventListener('click', async () => {
    say('Rendering...');
    try {
      const t0 = performance.now();
      const buffer = await JukeboxEngine.renderOffline(Tone, core, tl, map, toggles);
      const channels = [];
      for (let c = 0; c < buffer.numberOfChannels; c++) channels.push(buffer.getChannelData(c));
      const wav = core.encodeWav(channels, buffer.sampleRate);
      JukeboxEngine.saveBlob(new Blob([wav], { type: 'audio/wav' }), 'jukebox-' + safeName() + '.wav');
      say('Rendered ' + buffer.duration.toFixed(1) + ' seconds of sound in ' + ((performance.now() - t0) / 1000).toFixed(1) + ' seconds. Peak level ' +
        core.peakDb(channels).toFixed(1) + ' dBFS, file size ' + (wav.byteLength / 1e6).toFixed(1) + ' MB.');
    } catch (err) { say('The offline render failed: ' + err.message); }
  });

  // B. Real-time recording: Tone.Recorder wraps MediaRecorder on a MediaStreamAudioDestinationNode.
  async function startAudio() {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
    await Tone.start();
    engine = JukeboxEngine.createEngine(Tone, core, map);
    engine.start(Tone.immediate());
    player = JukeboxEngine.createPlayer(Tone, core, engine, toggles);
    player.start();
  }
  $('rec').addEventListener('click', async () => {
    try {
      await (audioReady = audioReady || startAudio());
      if (!Tone.Recorder.supported) { say('This browser has no MediaRecorder. Use the offline WAV render instead.'); return; }
      if (!recorder) { recorder = new Tone.Recorder(); engine.limiter.connect(recorder); }   // tap the signal after the limiter
      if (recorder.state !== 'started') {
        clock = core.makeClipClock(stats.duration, () => performance.now() / 1000);
        player.setSource(clock, tl, map);
        await recorder.start();
        await clock.play();
        $('rec').textContent = 'Stop and download the recording';
        say('Playing and recording. It stops by itself at the end, or press the button again.');
        const mine = clock;
        const watch = setInterval(() => {                    // stop by itself when the clip ends
          if (clock !== mine || recorder.state !== 'started') clearInterval(watch);
          else if (mine.ended) { clearInterval(watch); $('rec').click(); }
        }, 200);
      } else {
        clock.pause();
        await new Promise((done) => setTimeout(done, 600));  // let the last notes ring out
        const blob = await recorder.stop();
        const type = blob.type || recorder.mimeType;
        JukeboxEngine.saveBlob(blob, 'jukebox-' + safeName() + '.' + core.extensionForMime(type));
        $('rec').textContent = 'Play and record';
        say('Saved the recording (' + type + ', ' + (blob.size / 1e6).toFixed(2) + ' MB).');
      }
    } catch (err) { say('Recording failed: ' + err.message); }
  });
})();
</script>
</body>
</html>
```

**File `record-node.js`** (optional: the same recording idea for a plain Web Audio graph without Tone.js)

```js
// record-node.js - the same recording idea without Tone.js, for any Web Audio graph.
// audioCtx: an AudioContext. node: the last node before audioCtx.destination (for example your limiter).
// Returns { mimeType, stop() }; stop() resolves with a Blob in the browser's own compressed format.
function recordNode(audioCtx, node) {
  const tap = audioCtx.createMediaStreamDestination();   // a MediaStreamAudioDestinationNode
  node.connect(tap);                                     // in parallel with the connection to the speakers
  const recorder = new MediaRecorder(tap.stream);
  const chunks = [];
  recorder.addEventListener('dataavailable', (e) => { if (e.data.size) chunks.push(e.data); });
  recorder.start();
  return {
    get mimeType() { return recorder.mimeType; },
    stop: () => new Promise((resolve) => {
      recorder.addEventListener('stop', () => { node.disconnect(tap); resolve(new Blob(chunks, { type: recorder.mimeType })); });
      recorder.stop();
    }),
  };
}
if (typeof module === 'object' && module.exports) module.exports = recordNode;
```

**How to run it.** `http://127.0.0.1:8765/j4-export.html`. Press "Render to WAV and download" for the demo, or first choose a timeline file made by 08-recipes-python.md or J3. For a recording press "Play and record"; it stops by itself at the end of the clip.

**What you should hear.** A: nothing while rendering; the status line then reports duration, render time, peak level and size, and the browser downloads `jukebox-demo.wav`, which plays the same 24 seconds as J1's demo plus a 1.5 second tail. If the reported peak is above 0 dBFS the file is clipped: lower the voice volumes in `createEngine` and render again. B: the demo plays once while it records, then a `.webm`, `.ogg` or `.m4a` file downloads.

**How to adapt it.**

- Batch-render a playlist: loop over your timeline URLs, `fetch` each, call `JukeboxEngine.renderOffline`, save each WAV.
- Mono or another sample rate: pass a different `sampleRate` to `renderOffline`; for mono, pass one channel to `encodeWav`.
- Stems for a listening test (one layer per file): call `renderOffline` with toggles such as `{ pad: false, lead: true, ref: true, drum: false }`.
- Compressed files for the web: convert the WAV outside the browser, or use recording B.

**Accessibility notes.** Two labelled buttons and a labelled file input; progress and results are announced through the status line, including numbers a blind user cannot read off a waveform (duration, peak level, size). The offline render makes no sound, which is said in the heading so nobody waits for audio.

STATUS: syntax-checked with node --check and pure functions unit-tested in Node 24 on 2026-11-14; not yet run in a browser

## J5. Jukebox shell: `j5-jukebox.html`

**Goal.** The page people actually use: pick an EIC visualization from a list, read or hear how its sound works, press Play.

**What it demonstrates.**

- A track list made of native buttons; the chosen one carries `aria-current="true"` and is visibly marked.
- A "How to listen" panel that is filled as soon as a track is chosen, before any playback: the visualization described in words, the credit, and the mapping legend generated by `describeMapping` from that track's timeline (with the real minimum and maximum in data units).
- A **sound legend**: one button that plays the five building-block sounds in the order the list on the page describes them, through the same engine as the music.
- An `aria-live` "now playing" region: selection, play, pause and errors are announced with the track title.
- Reuse of J1: the player, the controls and the picture loop are `JukeboxEngine.createTransport`, the same code J1 uses. A track is `{ title, description, credit, spec, timeline }`.
- Resilience: a missing timeline file gives a spoken error naming the file; a video that cannot be loaded falls back to the coarse grid picture with the sound unchanged; choosing tracks quickly cannot leave a half-loaded one active.

The built-in list has a synthetic demo track and three official-resource visualizations. Their titles and descriptions follow the SVS pages; the video URLs were answering `200` in the local crawl (8.3 MB, 6.3 MB and 25.7 MB). **The three EIC tracks need timeline files that do not exist yet:** `timelines/3912.json`, `timelines/4950.json`, `timelines/5196.json`. Until then, choosing them announces which file is missing, and the demo track works.

**File `j5-jukebox.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Earth Information Jukebox - shell (recipe J5)</title>
<style>
  body { font: 1rem/1.5 system-ui, sans-serif; max-width: 52rem; margin: 1rem auto; padding: 0 1rem; color: #111; background: #fff; }
  video, canvas { display: block; width: 100%; max-width: 640px; height: auto; background: #000; }
  [hidden] { display: none !important; }
  button, select, input { font: inherit; }
  button { padding: 0.5rem 0.9rem; }
  :focus-visible { outline: 3px solid #1a5fb4; outline-offset: 3px; }
  .row { display: flex; flex-wrap: wrap; gap: 0.5rem 1.2rem; align-items: center; margin: 0.7rem 0; }
  #tracks { list-style: none; padding: 0; }
  #tracks button { width: 100%; text-align: left; margin: 0.2rem 0; }
  #tracks button[aria-current="true"] { font-weight: bold; border: 3px solid #1a5fb4; }
</style>
</head>
<body>
<h1>Earth Information Jukebox</h1>
<p>Pick a visualization, read or listen to how its sound works, then press Play. Everything works from the keyboard:
Tab moves between controls, Space or Enter presses a button.</p>
<p id="now" role="status" aria-live="polite">Loading...</p>

<section aria-labelledby="h-tracks">
  <h2 id="h-tracks">Tracks</h2>
  <ul id="tracks"></ul>
</section>

<section aria-labelledby="h-listen">
  <h2 id="h-listen">How to listen</h2>
  <p id="desc"></p>
  <p id="credit"></p>
  <ul id="legend"></ul>
  <p>The sound legend plays five sounds, 1.2 seconds apart, in this order:</p>
  <ol>
    <li>A low lead note: the lowest level in this clip.</li>
    <li>A high lead note: the highest level in this clip.</li>
    <li>The reference blip: the middle of the range.</li>
    <li>A drum on the left: an event in the west.</li>
    <li>A drum on the right: an event in the east.</li>
  </ol>
  <button id="soundlegend" type="button">Play the sound legend</button>
</section>

<section aria-labelledby="h-player">
  <h2 id="h-player">Player</h2>
  <video id="video" playsinline muted hidden></video>
  <canvas id="canvas" width="640" height="320" role="img" hidden></canvas>
  <div class="row">
    <button id="play" type="button">Play</button>
    <label for="seek">Position</label>
    <input id="seek" type="range" min="0" max="1" step="0.1" value="0">
  </div>
  <div class="row">
    <label>Speed
      <select id="rate">
        <option value="0.5">0.5x</option>
        <option value="1" selected>1x</option>
        <option value="2">2x</option>
      </select>
    </label>
    <label><input id="loop" type="checkbox"> Loop</label>
    <label>Volume <input id="vol" type="range" min="0" max="100" value="70"></label>
    <label>Audio offset (ms) <input id="offset" type="number" min="-300" max="300" step="10" value="0"></label>
  </div>
  <fieldset>
    <legend>Layers</legend>
    <label><input type="checkbox" data-layer="pad" checked> Pad (slow trend)</label>
    <label><input type="checkbox" data-layer="lead" checked> Lead notes (level)</label>
    <label><input type="checkbox" data-layer="ref" checked> Reference blip</label>
    <label><input type="checkbox" data-layer="drum" checked> Drums (events)</label>
  </fieldset>
</section>

<script src="https://cdn.jsdelivr.net/npm/tone@15.1.22/build/Tone.js"
        integrity="sha384-NWoslxaf/3dYwQk+uGziDYJFdsjBpVlU1WpFRexuDFcIk/5PJpCbpVXia2Uikeix" crossorigin="anonymous"></script>
<script src="sonify-core.js"></script>
<script src="jukebox-engine.js"></script>
<script>
(function () {
  'use strict';
  const core = SonifyCore, $ = (id) => document.getElementById(id), map = core.DEFAULT_MAPPING;
  let title = '', selecting = 0, legendUntil = 0, currentTl = null;
  const announce = (msg) => { $('now').textContent = msg; };
  if (typeof Tone === 'undefined') { announce('Tone.js did not load. Check the network, or serve a local copy of Tone.js.'); return; }

  // The track list.
  //   spec.video : any URL the browser can play. SVS files are shown straight from svs.gsfc.nasa.gov and never read.
  //   timeline   : a JSON file on THIS site, made by 08-recipes-python.md or by recipe J3. null = built-in demo data.
  const TRACKS = [
    { title: 'Demo: a drifting bright patch (synthetic data, not NASA data)',
      description: 'A bright patch moves from the left edge to the right edge while the whole picture slowly gets brighter. A white flash appears every 1.5 seconds. Use it to learn the sounds.',
      credit: 'Generated by this page.', spec: {}, timeline: null },
    { title: 'Global Sea Surface Currents and Temperature (SVS 3912)',
      description: 'A global map of ocean surface currents drawn as flowing lines. The lines are coloured by sea surface temperature. The picture comes from the ECCO2 ocean model.',
      credit: 'Visualization: NASA Scientific Visualization Studio, https://svs.gsfc.nasa.gov/3912/',
      spec: { video: 'https://svs.gsfc.nasa.gov/vis/a000000/a003900/a003912/flat_global_ecco2_6840x3420_768p30-b1.webm' }, timeline: 'timelines/3912.json' },
    { title: 'GEDI Forest Height (SVS 4950)',
      description: 'A global view of forest height measured by the GEDI instrument on the International Space Station. Brown and dark green mean shorter vegetation, bright green and white mean taller vegetation.',
      credit: 'Visualization: NASA Scientific Visualization Studio, https://svs.gsfc.nasa.gov/4950/',
      spec: { video: 'https://svs.gsfc.nasa.gov/vis/a000000/a004900/a004950/GEDI_global_w_colorbar_1080p60.webm' }, timeline: 'timelines/4950.json' },
    { title: 'DYAMOND Global Carbon Dioxide (SVS 5196)',
      description: 'Carbon dioxide in the atmosphere around the globe, in parts per million, for January to March 2020.',
      credit: 'Visualization: NASA Scientific Visualization Studio, https://svs.gsfc.nasa.gov/5196/',
      spec: { video: 'https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005196/dyamondPointCloud_12-4-2023b_dyamond_co2_anim_globe_tilt_1080p30.mp4' }, timeline: 'timelines/5196.json' },
  ];

  const transport = JukeboxEngine.createTransport(Tone, core, map, (msg) => announce(title + ': ' + msg));
  const video = $('video'), canvas = $('canvas');
  // If a video cannot be loaded or decoded, keep the sound: show a coarse picture drawn from the timeline grid instead.
  video.addEventListener('error', () => {
    if (!video.getAttribute('src') || !currentTl) return;
    transport.load(JukeboxEngine.openVisual(core, video, canvas, {}, currentTl), currentTl, map);
    announce(title + ': the video could not be loaded or decoded, so a coarse picture drawn from the timeline is shown instead. The sound is unchanged.');
  });

  async function selectTrack(i) {
    const tr = TRACKS[i], mine = ++selecting;
    let tl;
    try {
      if (tr.timeline) {
        const res = await fetch(tr.timeline);
        if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + tr.timeline);
        tl = await res.json();
      } else tl = core.makeDemoTimeline();
      const problems = core.validateTimeline(tl);
      if (problems.length) throw new Error('the timeline does not match the contract: ' + problems.join('; '));
    } catch (err) {
      if (mine === selecting) announce('Cannot open "' + tr.title + '": ' + err.message + '. This track needs the file ' + tr.timeline + ' next to this page.');
      return;
    }
    if (mine !== selecting) return;                          // a newer choice won while this one was loading
    const stats = core.timelineStats(tl);
    title = tr.title; currentTl = tl;
    transport.load(JukeboxEngine.openVisual(core, video, canvas, tr.spec, tl), tl, map);
    for (const el of [video, canvas]) el.setAttribute('aria-label', tr.title + '. ' + tr.description);
    $('desc').textContent = tr.description;
    $('credit').textContent = tr.credit;
    $('legend').replaceChildren(...core.describeMapping(tl, map, stats).map((line) => Object.assign(document.createElement('li'), { textContent: line })));
    [...$('tracks').querySelectorAll('button')].forEach((b, k) => { if (k === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    announce('Selected: ' + tr.title + '. ' + Math.round(stats.duration) + ' seconds. Read How to listen, then press Play.');
  }

  TRACKS.forEach((tr, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = tr.title;
    b.addEventListener('click', () => selectTrack(i));
    $('tracks').appendChild(document.createElement('li')).appendChild(b);
  });

  // The legend as sound: the same five sounds the list above describes, through the same engine as the music.
  $('soundlegend').addEventListener('click', async () => {
    try {
      const engine = await transport.ensureAudio(), now = Tone.immediate();
      if (now < legendUntil) return;                         // already playing
      legendUntil = now + 6.5;
      const notes = core.leadNotes(map), mid = notes[core.valueToIndex(map.refValue, notes.length)];
      [
        { kind: 'lead', midi: notes[0], vel: 0.8, pan: 0, dur: 0.4 },
        { kind: 'lead', midi: notes[notes.length - 1], vel: 0.8, pan: 0, dur: 0.4 },
        { kind: 'ref', midi: mid },
        { kind: 'drum', midi: map.drumLowMidi + 6, vel: 0.8, pan: -0.8 },
        { kind: 'drum', midi: map.drumLowMidi + 6, vel: 0.8, pan: 0.8 },
      ].forEach((ev, k) => engine.play(ev, now + 0.1 + 1.2 * k));
    } catch (err) { announce('The sound legend could not play: ' + err.message); }
  });

  selectTrack(0);
})();
</script>
</body>
</html>
```

**How to run it.** `http://127.0.0.1:8765/j5-jukebox.html`. The demo track is selected at load. Press "Play the sound legend", then Play. To make an EIC track work, produce its timeline (08-recipes-python.md, or J3 on a same-origin copy of the clip) and save it under the name in the track entry.

**What you should hear.** Sound legend: a low pluck (C4), a high pluck (C6), a pure blip (C5), a drum on the left, a drum on the right, 1.2 seconds apart. Then the same music as J1 for the chosen track. Choosing another track pauses the current one.

**How to adapt it.**

- Add a track: append an object to `TRACKS`. For an image sequence use `spec: { frames: { pattern: 'media/5313/f_{0000}.jpg', count: 120, fps: 6, first: 1 } }`.
- Per-track mapping: give tracks a `map` (a copy of `DEFAULT_MAPPING` with changes, for example a minor scale for a wildfire track) and pass it to `transport.load` and `describeMapping` instead of `map`.
- Write real descriptions. The `description` is what a blind listener gets instead of the picture: say what is shown, the colours and what they mean, the time span, and what to listen for. See 07-accessibility-and-listening-tests.md.
- Move the list to a `tracks.json` file if non-programmers will edit it.

**Accessibility notes.**

- Structure: one `h1`, three labelled sections in reading order (tracks, how to listen, player). A screen-reader user can jump by heading.
- Everything is reachable with Tab and operated with Space or Enter; there are no custom key bindings to learn and no single-key shortcuts that could clash with screen-reader keys.
- The live region exists in the initial HTML and receives short sentences: "Selected: ... 24 seconds. Read How to listen, then press Play.", "...: Playing.", "...: Paused at 12 seconds."
- The legend is available three ways: as text, as sound (the legend button) and by switching layers on and off while listening.
- The video is muted and has no native controls, so there is exactly one set of controls and one sound source. Its `aria-label` carries the title and the description.
- Not covered here: captions or transcripts for clips with narration, haptics ("tactile feedback" in the challenge text), user-selectable colour themes, and a spoken description that tracks the animation over time. See "Known limitations".

STATUS: syntax-checked with node --check and pure functions unit-tested in Node 24 on 2026-11-14; not yet run in a browser

## How the pieces fit

```text
SVS frames or video --(08-recipes-python.md, offline)-------> timelines/ID.json --+
video copy on your site --(J3 "Record a timeline")----------> timeline.json ------+--> J1 player / J5 jukebox --> listeners
                                                                                  +--> J4 offline render -----> WAV files
still frame on your site ------------------------------------------------------------> J2 probe ---------------> listeners

sonify-core.js (J0)     every mapping decision, tested in Node; used by all pages
jukebox-engine.js       Tone.js instruments, the sync loop, the offline renderer, picture sources, the controls
```

- **Data flow.** A timeline is the only thing that crosses from analysis to sound. Whoever makes it (Python or J3) and whoever plays it (J1, J4, J5) only have to agree on the contract, and `validateTimeline` enforces it at load time.
- **One score.** `scoreWindow(timeline, mapping, stats, from, to)` returns the notes for any slice of media time. The live player asks for 25 ms slices as the video plays; the offline renderer asks for the whole clip at once. A unit test proves the two give the same notes.
- **One engine.** `createEngine` builds the instruments in whatever audio context is current, so the same code makes sound live and inside `Tone.Offline`.
- **One clock.** The picture (video element or clip clock) is the master. Sound is recomputed from `currentTime` every 25 ms.

Suggested order of work for the first hour:

1. Copy the files into `web/`, run `node sonify-core.test.js` and `node jukebox-engine.test.js` (expect 17 and 5 passes).
2. `node serve.js . 8765`, open `j1-player.html`, press Play. Fix anything the browser console reports; this is the first real run.
3. Open `j4-export.html`, render the demo WAV, listen to it. If it is silent or clipped, the status line says so (peak level).
4. Make one real timeline (08-recipes-python.md) and play it in J1 with the SVS video URL.
5. Add tracks to J5, write the descriptions, deploy the folder to GitHub Pages, test on a phone.
6. Render the WAV files for the playlist and the listening test with J4.

Who can do what in parallel: one person on timelines (08), one on the J5 page and track descriptions, one on the sound design (`DEFAULT_MAPPING`, `createEngine`) and exports, one on J2 with real frames and on browser and phone testing; the business member writes the descriptions and legend wording, runs the listening test with J4's WAV files, and keeps the references and AI-use log.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| No sound until the first click | Intended. Browsers create an `AudioContext` suspended until a user gesture; Chrome's autoplay article says to call `resume()` after the gesture. | Start audio only in a click or key handler. The recipes call `Tone.start()` (which resumes the context) inside the Play handler. Do not try to start sound on page load. |
| Console says the AudioContext was not allowed to start | Audio nodes were created or started before a gesture. | Harmless if `Tone.start()` runs later in a gesture; the recipes build the engine only after it. |
| `video.play()` is rejected or nothing moves ("autoplay blocked") | `play()` was called outside a user gesture on a video with sound. Muted autoplay is always allowed in Chrome; playback with sound needs prior interaction. | Call `play()` inside the click handler (the recipes do, before any `await`). Keep the video `muted` (the recipes do). |
| `SecurityError` from `getImageData` / "tainted canvas" | Cross-origin image or video drawn without CORS permission. SVS sends `Access-Control-Allow-Origin` for one other site only. | Serve a copy from your own site (J2, J3), or use a precomputed timeline (J1, J5; J3 falls back with `&timeline=`). Create a new canvas after a tainted one. |
| The video does not load at all after adding `crossorigin` | The browser now requires CORS permission that SVS does not give (unverified, see the CORS table). | Remove the `crossorigin` attribute for SVS URLs; use it only for servers that allow your origin. |
| iPhone: page works, no sound | Ring/silent switch on silent. A WebKit engineer states that the default audio session type is ambient, which is muted with the phone, and that since iOS 17 a page can set the type to "playback". | The recipes set `navigator.audioSession.type = 'playback'` when that API exists. On older iOS, flip the switch or use headphones. Test on a real phone. |
| Clicks and pops | A parameter jumped (setting `.value` directly), an envelope with zero attack or release, the same voice restarted mid-note, or the output clipping. | Use `setTargetAtTime` with a time constant of 0.01 s or more (the recipes do), keep attack at 5 ms or more and release at 50 ms or more, lower voice volumes, and check J4's peak read-out. |
| Sound runs late or early against the picture by a constant amount | Output latency of the device (Bluetooth can be a noticeable fraction of a second). | Set "Audio offset (ms)" in J1 or J5; positive values make sound earlier. |
| Sound drifts slowly against the picture | Should not happen: each tick re-reads `video.currentTime`. If you built your own loop on `Tone.Transport` or `setInterval` counting, that is the cause. | Derive audio time from the media clock on every tick, as `createPlayer` does. |
| Notes missing or bunched while the tab is in the background | Browsers slow timers of hidden tabs (exact rates unverified). The player then skips what it could not schedule in time. | Keep the tab visible while presenting or recording. Use the offline render for files. |
| Video cannot be seeked, or restarts from 0, on the local server (Chrome) | `python -m http.server` ignores Range requests (measured: `200`, whole file). | Use `node serve.js . 8765`, or test on GitHub Pages. |
| Video is black or the page says it could not load or decode it | A codec the browser cannot play. Example from the crawl: the only small movie of SVS 5313 is `..._2160p30_h265.mp4` (H.265; support varies by browser and hardware, unverified here). | Choose a WebM or H.264 file from the SVS page, or play an image sequence (`frames=`). J1 and J5 fall back to a coarse picture and keep the sound. |
| Image sequence shows nothing | Frame files are TIFF or EXR (many SVS frame sets are; most browsers cannot show them, unverified here), or the pattern or `first` number is wrong. | Convert frames to JPEG, PNG or WebP in Python first. Check one frame URL by hand. |
| "Could not load the timeline: ... Unexpected token N" | `NaN` in the JSON written by Python. | Fill missing values and use `json.dumps(obj, allow_nan=False)`. |
| "does not match the contract: ..." | The message lists up to eight problems (wrong grid length, t not increasing, values outside 0..1, wrong `n_frames`). | Fix the generator; the browser never guesses. |
| `Tone is not defined` / "Tone.js did not load" | No network, CDN blocked, or the `integrity` hash does not match because the version in the URL was changed. | Serve Tone.js from your own folder; if you change the version, recompute or remove `integrity`. |
| Error "Start time must be strictly greater than previous start time" | A Tone.js assertion: one monophonic voice was started twice at the same time. | Keep the `after()` guard in `createEngine`, or add more voices (the drums use three). |
| Everything sounds centred | Mono output (phone speaker, one earbud, a mono Bluetooth speaker). | Use stereo headphones for the demo; do not rely on pan alone to carry information. |
| `fetch` fails with the page opened by double-click | `file://` pages cannot fetch local files and cannot read image pixels. | Always use `http://127.0.0.1:8765/...`. |
| "This browser has no MediaRecorder" in J4 | Recording API missing. | Use the offline WAV render (A). |

## Known limitations

- **Not yet used by a person in a browser.** One scripted, muted smoke test ran (see "Browser smoke test"); nobody has listened or watched. The remaining risks are the picture loop, pointer input, `requestVideoFrameCallback` on a `captureStream` source, fast retriggers, other browsers and iOS. Budget an hour to run every page and fix what the console reports.
- **Not tested with a screen reader.** The pages follow MDN's guidance for live regions and the application role, but NVDA, JAWS, VoiceOver and TalkBack differ. Test with at least one, and with a blind or low-vision listener if you can (07-accessibility-and-listening-tests.md).
- **The lead follows one number (`mean`).** The grid is used only for pan and for the fallback picture. Visualizations with several layers (for example aerosol types in SVS 5669) need one timeline per layer, each with its own player and instrument, or an extension of the contract agreed with 08-recipes-python.md.
- **Auto range trades comparability for musicality.** With `leadRange: 'auto'` the same pitch means different values in different clips. The legend text states the real numbers; say so when you present.
- **Limiter is not a brick wall** (compressor with ratio 20 and a soft knee). Peaks can pass. Keep levels moderate and read the peak value in J4.
- **Scheduling tolerances.** Up to 0.12 s of already scheduled notes still sound after Pause. After a resume, seek or loop, events from the last 0.06 s before the playhead may play again. Events that fall in a gap the timer could not cover are skipped, not delayed.
- **At most three events per frame** become drum hits (the strongest three); dense lightning needs a different treatment (for example event count per frame mapped to a rattle rate).
- **J3:** the value range is learned while playing and never shrinks; brightness is a fast approximation (Rec. 709 weights on stored values, not true luminance); "warmth" is only red minus blue. The colour of a visualization is not its data: use colour-map inversion (J2) or a Python-made timeline when the value matters.
- **Colour-map inversion** picks the nearest of 64 legend colours. JPEG and video compression shift colours, and legends that repeat a colour (cyclic maps) cannot be inverted this way.
- **Image sequences** keep every loaded frame in memory. Stay below a few hundred frames of modest size.
- **Recording format** depends on the browser's `MediaRecorder`; only the offline render gives WAV.
- **Hot-linked SVS video** depends on that server and on the venue network. Credit and reuse terms for SVS media are covered in 01-where-the-sounds-come-from.md, not checked here.
- **Not built:** haptics, captions for narrated clips, a time-synchronised spoken description, user-selectable themes, saving settings.

## Open questions / unverified

- Every statement about how the pages sound or look. Syntax and Node-testable logic were checked, and one muted scripted run in a single Chromium-based browser; no human listening, no other browser, no phone.
- `crossorigin="anonymous"` on an SVS URL making the media fail to load: reasoned from how CORS works, not tested.
- DOM APIs used from long-standing knowledge and not re-read on MDN today: `HTMLMediaElement` members (`currentTime`, `paused`, `ended`, `playbackRate`, `loop`, `readyState`, `duration`, `muted`, `srcObject`, `play()`, `pause()`, `load()`, the `error` event), the `playsinline` attribute, Pointer Events, `getContext('2d', { willReadFrequently: true })`, `createImageData`, `putImageData`, `drawImage` (including its nine-argument form), `URLSearchParams`, `fetch`, `Blob.text()`, `Element.replaceChildren`, `requestAnimationFrame`, `AudioContext.createMediaStreamDestination` (seen in Tone's Recorder source, MDN page not opened).
- `triggerAttackRelease` is documented on the Tone.js Synth page, but its implementation file (`instrument/Instrument.js`) was not read.
- Whether `requestVideoFrameCallback` fires for a video fed by `canvas.captureStream()` in every browser (the J3 demo source).
- What `Tone.Recorder` produces in Safari; the Tone.js docs only describe Chrome and say native support is Chrome and Firefox, while MDN lists `MediaRecorder` as available across browsers since April 2021.
- The effect of `navigator.audioSession.type = 'playback'` on a real iPhone (taken from a WebKit bug comment and MDN; MDN marks the API experimental).
- That Chrome needs Range support to seek: taken from a 2023 blog post, not from Chrome documentation. Measured here: Python's server does not send `206`; `serve.js`, GitHub Pages and SVS do.
- H.265 playback support by browser, and that most browsers cannot display TIFF or EXR frames: general knowledge, not checked today. Whether the 5196 MP4 in the J5 list is H.264 was not checked.
- Timer throttling rates in background tabs.
- That the underlying `DynamicsCompressorNode` adds automatic make-up gain: seen only in a search result summary of WebKit source.
- "Euclidean rhythm" naming and the claim that `euclid(3, 8)` is the Cuban tresillo come from Toussaint's paper, whose PDF URL was found by search but not opened. The function's output itself is tested.
- GitHub's per-file size limit for pushes (commonly quoted as 100 MB) was not looked up; the Pages limits (1 GB site, 100 GB per month soft bandwidth limit, 10-minute deployment timeout) were.
- Descriptions in the J5 track list paraphrase the SVS page text from the local crawl; "global map" for the 3912 clip is inferred from its file name (`flat_global_...`).

## Sources

- npm registry, package `tone` - https://registry.npmjs.org/tone - dist-tags (`latest` 15.1.22, `next` 15.5.72), publish dates, MIT licence, repository URL.
- Tone.js 15.1.22 UMD build on jsDelivr - https://cdn.jsdelivr.net/npm/tone@15.1.22/build/Tone.js - the pinned file: 200 OK, 345,500 bytes, CORS `*`, source of the SRI hash.
- Same file on unpkg - https://unpkg.com/tone@15.1.22/build/Tone.js - identical bytes.
- Same file on cdnjs - https://cdnjs.cloudflare.com/ajax/libs/tone/15.1.22/Tone.js - identical bytes.
- cdnjs API for tone - https://api.cdnjs.com/libraries/tone?fields=name,version,versions,license,latest,sri - cdnjs lists 15.5.72 as the current version.
- jsDelivr package file list - https://data.jsdelivr.com/v1/packages/npm/tone@15.1.22?structure=flat - SHA-256 of `build/Tone.js`, list of source files.
- Tone.js 15.1.22 source files on jsDelivr - https://cdn.jsdelivr.net/npm/tone@15.1.22/build/esm/ - files read: `version.js`, `index.js`, `core/Global.js`, `core/context/Context.js`, `Param.js`, `Offline.js`, `OfflineContext.js`, `ToneAudioBuffer.js`, `ToneAudioNode.js`, `Destination.js`, `Gain.js`, `instrument/Monophonic.js`, `Synth.js`, `MembraneSynth.js`, `NoiseSynth.js`, `component/dynamics/Limiter.js`, `Compressor.js`, `component/channel/Panner.js`, `Recorder.js`, `component/filter/Filter.js`, `source/Source.js`, `source/oscillator/Oscillator.js` - signatures, defaults and assertions quoted in the verification table.
- Tone.js licence file - https://cdn.jsdelivr.net/npm/tone@15.1.22/LICENSE.md - MIT, copyright Yotam Mann.
- Tone.js repository - https://github.com/Tonejs/Tone.js - homepage named in the npm metadata; URL for the references list.
- Tone.js docs, `start` - https://tonejs.github.io/docs/15.1.22/functions/start.html - must be called from a click or key handler; returns a Promise.
- Tone.js docs, `Synth` - https://tonejs.github.io/docs/15.1.22/classes/Synth.html - `triggerAttackRelease`, `triggerAttack`, `triggerRelease`, `setNote`, `portamento`, `volume`.
- Tone.js docs, `Recorder` - https://tonejs.github.io/docs/15.1.22/classes/Recorder.html - wrapper around MediaRecorder; `start`, `stop`, `supported`, `mimeType`; WebM in Chrome.
- Tone.js docs, `Offline` - https://tonejs.github.io/docs/15.1.22/functions/Offline.html - signature and examples of offline rendering.
- A github.io page used for a Range test - https://tonejs.github.io/docs/15.1.22/index.html - GitHub Pages answers `Range` with `206` and `Content-Range`.
- MDN, `HTMLVideoElement.requestVideoFrameCallback()` - https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback - callback arguments, `mediaTime`, Baseline 2024, feature test.
- MDN, "Use cross-origin images in a canvas" - https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image - tainted canvas, which calls throw, `crossorigin` attribute.
- MDN, `CanvasRenderingContext2D.getImageData()` - https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData - `SecurityError`, parameters.
- MDN, `HTMLCanvasElement.captureStream()` - https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream - returns a MediaStream; throws on a tainted canvas; Baseline since January 2020.
- MDN, "Autoplay guide for media and Web Audio APIs" - https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay - when autoplay is allowed; Web Audio is subject to the same rules.
- Chrome for Developers, "Autoplay policy in Chrome" - https://developer.chrome.com/blog/autoplay/ - suspended AudioContext, `resume()` after a gesture, muted autoplay always allowed.
- MDN, `AudioParam.setTargetAtTime()` - https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime - 63.2 % per time constant, 95 % after three, starts immediately if the time is in the past.
- web.dev, "Scheduling web audio with precision" (Chris Wilson) - https://web.dev/articles/audio-scheduling - why timers alone are too imprecise; 25 ms timer with about 100 ms look-ahead.
- MDN, `HTMLMediaElement: timeupdate event` - https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/timeupdate_event - fires only about 4 to 66 times a second, which is why the player polls instead.
- MDN, "ARIA live regions" - https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions - polite regions, put the empty region in the initial markup, `role="status"` plus `aria-live="polite"`.
- MDN, "ARIA: application role" - https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/application_role - what the role does and the duties it puts on the page.
- MDN, `AudioSession.type` - https://developer.mozilla.org/docs/Web/API/AudioSession/type - values, example `navigator.audioSession.type = "playback"`, experimental status.
- WebKit bug 237322, "webaudio api is muted when the iOS ringer is muted" - https://bugs.webkit.org/show_bug.cgi?id=237322 - comment of 2024-09-25: playback type since iOS 17, default ambient.
- MDN, `MediaRecorder` - https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder - `start`, `stop`, `dataavailable`, `isTypeSupported`, Baseline since April 2021.
- MDN, "blob: URLs" - https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/blob - `URL.createObjectURL` and `revokeObjectURL` used for downloads.
- GitHub Docs, "GitHub Pages limits" - https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits - 1 GB site, 100 GB per month soft bandwidth limit, 10-minute deployment timeout.
- Cendyne, "Fixing html video playback on chrome" (2023-01-23) - https://cendyne.dev/posts/2023-01-23-fixing-html-video-playback-on-chrome.html - Chrome requests byte ranges and needs `206` with `Content-Range` to seek.
- McGill MMSP, "Audio File Format Specifications: WAVE" - https://www.mmsp.ece.mcgill.ca/Documents/AudioFormats/WAVE/WAVE.html - chunk layout, field order and sizes, little-endian, 16-bit signed samples, interleaving.
- W3C WAI, technique G17 - https://www.w3.org/WAI/WCAG22/Techniques/general/G17 - the luminance weights 0.2126, 0.7152, 0.0722 used (in simplified form) by `luma`.
- Godfried Toussaint, "The Euclidean Algorithm Generates Traditional Musical Rhythms" - https://cgm.cs.mcgill.ca/~godfried/publications/banff.pdf - origin of Euclidean rhythms; found by search, PDF not opened.
- NASA SVS API, visualization 3912 - https://svs.gsfc.nasa.gov/api/3912 - response header `access-control-allow-origin: https://tempo.multiverse.music` (measured 2026-11-14 19:02 GMT).
- NASA SVS, 3912 WebM - https://svs.gsfc.nasa.gov/vis/a000000/a003900/a003912/flat_global_ecco2_6840x3420_768p30-b1.webm - `206` on a Range request, 8,341,997 bytes, same fixed CORS header.
- NASA SVS, 3912 colour bar - https://svs.gsfc.nasa.gov/vis/a000000/a003900/a003912/sst_ecco2_cbar.png - an example legend image; same fixed CORS header.
- NASA SVS pages used for the J5 track list - https://svs.gsfc.nasa.gov/3912/ , https://svs.gsfc.nasa.gov/4950/ , https://svs.gsfc.nasa.gov/5196/ - titles and descriptions (read from the local crawl of the SVS API).
- NASA SVS media listed in the J5 track list - https://svs.gsfc.nasa.gov/vis/a000000/a004900/a004950/GEDI_global_w_colorbar_1080p60.webm , https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005196/dyamondPointCloud_12-4-2023b_dyamond_co2_anim_globe_tilt_1080p30.mp4 - status 200 and sizes 6.3 MB and 25.7 MB in the local crawl (`downloads.json`).
- Local evidence crawl - spaceapps-eic-evidence (local crawl, not in this repo) (`pages.json`, `downloads.json`, `framesets.json`) - file names, sizes and descriptions of EIC media.
- Official challenge text - spaceapps-2026\sources\jukebox.txt - requirements quoted (frames to sound, accessibility, "color spectrums to musical chords", "tactile feedback").
