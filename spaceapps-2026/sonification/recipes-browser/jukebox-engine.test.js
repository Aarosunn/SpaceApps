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
