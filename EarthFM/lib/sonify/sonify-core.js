/* Copied unchanged from spaceapps-2026/sonification/recipes-browser/sonify-core.js (commit d39983b). Edit the original and re-copy. */
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
