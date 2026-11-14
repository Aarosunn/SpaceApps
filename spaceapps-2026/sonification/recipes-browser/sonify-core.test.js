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
